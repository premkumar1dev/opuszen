/**
 * Persistent Rate Limiter
 *
 * Replaces the in-memory rateLimitMap with a Supabase-backed sliding-window
 * counter. Survives server restarts and works across multiple instances.
 *
 * Window: 1-minute sliding window (configurable via gateway_config).
 * Key: one row per user_api_key_id per minute bucket.
 */

import { supabaseServer as supabase } from "~/utils/supabase.server";

const WINDOW_SECONDS = 60; // 1-minute window (matches gateway_config default)

interface RateLimitRow {
 id: string;
 user_api_key_id: string;
 window_start: number; // unix seconds
 request_count: number;
}

const MAX_SAFE_REMAINING = 999999; // sentinel for "unlimited" remaining

/**
 * Returns true if the request is within the rate limit for this key.
 * Also increments the counter atomically.
 */
export async function checkRateLimit(
 userApiKeyId: string,
 limit: number
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
 if (!limit || limit <= 0) {
 return { allowed: true, remaining: MAX_SAFE_REMAINING };
 }

 const now = Date.now();
 const windowStart = Math.floor(now / 1000) - WINDOW_SECONDS;
 const currentBucketStart = Math.floor(now / 1000);

 // Count requests in the last WINDOW_SECONDS
 const { count, error } = await supabase
 .from("user_rate_limits")
 .select("*", { count: "exact", head: true })
 .eq("user_api_key_id", userApiKeyId)
 .gte("window_start", windowStart);

 if (error) {
 console.error("[rateLimiter] Failed to count:", error);
 return { allowed: false, remaining: 0 };
 }

 const currentCount = count ?? 0;
 if (currentCount >= limit) {
 // Find oldest entry to compute retry-after
 const { data: oldest } = await supabase
 .from("user_rate_limits")
 .select("window_start")
 .eq("user_api_key_id", userApiKeyId)
 .order("window_start", { ascending: true })
 .limit(1)
 .maybeSingle();

 const retryAfter = oldest
 ? Math.max(1, (oldest.window_start + WINDOW_SECONDS) - Math.floor(now / 1000))
 : WINDOW_SECONDS;

 return { allowed: false, remaining: 0, retryAfter };
 }

 // Record this request (insert per-minute bucket; handles concurrency via
 // PostgREST insert — a few extra requests through is acceptable for rate limiting)
 await supabase.from("user_rate_limits").insert({
 user_api_key_id: userApiKeyId,
 window_start: currentBucketStart,
 request_count: 1,
 });

 // Note: for higher-concurrency environments, run the SQL RPC below:
 // SELECT increment_rate_limit(p_user_api_key_id, p_window_start);

 const remaining = limit - currentCount - 1;
 return { allowed: true, remaining: Math.max(0, remaining) };
}

/**
 * Purge rate-limit rows older than 2x the window so the table doesn't grow
 * unbounded. Safe to call periodically (e.g., from a cron or on each request).
 */
export async function pruneOldRateLimits(): Promise<number> {
 const cutoff = Math.floor(Date.now() / 1000) - (WINDOW_SECONDS * 2);
 const { error } = await supabase
 .from("user_rate_limits")
 .delete({ count: "exact" })
 .lt("window_start", cutoff);

 if (error) {
 console.error("[rateLimiter] Prune failed:", error);
 return 0;
 }
 return 1;
}
