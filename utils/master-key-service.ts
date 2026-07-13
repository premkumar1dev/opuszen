/**
 * Master API Key Management Service
 * Handles loading, selecting, and managing upstream provider keys
 */
import { supabaseServer as supabase } from "~/utils/supabase.server";
import type { MasterApiKeyRow, MasterApiKeyInput, MasterApiKeyStats, ProviderHealthRow } from "~/types/gateway";

export async function getAllMasterKeys(): Promise<MasterApiKeyRow[]> {
 const { data, error } = await supabase
 .from('master_api_keys')
 .select('*')
 .order('priority', { ascending: true });

 if (error) throw new Error(`Failed to fetch master keys: ${error.message}`);
 return (data ?? []) as MasterApiKeyRow[];
}

export async function getActiveMasterKeys(): Promise<MasterApiKeyRow[]> {
 const keys = await getAllMasterKeys();
 return keys.filter((k) => {
 return (
 k.status === 'active'
 && !['quota_exhausted', 'rate_limited', 'temporarily_failed', 'disabled'].includes(k.health_status)
 && (k.remaining_credits ?? 0) > 0
 );
 });
}

export async function getMasterKeyById(id: string): Promise<MasterApiKeyRow | null> {
 const { data, error } = await supabase
 .from('master_api_keys')
 .select('*')
 .eq('id', id)
 .single();

 if (error) return null;
 return data as MasterApiKeyRow;
}

export async function getMasterKeyByProvider(provider: string, allowedProviders: string[]): Promise<MasterApiKeyRow | null> {
 const keys = await getActiveMasterKeys();
 if (allowedProviders.length > 0) {
 const filtered = keys.filter((k) => allowedProviders.includes(k.provider));
 if (filtered.length > 0) return filtered[0];
 }
 const byProvider = keys.filter((k) => k.provider === provider);
 return byProvider[0] ?? keys[0] ?? null;
}

export async function selectBestMasterKey(provider?: string, allowedProviders?: string[]): Promise<MasterApiKeyRow | null> {
 const activeKeys = await getActiveMasterKeys();
 if (activeKeys.length === 0) return null;

 if (provider && allowedProviders && allowedProviders.length > 0) {
 const matched = activeKeys.filter((k) => allowedProviders.includes(k.provider));
 if (matched.length > 0) return matched.sort((a, b) => a.priority - b.priority)[0];
 }

 if (provider) {
 const byProvider = activeKeys.filter((k) => k.provider === provider);
 if (byProvider.length > 0) return byProvider.sort((a, b) => a.priority - b.priority)[0];
 }

 return activeKeys.sort((a, b) => a.priority - b.priority)[0];
}

export async function createMasterKey(input: MasterApiKeyInput): Promise<MasterApiKeyRow> {
 const { data, error } = await (supabase
 .from('master_api_keys') as any)
 .insert({
 provider: input.provider,
 name: input.name,
 api_key: input.api_key,
 priority: input.priority ?? 100,
 total_credits: input.total_credits ?? 0,
 remaining_credits: input.total_credits ?? 0,
 status: input.status ?? 'active',
 })
 .select()
 .single();

 if (error) throw new Error(`Failed to create master key: ${error.message}`);

 // Create health record
 const keyId = (data as MasterApiKeyRow).id;
 await supabase.from('provider_health').insert({ master_api_key_id: keyId });

 return data as MasterApiKeyRow;
}

export async function updateMasterKey(id: string, updates: Partial<MasterApiKeyRow>): Promise<void> {
 const { error } = await (supabase
 .from('master_api_keys') as any)
 .update({ ...updates, updated_at: new Date().toISOString() })
 .eq('id', id);

 if (error) throw new Error(`Failed to update master key: ${error.message}`);
}

export async function deleteMasterKey(id: string): Promise<void> {
 const { error } = await supabase.from('master_api_keys').delete().eq('id', id);
 if (error) throw new Error(`Failed to delete master key: ${error.message}`);
}

export async function markMasterKeyFailed(id: string, reason: string): Promise<void> {
 const key = await getMasterKeyById(id);
 if (!key) return;

 const newFailureCount = key.failure_count + 1;
 const updatedStatus = newFailureCount >= 5 ? 'temporarily_failed' : key.status;

 await updateMasterKey(id, {
 failure_count: newFailureCount,
 last_failure: new Date().toISOString(),
 status: updatedStatus,
 health_status: 'unhealthy',
 updated_at: new Date().toISOString(),
 });

 await updateHealthRecord(id, {
 status: 'unhealthy',
 consecutive_failures: (key.failure_count + 1),
 last_failure: new Date().toISOString(),
 last_error: reason,
 });
}

