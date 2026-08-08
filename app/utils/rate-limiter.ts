/**
 * Persistent Rate Limiter
 *
 * Uses a Supabase-backed sliding-window counter with an atomic PL/pgSQL
 * function (`increment_rate_limit`) that checks and increments in a single
 * transaction, preventing race conditions under concurrent requests.
 *
 * Window: 1-minute sliding window (configurable via gateway_config).
 * Key: one row per user_api_key_id per minute bucket.
 */

import { supabaseServer as supabase } from "~/utils/supabase.server";

const WINDOW_SECONDS = 60; // 1-minute window (matches gateway_config default)
const RPC_FUNCTION = "increment_rate_limit";

interface RateLimitRow {
	id: string;
	user_api_key_id: string;
	window_start: number; // unix seconds
	request_count: number;
}

const MAX_SAFE_REMAINING = 999999; // sentinel for "unlimited" remaining

/**
 * Returns true if the request is within the rate limit for this key.
 * Uses an atomic RPC to check-and-increment in a single transaction.
 */
export async function checkRateLimit(
	userApiKeyId: string,
	limit: number
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
	if (!limit || limit <= 0) {
		return { allowed: true, remaining: MAX_SAFE_REMAINING };
	}

	// Use the atomic RPC function — single DB round-trip, no race condition
	const { data, error } = await supabase.rpc(RPC_FUNCTION, {
		p_user_api_key_id: userApiKeyId,
		p_limit: limit,
		p_window_seconds: WINDOW_SECONDS,
	});

	if (error || !data) {
		console.error("[rateLimiter] Atomic RPC failed:", error);
		// Fail-closed: reject the request when rate-limit check fails
		return { allowed: false, remaining: 0 };
	}

	const result = data as { allowed: boolean; remaining: number; retry_after: number | null };
	return {
		allowed: result.allowed,
		remaining: result.remaining,
		...(result.retry_after ? { retryAfter: result.retry_after } : {}),
	};
}

/**
 * Purge rate-limit rows older than 2x the window so the table doesn't grow
 * unbounded. Safe to call periodically (e.g., from a cron or on each request).
 */
export async function pruneOldRateLimits(): Promise<number> {
	const cutoff = Math.floor(Date.now() / 1000) - (WINDOW_SECONDS * 2);
	const { error, count } = await supabase
		.from("user_rate_limits")
		.delete()
		.lt("window_start", cutoff);

	if (error) {
		console.error("[rateLimiter] Prune failed:", error);
		return 0;
	}
	return count ?? 0;
}
