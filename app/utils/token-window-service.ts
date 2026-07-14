/**
 * Rolling Token Window Service
 *
 * Enforces "5-hour rolling window" token limits per user API key.
 * Instead of a fixed billing period, the system tracks tokens consumed in
 * the last 5 hours — a sliding window that resets naturally as old data ages out.
 *
 * This is separate from the static credit budget — it's a rate-style throttle
 * that limits burst usage over time.
 */

import { supabaseServer as supabase } from "~/utils/supabase.server";
import { pruneOldRateLimits } from "~/utils/rate-limiter";

/** Default window size: 5 hours in milliseconds */
export const DEFAULT_WINDOW_MS = 5 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // clean up every 30 min

let lastCleanup = 0;

/**
 * Check and record token usage against a rolling 5-hour window limit.
 *
 * @param userApiKeyId - the user API key's ID
 * @param promptTokens - tokens in the request
 * @param completionTokens - tokens in the response
 * @param windowTokensLimit - max tokens allowed in the window (0 = unlimited)
 * @returns { allowed, tokensUsedInWindow, tokensRemaining, windowResetAt }
 */
export async function checkTokenWindow(
 userApiKeyId: string,
 promptTokens: number,
 completionTokens: number,
 windowTokensLimit: number = 0
): Promise<{
 allowed: boolean;
 tokensUsedInWindow: number;
 tokensRemaining: number;
 windowResetAt: string | null;
}> {
 if (windowTokensLimit <= 0) {
 return { allowed: true, tokensUsedInWindow: 0, tokensRemaining: 0, windowResetAt: null };
 }

 const now = new Date();
 const windowStart = new Date(now.getTime() - DEFAULT_WINDOW_MS);

 // Opportunistic cleanup (runs at most once per 30 min)
 await maybeCleanup(userApiKeyId);

 // Sum tokens in the current rolling window
 const { data: rows, error } = await supabase
 .from("token_usage_windows")
 .select("prompt_tokens, completion_tokens, total_tokens")
 .eq("user_api_key_id", userApiKeyId)
 .gte("window_start", windowStart.toISOString());

 if (error) {
 console.error("[tokenWindow] Query failed:", error);
 return { allowed: true, tokensUsedInWindow: 0, tokensRemaining: windowTokensLimit, windowResetAt: null };
 }

 const used = (rows ?? []).reduce(
 (sum: number, r: any) => sum + (r.total_tokens ?? 0),
 0
 );

 // Record this window's usage
 await supabase.from("token_usage_windows").insert({
 user_api_key_id: userApiKeyId,
 window_start: now.toISOString(),
 window_end: new Date(now.getTime() + DEFAULT_WINDOW_MS).toISOString(),
 prompt_tokens: promptTokens,
 completion_tokens: completionTokens,
 total_tokens: promptTokens + completionTokens,
 request_count: 1,
 });

 const tokensRemaining = Math.max(0, windowTokensLimit - used - (promptTokens + completionTokens));

 return {
 allowed: used + promptTokens + completionTokens <= windowTokensLimit,
 tokensUsedInWindow: used + promptTokens + completionTokens,
 tokensRemaining,
 windowResetAt: new Date(now.getTime() + DEFAULT_WINDOW_MS).toISOString(),
 };
}

/**
 * Get the current token usage in the rolling 5-hour window for a key.
 */
export async function getTokenWindowUsage(userApiKeyId: string): Promise<{
 used: number;
 limit: number;
 remaining: number;
 windowResetAt: string | null;
}> {
 const now = new Date();
 const windowStart = new Date(now.getTime() - DEFAULT_WINDOW_MS);

 const { data: rows, error } = await supabase
 .from("token_usage_windows")
 .select("total_tokens")
 .eq("user_api_key_id", userApiKeyId)
 .gte("window_start", windowStart.toISOString());

 if (error) {
 console.error("[tokenWindow] Query failed:", error);
 return { used: 0, limit: 0, remaining: 0, windowResetAt: null };
 }

 const used = (rows ?? []).reduce((sum: number, r: any) => sum + (r.total_tokens ?? 0), 0);

 return {
 used,
 limit: 0, // caller should pass this in from key config
 remaining: 0,
 windowResetAt: new Date(now.getTime() + DEFAULT_WINDOW_MS).toISOString(),
 };
}

/**
 * Prune old window records that are fully past the rolling window.
 */
export async function pruneOldTokenWindows(): Promise<number> {
 const cutoff = new Date(Date.now() - DEFAULT_WINDOW_MS * 2).toISOString();
 const { count, error } = await supabase
 .from("token_usage_windows")
 .delete({ count: "exact" })
 .lt("window_end", cutoff);

 if (error) {
 console.error("[tokenWindow] Prune failed:", error);
 return 0;
 }
 return count ?? 0;
}

/**
 * Clean up old rate limit + token window rows opportunistically.
 */
async function maybeCleanup(userApiKeyId: string): Promise<void> {
 const now = Date.now();
 if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
 lastCleanup = now;

 pruneOldRateLimits().catch(() => {});
 pruneOldTokenWindows().catch(() => {});
}
