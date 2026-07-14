/**
 * Usage Service
 * Handles token calculation, credit deduction, and statistics
 */
import { supabaseServer as supabase } from "~/utils/supabase.server";
import type { TokenUsage } from "~/types/gateway";

// Rough pricing per 1M tokens (USD) — extend as needed
const TOKEN_PRICING: Record<string, { input: number; output: number }> = {
 'gpt-4o': { input: 2.50, output: 10.00 },
 'gpt-4o-mini': { input: 0.15, output: 0.60 },
 'gpt-4-turbo': { input: 10.00, output: 30.00 },
 'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
 'claude-opus-4-8': { input: 15.00, output: 75.00 },
 'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
 'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
 'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
 'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
 'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
 'gemini-2.0-flash': { input: 0.10, output: 0.40 },
 'gemini-1.5-pro': { input: 1.25, output: 5.00 },
 'llama-3.1-70b': { input: 0.59, output: 0.79 },
};

function getModelPricing(model: string): { input: number; output: number } {
 // Direct match
 if (TOKEN_PRICING[model]) return TOKEN_PRICING[model];

 // Partial match — extract base model name
 const lower = model.toLowerCase();
 for (const [key, price] of Object.entries(TOKEN_PRICING)) {
 if (lower.includes(key.toLowerCase())) return price;
 }

 // Default fallback pricing
 return { input: 1.00, output: 3.00 };
}

export function calculateCredits(model: string, usage: TokenUsage): number {
 const pricing = getModelPricing(model);
 const inputCost = (usage.promptTokens / 1_000_000) * pricing.input;
 const outputCost = (usage.completionTokens / 1_000_000) * pricing.output;
 return parseFloat((inputCost + outputCost).toFixed(6));
}

export function estimateTokens(messages: any[], model: string): number {
 // Rough estimation: ~4 chars per token for English text
 let totalChars = 0;
 for (const msg of messages) {
 const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
 totalChars += content.length;
 }
 // Model-specific adjustments
 const multiplier = model.toLowerCase().includes('claude') ? 0.9 : model.toLowerCase().includes('gpt') ? 0.95 : 1.0;
 return Math.ceil(totalChars / 4 * multiplier);
}

// ---------------------------------------------------------------------------
// Usage Statistics
// ---------------------------------------------------------------------------
export async function recordUsage(
 masterKeyId: string | null,
 provider: string,
 tokens: number,
 credits: number,
 responseTimeMs: number,
 failoverCount = 0
): Promise<void> {
 const today = new Date().toISOString().split('T')[0];

 try {
 const { data: existing } = await supabase
 .from('usage_statistics')
 .select('*')
 .eq('date', today)
 .eq('master_api_key_id', masterKeyId)
 .maybeSingle();

 if (existing) {
 await (supabase
 .from('usage_statistics') as any)
 .update({
 total_requests: (existing as any).total_requests + 1,
 total_tokens: (existing as any).total_tokens + tokens,
 total_credits: (existing as any).total_credits + credits,
 failover_count: (existing as any).failover_count + failoverCount,
 })
 .eq('id', (existing as any).id);
 } else {
 await supabase.from('usage_statistics').insert({
 date: today,
 master_api_key_id: masterKeyId,
 provider,
 total_requests: 1,
 total_tokens: tokens,
 total_credits: credits,
 failover_count: failoverCount,
 });
 }
 } catch (err) {
 console.error('[usage] Failed to record usage:', err);
 }
}

export async function getUsageStats(days = 30): Promise<any[]> {
 const startDate = new Date();
 startDate.setDate(startDate.getDate() - days);

 const { data, error } = await supabase
 .from('usage_statistics')
 .select('*')
 .gte('date', startDate.toISOString().split('T')[0])
 .order('date', { ascending: true });

 if (error) return [];
 return data ?? [];
}

