/**
 * Health Service
 * Handles health checks, auto-recovery, and status management for provider keys
 */
import { supabaseServer as supabase } from "~/utils/supabase.server";
import type { MasterApiKeyRow, ProviderHealthRow } from "~/types/gateway";
import { getMasterKeyById } from "~/utils/master-key-service";

export async function runHealthCheck(keyId: string): Promise<ProviderHealthRow> {
 const record = await getHealthRecord(keyId);

 const { data, error } = await (supabase
 .from('provider_health') as any)
 .upsert({
 master_api_key_id: keyId,
 total_checks: (record?.total_checks ?? 0) + 1,
 last_check: new Date().toISOString(),
 }, { onConflict: 'master_api_key_id' })
 .select()
 .single();

 if (error) throw new Error(`Health check failed: ${error.message}`);
 return data as ProviderHealthRow;
}

export async function recordHealthSuccess(keyId: string, responseTimeMs: number): Promise<void> {
 const record = await getHealthRecord(keyId);
 if (!record) return;

 const newConsecutive = (record.consecutive_successes ?? 0) + 1;
 const totalChecks = record.total_checks;
 const existingSuccesses = Math.round((record.success_rate / 100) * totalChecks);
 const newSuccessRate = totalChecks > 0 ? Math.round(((existingSuccesses + 1) / (totalChecks + 1)) * 100) : 100;

 await (supabase
 .from('provider_health') as any)
 .update({
 status: 'healthy',
 consecutive_successes: newConsecutive,
 consecutive_failures: 0,
 last_success: new Date().toISOString(),
 last_error: '',
 avg_response_time_ms: Math.round(((record.avg_response_time_ms ?? 0) * totalChecks + responseTimeMs) / (totalChecks + 1)),
 total_checks: totalChecks + 1,
 success_rate: newSuccessRate,
 retry_after: null,
 updated_at: new Date().toISOString(),
 })
 .eq('master_api_key_id', keyId);

 // Reset the master key's health if it was marked unhealthy
 const key = await getMasterKeyById(keyId);
 if (key && key.health_status !== 'healthy') {
 await supabase.from('master_api_keys').update({
 health_status: 'healthy',
 status: 'active',
 updated_at: new Date().toISOString(),
 }).eq('id', keyId);
 }
}

export async function recordHealthFailure(
 keyId: string,
 error: string,
 statusCode?: number
): Promise<void> {
 const record = await getHealthRecord(keyId);
 if (!record) return;

 const newConsecutive = (record.consecutive_failures ?? 0) + 1;
 const totalChecks = record.total_checks;
 const existingSuccesses = Math.round((record.success_rate / 100) * totalChecks);
 const newSuccessRate = totalChecks > 0 ? Math.round((existingSuccesses / (totalChecks + 1)) * 100) : 0;

 let healthStatus: ProviderHealthRow['status'] = 'unhealthy';
 if (statusCode === 429) healthStatus = 'rate_limited';
 else if (statusCode === 402 || error.toLowerCase().includes('quota')) healthStatus = 'quota_exhausted';

 await (supabase
 .from('provider_health') as any)
 .update({
 status: healthStatus,
 consecutive_failures: newConsecutive,
 consecutive_successes: 0,
 last_failure: new Date().toISOString(),
 last_error: error.slice(0, 500),
 total_checks: totalChecks + 1,
 success_rate: newSuccessRate,
 updated_at: new Date().toISOString(),
 })
 .eq('master_api_key_id', keyId);

 // Update master key record
 const { data: keyData } = await supabase.from('master_api_keys').select('failure_count').eq('id', keyId).maybeSingle();
 const currentCount = keyData?.failure_count ?? 0;

 await supabase.from('master_api_keys').update({
 health_status: healthStatus,
 last_failure: new Date().toISOString(),
 failure_count: currentCount + 1,
 updated_at: new Date().toISOString(),
 }).eq('id', keyId);
}

export async function getHealthRecord(keyId: string): Promise<ProviderHealthRow | null> {
 const { data, error } = await supabase
 .from('provider_health')
 .select('*')
 .eq('master_api_key_id', keyId)
 .maybeSingle();

 if (error || !data) return null;
 return data as ProviderHealthRow;
}

export async function getAllHealthRecords(): Promise<Array<ProviderHealthRow & { master_api_keys?: any }>> {
 const { data, error } = await supabase
 .from('provider_health')
 .select('*, master_api_keys(provider, name, priority, status)')
 .order('last_check', { ascending: false });

 if (error) return [];
 return (data ?? []) as any[];
}

export async function resetHealthStatus(keyId: string): Promise<void> {
 await supabase.from('provider_health').update({
 status: 'healthy',
 consecutive_failures: 0,
 consecutive_successes: 0,
 last_failure: null,
 last_error: '',
 retry_after: null,
 updated_at: new Date().toISOString(),
 }).eq('master_api_key_id', keyId);

 await supabase.from('master_api_keys').update({
 health_status: 'healthy',
 status: 'active',
 failure_count: 0,
 last_failure: null,
 updated_at: new Date().toISOString(),
 }).eq('id', keyId);
}

export async function checkExpiredRateLimits(): Promise<MasterApiKeyRow[]> {
 const { data, error } = await supabase
 .from('provider_health')
 .select('*')
 .eq('status', 'rate_limited')
 .lt('retry_after', new Date().toISOString())
 .not('retry_after', 'is', null);

 if (error || !data) return [];

 const recovered: string[] = [];
 for (const record of data) {
 await supabase.from('provider_health').update({
 status: 'healthy',
 retry_after: null,
 updated_at: new Date().toISOString(),
 }).eq('id', record.id);

 await supabase.from('master_api_keys').update({
 health_status: 'healthy',
 status: 'active',
 updated_at: new Date().toISOString(),
 }).eq('id', record.master_api_key_id);

 recovered.push(record.master_api_key_id);
 }

 if (recovered.length > 0) {
 console.log(`[health] Auto-recovered ${recovered.length} rate-limited keys`);
 }

 const keys = await Promise.all(recovered.map((id) => getMasterKeyById(id)));
 return keys.filter((k): k is MasterApiKeyRow => k !== null);
}

export async function checkAndAutoDisableKeys(): Promise<MasterApiKeyRow[]> {
 const { data: healthRecords, error } = await supabase
 .from('provider_health')
 .select('*, master_api_keys(*)')
 .gte('consecutive_failures', 5);

 if (error || !healthRecords) return [];

 const disabled: MasterApiKeyRow[] = [];
 for (const record of healthRecords) {
 const key = record.master_api_keys;
 if (!key || key.status === 'disabled') continue;

 await supabase.from('master_api_keys').update({
 status: 'disabled',
 health_status: 'disabled',
 updated_at: new Date().toISOString(),
 }).eq('id', record.master_api_key_id);

 disabled.push(key as MasterApiKeyRow);
 }

 if (disabled.length > 0) {
 console.log(`[health] Auto-disabled ${disabled.length} failed keys`);
 }
 return disabled;
}
