/**
 * User API Key Management Service
 * Handles user key generation, validation, credits, expiry, rate limits
 */
import { supabaseServer as supabase } from "~/utils/supabase.server";
import crypto from "node:crypto";
import type { UserApiKeyRow, UserApiKeyInput } from "~/types/gateway";

const KEY_PREFIX = "sk_live_";

function generateApiKey(): string {
 const bytes = crypto.randomBytes(24);
 const b64 = bytes.toString("base64url");
 return `${KEY_PREFIX}${b64}`;
}

function maskKey(key: string): string {
 if (key.length <= 12) return key;
 return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

export async function createUserApiKey(input: UserApiKeyInput): Promise<UserApiKeyRow> {
 const apiKey = generateApiKey();
 const now = new Date().toISOString();

 const { data, error } = await (supabase
 .from('user_api_keys') as any)
 .insert({
 user_id: input.user_id,
 api_key: apiKey,
 name: input.name ?? 'Default Key',
 status: 'active',
 allocated_credits: input.allocated_credits ?? 0,
 used_credits: 0,
 remaining_credits: input.allocated_credits ?? 0,
 expiry_date: input.expiry_date ?? null,
 rate_limit: input.rate_limit ?? 60,
 allowed_models: input.allowed_models ?? [],
 allowed_providers: input.allowed_providers ?? [],
 total_requests: 0,
 success_requests: 0,
 failed_requests: 0,
 last_used: null,
 })
 .select()
 .single();

 if (error) throw new Error(`Failed to create user API key: ${error.message}`);
 return data as UserApiKeyRow;
}

export async function validateUserApiKey(apiKey: string): Promise<UserApiKeyRow | null> {
 const { data, error } = await supabase
 .from('user_api_keys')
 .select('*')
 .eq('api_key', apiKey)
 .eq('status', 'active')
 .maybeSingle();

 if (error || !data) return null;

 const key = data as UserApiKeyRow;

 // Check expiry
 if (key.expiry_date && new Date(key.expiry_date) < new Date()) {
 await supabase.from('user_api_keys').update({ status: 'expired' }).eq('id', key.id);
 return null;
 }

 // Check credit depletion
 if (key.allocated_credits > 0 && key.remaining_credits <= 0) {
 await supabase.from('user_api_keys').update({ status: 'disabled' }).eq('id', key.id);
 return null;
 }

 return key;
}

export async function getUserApiKeys(userId: string): Promise<UserApiKeyRow[]> {
 const { data, error } = await supabase
 .from('user_api_keys')
 .select('*')
 .eq('user_id', userId)
 .order('created_at', { ascending: false });

 if (error) throw new Error(`Failed to fetch user keys: ${error.message}`);
 return (data ?? []) as UserApiKeyRow[];
}

export async function getAllUserApiKeys(): Promise<UserApiKeyRow[]> {
 const { data, error } = await supabase
 .from('user_api_keys')
 .select('*')
 .order('created_at', { ascending: false });

 if (error) throw new Error(`Failed to fetch user keys: ${error.message}`);
 return (data ?? []) as UserApiKeyRow[];
}

export async function getUserApiKeyById(id: string): Promise<UserApiKeyRow | null> {
 const { data, error } = await supabase
 .from('user_api_keys')
 .select('*')
 .eq('id', id)
 .single();

 if (error) return null;
 return data as UserApiKeyRow;
}

export async function updateUserApiKey(id: string, updates: Partial<UserApiKeyRow>): Promise<void> {
 const { error } = await (supabase
 .from('user_api_keys') as any)
 .update({ ...updates, updated_at: new Date().toISOString() })
 .eq('id', id);

 if (error) throw new Error(`Failed to update user key: ${error.message}`);
}

export async function deleteUserApiKey(id: string): Promise<void> {
 const { error } = await supabase.from('user_api_keys').delete().eq('id', id);
 if (error) throw new Error(`Failed to delete user key: ${error.message}`);
}

export async function regenerateUserApiKey(id: string): Promise<UserApiKeyRow> {
 const newKey = generateApiKey();
 const { data, error } = await (supabase
 .from('user_api_keys') as any)
 .update({ api_key: newKey, updated_at: new Date().toISOString() })
 .eq('id', id)
 .select()
 .single();

 if (error) throw new Error(`Failed to regenerate key: ${error.message}`);
 return data as UserApiKeyRow;
}

export async function recordUserKeyUsage(
 keyId: string,
 tokensUsed: number,
 creditsUsed: number,
 success: boolean
): Promise<void> {
 const key = await getUserApiKeyById(keyId);
 if (!key) return;

 const newUsed = key.used_credits + creditsUsed;
 const newRemaining = Math.max(0, key.allocated_credits - newUsed);
 const now = new Date().toISOString();

 const updates: any = {
 used_credits: newUsed,
 remaining_credits: newRemaining,
 total_requests: key.total_requests + 1,
 last_used: now,
 updated_at: now,
 };

 if (success) {
 updates.success_requests = key.success_requests + 1;
 } else {
 updates.failed_requests = key.failed_requests + 1;
 }

 // Auto-disable if credits exhausted
 if (newRemaining <= 0 && key.allocated_credits > 0) {
 updates.status = 'disabled';
 }

 await updateUserApiKey(keyId, updates);

 // Record credit history
 await recordCreditHistory(key.user_id, keyId, 'used', creditsUsed, newRemaining, 'API request');
}

export async function resetUserKeyUsage(id: string): Promise<void> {
 const key = await getUserApiKeyById(id);
 if (!key) return;

 await updateUserApiKey(id, {
 used_credits: 0,
 remaining_credits: key.allocated_credits,
 total_requests: 0,
 success_requests: 0,
 failed_requests: 0,
 status: 'active',
 });

 await recordCreditHistory(key.user_id, id, 'reset', 0, key.allocated_credits, 'Usage reset by admin');
}

export async function disableUserApiKey(id: string): Promise<void> {
 await updateUserApiKey(id, { status: 'disabled' });
}

export async function enableUserApiKey(id: string): Promise<void> {
 await updateUserApiKey(id, { status: 'active' });
}

export async function extendUserKeyExpiry(id: string, newExpiry: string): Promise<void> {
 await updateUserApiKey(id, { expiry_date: newExpiry, status: 'active' });
}

// ---------------------------------------------------------------------------
// Credit history
// ---------------------------------------------------------------------------
export async function recordCreditHistory(
 userId: string,
 keyId: string | null,
 action: 'allocated' | 'used' | 'refunded' | 'reset' | 'expired' | 'purchased',
 amount: number,
 balanceAfter: number,
 description: string
): Promise<void> {
 await supabase.from('user_credit_history').insert({
 user_id: userId,
 user_api_key_id: keyId,
 action,
 amount,
 balance_after: balanceAfter,
 description,
 });
}

// ---------------------------------------------------------------------------
// Masked key helpers (safe for display)
// ---------------------------------------------------------------------------
export { maskKey };
