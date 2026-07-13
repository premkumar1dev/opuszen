/**
 * Logging Service
 * Handles API request logs and failover logs
 */
import { supabaseServer as supabase } from "~/utils/supabase.server";
import type { ApiRequestLogRow, ApiFailoverLogRow, ApiRequestLogFilters, FailoverEvent } from "~/types/gateway";

// ---------------------------------------------------------------------------
// Request Logging
// ---------------------------------------------------------------------------
export async function logApiRequest(log: {
 requestId: string;
 userId: string | null;
 userApiKeyId: string | null;
 userApiKeyPrefix: string;
 masterApiKeyId: string | null;
 masterKeyPrefix: string;
 provider: string;
 model: string;
 promptTokens: number;
 completionTokens: number;
 totalTokens: number;
 creditsUsed: number;
 responseTimeMs: number;
 httpStatus: number;
 isSuccess: boolean;
 errorMessage?: string;
 ipAddress?: string;
 userAgent?: string;
 requestBody?: Record<string, any>;
}): Promise<void> {
 try {
 await supabase.from('api_request_logs').insert({
 request_id: log.requestId,
 user_id: log.userId,
 user_api_key_id: log.userApiKeyId,
 user_api_key_prefix: log.userApiKeyPrefix,
 master_api_key_id: log.masterApiKeyId,
 master_key_prefix: log.masterKeyPrefix,
 provider: log.provider,
 model: log.model,
 prompt_tokens: log.promptTokens,
 completion_tokens: log.completionTokens,
 total_tokens: log.totalTokens,
 credits_used: log.creditsUsed,
 response_time_ms: log.responseTimeMs,
 http_status: log.httpStatus,
 is_success: log.isSuccess,
 error_message: log.errorMessage ?? '',
 ip_address: log.ipAddress ?? '',
 user_agent: log.userAgent ?? '',
 request_body: log.requestBody ?? {},
 });
 } catch (err) {
 console.error('[logging] Failed to log request:', err);
 }
}

export async function getRequestLogs(filters: ApiRequestLogFilters, page = 1, perPage = 50): Promise<{ logs: ApiRequestLogRow[]; total: number }> {
 let query = supabase
 .from('api_request_logs')
 .select('*', { count: 'exact' });

 if (filters.search) {
  // Sanitize: escape PostgREST special characters to prevent filter injection
  const sanitized = filters.search.replace(/[%_\\,()]/g, (c) => `\\${c}`);
  query = query.or(`model.ilike.%${sanitized}%,provider.ilike.%${sanitized}%,error_message.ilike.%${sanitized}%`);
 }
 if (filters.provider) query = query.eq('provider', filters.provider);
 if (filters.model) query = query.eq('model', filters.model);
 if (filters.status === 'success') query = query.eq('is_success', true);
 if (filters.status === 'error') query = query.eq('is_success', false);
 if (filters.userId) query = query.eq('user_id', filters.userId);
 if (filters.masterKeyId) query = query.eq('master_api_key_id', filters.masterKeyId);
 if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
 if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

 const from = (page - 1) * perPage;
 const to = from + perPage - 1;

 const { data, error, count } = await query
 .order('created_at', { ascending: false })
 .range(from, to);

 if (error) throw new Error(`Failed to fetch logs: ${error.message}`);
 return { logs: (data ?? []) as ApiRequestLogRow[], total: count ?? 0 };
}

export async function getRequestLogById(id: string): Promise<ApiRequestLogRow | null> {
 const { data, error } = await supabase
 .from('api_request_logs')
 .select('*')
 .eq('id', id)
 .single();

 if (error) return null;
 return data as ApiRequestLogRow;
}

export async function getRecentRequestLogs(limit = 20): Promise<ApiRequestLogRow[]> {
 const { data, error } = await supabase
 .from('api_request_logs')
 .select('*')
 .order('created_at', { ascending: false })
 .limit(limit);

 if (error) return [];
 return (data ?? []) as ApiRequestLogRow[];
}

// ---------------------------------------------------------------------------
// Failover Logging
// ---------------------------------------------------------------------------
export async function logFailover(event: FailoverEvent): Promise<void> {
 try {
 await supabase.from('api_failover_logs').insert({
 request_id: event.requestId,
 original_master_key_id: event.originalKeyId,
 new_master_key_id: event.newKeyId,
 original_provider: event.originalProvider,
 new_provider: event.newProvider,
 failure_reason: event.failureReason,
 http_status: event.httpStatus ?? 0,
 error_message: event.errorMessage,
 retry_number: event.retryNumber,
 model: event.model,
 ip_address: event.ipAddress,
 });
 } catch (err) {
 console.error('[logging] Failed to log failover:', err);
 }
}

export async function getFailoverLogs(page = 1, perPage = 50): Promise<{ logs: ApiFailoverLogRow[]; total: number }> {
 const from = (page - 1) * perPage;
 const to = from + perPage - 1;

 const { data, error, count } = await supabase
 .from('api_failover_logs')
 .select('*', { count: 'exact' })
 .order('created_at', { ascending: false })
 .range(from, to);

 if (error) throw new Error(`Failed to fetch failover logs: ${error.message}`);
 return { logs: (data ?? []) as ApiFailoverLogRow[], total: count ?? 0 };
}

export async function getFailoverLogsByRequest(requestId: string): Promise<ApiFailoverLogRow[]> {
 const { data, error } = await supabase
 .from('api_failover_logs')
 .select('*')
 .eq('request_id', requestId)
 .order('created_at', { ascending: true });

 if (error) return [];
 return (data ?? []) as ApiFailoverLogRow[];
}

export async function getRecentFailoverLogs(limit = 20): Promise<ApiFailoverLogRow[]> {
 const { data, error } = await supabase
 .from('api_failover_logs')
 .select('*')
 .order('created_at', { ascending: false })
 .limit(limit);

 if (error) return [];
 return (data ?? []) as ApiFailoverLogRow[];
}
