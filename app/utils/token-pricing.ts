/**
 * Token-to-credit pricing calculator.
 *
 * Supports two plan types:
 * 1. Flat pricing (legacy): plan.price is a flat subscription fee for duration_days
 * 2. Per-token pricing: price_per_1m_input_tokens / price_per_1m_output_tokens are set (> 0)
 *
 * Credits are consumed as tokens are used. A per-token plan needs min_credits
 * set as the initial credit allocation.
 */

/**
 * Calculate how many credits to deduct for a given token usage.
 *
 * @param promptTokens - Input/prompt tokens consumed
 * @param completionTokens - Output/completion tokens consumed
 * @param pricePer1mInput - Price per 1M input tokens (0 = use flat pricing)
 * @param pricePer1mOutput - Price per 1M output tokens (0 = use flat pricing)
 * @returns credits to deduct (rounded to 4 decimal places)
 */
export function calculateTokenCredits(
 promptTokens: number,
 completionTokens: number,
 pricePer1mInput: number,
 pricePer1mOutput: number
): number {
 if (pricePer1mInput <= 0 && pricePer1mOutput <= 0) {
 return 0; // flat pricing — credits are managed differently
 }

 const inputCredits = (promptTokens / 1_000_000) * pricePer1mInput;
 const outputCredits = (completionTokens / 1_000_000) * pricePer1mOutput;
 return Math.round((inputCredits + outputCredits) * 10_000) / 10_000;
}

/**
 * Determine if a plan uses per-token pricing.
 */
export function isTokenPricingPlan(
 pricePer1mInput: number,
 pricePer1mOutput: number
): boolean {
 return (pricePer1mInput ?? 0) > 0 || (pricePer1mOutput ?? 0) > 0;
}

/**
 * Format a token count for display (e.g. 1,234,567 → "1.23M")
 */
export function formatTokenCount(tokens: number): string {
 if (tokens >= 1_000_000) {
 return (tokens / 1_000_000).toFixed(2) + "M";
 }
 if (tokens >= 1_000) {
 return (tokens / 1_000).toFixed(1) + "K";
 }
 return String(tokens);
}

/**
 * Compute initial allocated credits for a token-priced plan.
 * Uses min_credits if set, otherwise allocates credits based on
 * price_per_1m_input_tokens as a heuristic (1M input tokens worth).
 */
export function computeInitialCredits(
 minCredits: number,
 pricePer1mInput: number,
 pricePer1mOutput: number
): number {
 if (minCredits > 0) return minCredits;

 if (pricePer1mInput > 0 || pricePer1mOutput > 0) {
 const heuristic = Math.max(pricePer1mInput, pricePer1mOutput) * 1;
 return Math.max(heuristic, 1); // at least 1 credit worth
 }
 return 0;
}