export async function markMasterKeySuccess(id: string, responseTimeMs: number): Promise<void> {
  const key = await getMasterKeyById(id);
  if (!key) return;

  await updateMasterKey(id, {
  last_used: new Date().toISOString(),
  total_requests: key.total_requests + 1,
  success_requests: key.success_requests + 1,
  failure_count: 0,
  health_status: 'healthy',
  updated_at: new Date().toISOString(),
  });

  // Note: health record (consecutive_successes etc.) is updated by recordHealthSuccess()
  // in health-service.ts which is called separately from gateway-service.
}

export async function markMasterKeyRateLimited(id: string): Promise<void> {
 await updateMasterKey(id, {
 health_status: 'rate_limited',
 status: 'rate_limited',
 last_failure: new Date().toISOString(),
 });

 await updateHealthRecord(id, {
 status: 'rate_limited',
 consecutive_failures: 1,
 last_failure: new Date().toISOString(),
 last_error: 'Rate limited',
 });
}

export async function markMasterKeyQuotaExhausted(id: string): Promise<void> {
 await updateMasterKey(id, {
 health_status: 'quota_exhausted',
 status: 'quota_exhausted',
 remaining_credits: 0,
 last_failure: new Date().toISOString(),
 });

 await updateHealthRecord(id, {
 status: 'quota_exhausted',
 consecutive_failures: 1,
 last_failure: new Date().toISOString(),
 last_error: 'Quota exhausted',
 });
}

export async function resetMasterKeyHealth(id: string): Promise<void> {
 await updateMasterKey(id, {
 health_status: 'healthy',
 status: 'active',
 failure_count: 0,
 last_failure: null,
 updated_at: new Date().toISOString(),
 });

 await supabase
 .from('provider_health')
 .update({
 status: 'healthy',
 consecutive_failures: 0,
 consecutive_successes: 0,
 last_failure: null,
 last_error: '',
 retry_after: null,
 updated_at: new Date().toISOString(),
 })
 .eq('master_api_key_id', id);
}

export async function getMasterKeyStats(id: string): Promise<MasterApiKeyStats> {
 const key = await getMasterKeyById(id);
 if (!key) throw new Error('Master key not found');

 const successRate = key.total_requests > 0
 ? Math.round((key.success_requests / key.total_requests) * 100)
 : 100;

 return {
 id,
 totalRequests: key.total_requests,
 successRequests: key.success_requests,
 failedRequests: key.failed_requests,
 successRate,
 totalCredits: key.total_credits,
 usedCredits: key.used_credits,
 remainingCredits: key.remaining_credits,
 lastUsed: key.last_used,
 lastFailure: key.last_failure,
 failureCount: key.failure_count,
 };
}

export async function getAllMasterKeyStats(): Promise<MasterApiKeyStats[]> {
 const keys = await getAllMasterKeys();
 return Promise.all(keys.map((k) => getMasterKeyStats(k.id)));
}

// ---------------------------------------------------------------------------
// Provider Health helpers
// ---------------------------------------------------------------------------
export async function updateHealthRecord(
 keyId: string,
 updates: {
 status?: ProviderHealthRow['status'];
 consecutive_failures?: number;
 consecutive_successes?: number;
 last_failure?: string;
 last_success?: string;
 last_error?: string;
 retry_after?: string | null;
 }
): Promise<void> {
 const record = await getHealthRecord(keyId);

 if (record) {
 const { error } = await (supabase
 .from('provider_health') as any)
 .update({ ...updates, updated_at: new Date().toISOString() })
 .eq('master_api_key_id', keyId);
 if (error) console.error('Failed to update health record:', error);
 } else {
 const { error } = await supabase.from('provider_health').insert({
 master_api_key_id: keyId,
 ...updates,
 });
 if (error) console.error('Failed to create health record:', error);
 }
}

export async function getHealthRecord(keyId: string): Promise<any> {
 const { data, error } = await supabase
 .from('provider_health')
 .select('*')
 .eq('master_api_key_id', keyId)
 .maybeSingle();

 if (error || !data) return null;
 return data;
}

export async function getAllHealthRecords(): Promise<any[]> {
 const { data, error } = await supabase
 .from('provider_health')
 .select('*, master_api_keys(provider, name, priority)')
 .order('last_check', { ascending: false });

 if (error) return [];
 return data ?? [];
}

export async function resetHealthRecord(keyId: string): Promise<void> {
 const { error } = await (supabase
 .from('provider_health') as any)
 .update({
 status: 'healthy',
 consecutive_failures: 0,
 consecutive_successes: 0,
 last_failure: null,
 last_error: '',
 retry_after: null,
 updated_at: new Date().toISOString(),
 })
 .eq('master_api_key_id', keyId);

 if (error) throw new Error(`Failed to reset health: ${error.message}`);
}