export async function getDashboardStats(): Promise<{
 totalMasterKeys: number;
 activeMasterKeys: number;
 failedMasterKeys: number;
 totalUserKeys: number;
 totalRequestsToday: number;
 successRate: number;
 totalCreditsRemaining: number;
 avgResponseTime: number;
 failoverCountToday: number;
 providers: any[];
}> {
 const today = new Date().toISOString().split('T')[0];

 const [
 masterKeysResult,
 userKeysResult,
 todayLogsResult,
 failoverResult,
 usageResult,
 ] = await Promise.all([
 supabase.from('master_api_keys').select('*', { count: 'exact', head: false }),
 supabase.from('user_api_keys').select('*', { count: 'exact', head: true }),
 supabase.from('api_request_logs').select('*', { count: 'exact', head: false }).gte('created_at', today),
 supabase.from('api_failover_logs').select('*', { count: 'exact', head: true }).gte('created_at', today),
 supabase.from('usage_statistics').select('*').gte('date', today),
 ]);

 const masterKeys = (masterKeysResult.data ?? []) as any[];
 const userKeysCount = userKeysResult.count ?? 0;
 const todayLogs = (todayLogsResult.data ?? []) as any[];
 const failoverCount = failoverResult.count ?? 0;

 const totalRequestsToday = todayLogs.length;
 const successCount = todayLogs.filter((l) => l.is_success).length;
 const successRate = totalRequestsToday > 0 ? Math.round((successCount / totalRequestsToday) * 100) : 100;
 const avgResponseTime = totalRequestsToday > 0
 ? Math.round(todayLogs.reduce((s, l) => s + l.response_time_ms, 0) / totalRequestsToday)
 : 0;

 const totalCreditsRemaining = masterKeys.reduce((s, k) => s + (k.remaining_credits ?? 0), 0);
 const activeMasterKeys = masterKeys.filter((k) => k.health_status === 'healthy' && k.status === 'active').length;
 const failedMasterKeys = masterKeys.filter((k) => k.health_status === 'unhealthy' || k.status === 'temporarily_failed').length;

 // Provider aggregation
 const providerMap = new Map<string, any>();
 for (const key of masterKeys) {
 const p = key.provider;
 if (!providerMap.has(p)) {
 providerMap.set(p, {
 provider: p,
 totalKeys: 0,
 activeKeys: 0,
 successRate: 0,
 remainingCredits: 0,
 requests: 0,
 });
 }
 const entry = providerMap.get(p)!;
 entry.totalKeys++;
 entry.remainingCredits += key.remaining_credits ?? 0;
 if (key.health_status === 'healthy' && key.status === 'active') entry.activeKeys++;
 }

 // Attach usage data to providers
 const todayUsage = (usageResult.data ?? []) as any[];
 for (const u of todayUsage) {
 const p = u.provider;
 if (providerMap.has(p)) {
 providerMap.get(p)!.requests += u.total_requests;
 }
 }

  // Compute per-provider success rates from today's logs
  const providerLogMap = new Map<string, { total: number; success: number }>();
  for (const log of todayLogs) {
  const p = log.provider;
  if (!providerLogMap.has(p)) providerLogMap.set(p, { total: 0, success: 0 });
  const entry = providerLogMap.get(p)!;
  entry.total++;
  if (log.is_success) entry.success++;
  }

  const providers = Array.from(providerMap.values()).map((p) => {
  const logStats = providerLogMap.get(p.provider);
  const providerSuccessRate = logStats && logStats.total > 0
   ? Math.round((logStats.success / logStats.total) * 100)
   : (p.activeKeys > 0 ? 100 : 0);
  return {
   ...p,
   successRate: providerSuccessRate,
   status: p.activeKeys > 0 ? ('online' as const) : ('offline' as const),
  };
  });

 return {
 totalMasterKeys: masterKeys.length,
 activeMasterKeys,
 failedMasterKeys,
 totalUserKeys: userKeysCount,
 totalRequestsToday,
 successRate,
 totalCreditsRemaining,
 avgResponseTime,
 failoverCountToday: failoverCount,
 providers,
 };
}

export async function getChartData(days = 30): Promise<{
 date: string;
 requests: number;
 tokens: number;
 credits: number;
 errors: number;
 failovers: number;
}[]> {
 const startDate = new Date();
 startDate.setDate(startDate.getDate() - days);

 const { data, error } = await supabase
 .from('usage_statistics')
 .select('*')
 .gte('date', startDate.toISOString().split('T')[0])
 .order('date', { ascending: true });

 if (error) return [];

 // Get error counts by date
 const { data: errorLogs } = await supabase
 .from('api_request_logs')
 .select('created_at, is_success')
 .gte('created_at', startDate.toISOString())
 .eq('is_success', false);

 // Get failover counts by date
 const { data: failoverLogs } = await supabase
 .from('api_failover_logs')
 .select('created_at')
 .gte('created_at', startDate.toISOString());

 const errorByDate = new Map<string, number>();
 for (const log of (errorLogs ?? [])) {
 const d = log.created_at.split('T')[0];
 errorByDate.set(d, (errorByDate.get(d) ?? 0) + 1);
 }

 const failoverByDate = new Map<string, number>();
 for (const log of (failoverLogs ?? [])) {
 const d = log.created_at.split('T')[0];
 failoverByDate.set(d, (failoverByDate.get(d) ?? 0) + 1);
 }

 return (data ?? []).map((u: any) => ({
 date: u.date,
 requests: u.total_requests,
 tokens: u.total_tokens,
 credits: u.total_credits,
 errors: errorByDate.get(u.date) ?? 0,
 failovers: failoverByDate.get(u.date) ?? 0,
 }));
}
