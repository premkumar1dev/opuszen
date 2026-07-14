/**
 * Master API Key Management Service
 * Handles loading, selecting, and managing upstream provider keys
 *
 * API keys are encrypted at rest using AES-256-GCM via utils/crypto.server.ts.
 * The master_api_keys.api_key column stores encrypted strings (iv:tag:ciphertext).
 */
import { supabaseServer as supabase } from "~/utils/supabase.server";
import type { MasterApiKeyRow, MasterApiKeyInput, MasterApiKeyStats, ProviderHealthRow } from "~/types/gateway";
import { encrypt, decrypt } from "~/utils/crypto.server";

/** Decrypt the api_key field from a raw DB row */
function decryptKey(row: any): any {
 if (!row?.api_key || typeof row.api_key !== "string") return row;
 // Already plain (legacy unencrypted data): if it looks like an AI API key (starts with sk- / gsk- / etc.)
 // but is NOT in "iv:tag:base64" format, try to encrypt it now. For reads, assume already encrypted.
 if (row.api_key.includes(":") && row.api_key.split(":").length >= 3) {
 // Looks like encrypted format (iv:tag:ciphertext)
 const decrypted = decrypt(row.api_key);
 if (decrypted) {
 return { ...row, api_key: decrypted };
 }
 }
 return row; // return as-is if decryption fails
}

function decryptKeys(rows: any[]): any[] {
 return rows.map(decryptKey);
}

export async function getAllMasterKeys(): Promise<MasterApiKeyRow[]> {
 const { data, error } = await supabase
 .from('master_api_keys')
 .select('*')
 .order('priority', { ascending: true });

 if (error) throw new Error(`Failed to fetch master keys: ${error.message}`);
 return decryptKeys(data ?? []);
}

export async function getActiveMasterKeys(): Promise<MasterApiKeyRow[]> {
 const { data, error } = await supabase
 .from('master_api_keys')
 .select('*')
 .eq('status', 'active')
 .neq('health_status', 'quota_exhausted')
 .neq('health_status', 'rate_limited')
 .neq('health_status', 'temporarily_failed')
 .neq('health_status', 'disabled')
 .gt('remaining_credits', 0)
 .order('priority', { ascending: true });

 if (error) throw new Error(`Failed to fetch active master keys: ${error.message}`);
 return decryptKeys(data ?? []);
}

// DB-level filtered variant (fetches all, then filters server-side — kept for
// callers that need the full dataset)
export async function getActiveMasterKeysUnfiltered(): Promise<MasterApiKeyRow[]> {
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
 return decryptKey(data);
}

export async function getMasterKeyByProvider(provider: string, allowedProviders: string[]): Promise<MasterApiKeyRow | null> {
 const keys = await getActiveMasterKeys();
 if (allowedProviders.length > 0) {
 const filtered = keys.filter((k) => allowedProviders.includes(k.provider));
 if (filtered.length > 0) return filtered[0];
 }
 // Do NOT fall back to a non-allowed provider
 return null;
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
 const encryptedApiKey = encrypt(input.api_key);

 const { data, error } = await (supabase
 .from('master_api_keys') as any)
 .insert({
 provider: input.provider,
 name: input.name,
 api_key: encryptedApiKey,
 priority: input.priority ?? 100,
 total_credits: input.total_credits ?? 0,
 remaining_credits: input.total_credits ?? 0,
 status: input.status ?? 'active',
 })
 .select()
 .single();

 if (error) throw new Error(`Failed to create master key: ${error.message}`);
 if (!data) throw new Error('Failed to create master key: no data returned');

 // Create health record
 const keyId = data.id;
 await supabase.from('provider_health').insert({ master_api_key_id: keyId });

 return decryptKey(data) as MasterApiKeyRow;
}

export async function updateMasterKey(id: string, updates: Partial<MasterApiKeyRow>): Promise<void> {
 const safeUpdates = { ...updates, updated_at: new Date().toISOString() };
 if (safeUpdates.api_key && typeof safeUpdates.api_key === 'string') {
 // Only encrypt if it doesn't look like already-encrypted data (iv:tag:ciphertext format)
 if (!safeUpdates.api_key.includes(":") || safeUpdates.api_key.split(":").length < 3) {
 safeUpdates.api_key = encrypt(safeUpdates.api_key);
 }
 }

 const { error } = await (supabase
 .from('master_api_keys') as any)
 .update(safeUpdates)
 .eq('id', id);

 if (error) throw new Error(`Failed to update master key: ${error.message}`);
}

export async function deleteMasterKey(id: string): Promise<void> {
 const { error } = await supabase.from('master_api_keys').delete().eq('id', id);
 if (error) throw new Error(`Failed to delete master key: ${error.message}`);
}

export async function markMasterKeyFailed(id: string, reason: string): Promise<void> {
 // Fetch only the columns we need — avoid decrypting the full key
 const { data, error } = await supabase
 .from('master_api_keys')
 .select('failure_count')
 .eq('id', id)
 .single();

 if (error || !data) return;

 const newFailureCount = (data.failure_count ?? 0) + 1;
 const updatedStatus = newFailureCount >= 5 ? 'temporarily_failed' : 'active';

 await updateMasterKey(id, {
 failure_count: newFailureCount,
 last_failure: new Date().toISOString(),
 status: updatedStatus,
 health_status: 'unhealthy',
 updated_at: new Date().toISOString(),
 });

 await updateHealthRecord(id, {
 status: 'unhealthy',
 consecutive_failures: newFailureCount,
 last_failure: new Date().toISOString(),
 last_error: reason,
 });
}

export async function markMasterKeySuccess(id: string): Promise<void> {
 // Fetch only the counter columns needed — avoid decrypting the full key
 const { data, error } = await supabase
 .from('master_api_keys')
 .select('total_requests, success_requests, failure_count')
 .eq('id', id)
 .single();

 if (error || !data) return;

 await supabase
 .from('master_api_keys')
 .update({
 last_used: new Date().toISOString(),
 total_requests: (data.total_requests ?? 0) + 1,
 success_requests: (data.success_requests ?? 0) + 1,
 failure_count: 0,
 health_status: 'healthy',
 updated_at: new Date().toISOString(),
 })
 .eq('id', id);

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
 const key = await getMasterKeyById(id);
 if (!key) return;

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

 // Restore remaining credits if they were depleted
 if ((key.remaining_credits ?? 0) <= 0 && key.total_credits > 0) {
 await supabase
 .from('master_api_keys')
 .update({
 remaining_credits: key.total_credits,
 })
 .eq('id', id);
 }
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

 if (error) {
 console.error('[health] Failed to fetch health record:', error);
 return null;
 }
 return data;
}

export async function getAllHealthRecords(): Promise<any[]> {
 const { data, error } = await supabase
 .from('provider_health')
 .select('*, master_api_keys(provider, name, priority)')
 .order('last_check', { ascending: false });

 if (error) {
 console.error('[health] Failed to fetch all health records:', error);
 return [];
 }
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
