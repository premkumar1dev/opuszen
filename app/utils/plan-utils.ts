/**
 * Plan utility functions that are safe to import from client-side code.
 * Pure functions with no Supabase or server-only dependencies.
 */

const wb = (word: string, n: string): boolean => new RegExp("\\b" + word + "\\b", "i").test(n);

/**
 * Infer a token limit from a plan name. Used as a fallback when no explicit
 * token limit is configured for a plan.
 */
export function inferTokenLimitFromPlan(planName?: string | null): number {
	if (!planName) return 0;
	const name = String(planName).toLowerCase().trim();

	// Direct token indicators in string (e.g., "500M", "150M", "50M", "20M", "15M", "10M", "5M", "3M", "1M", "500K")
	const mMatch = name.match(/(\d+)\s*m(?:tokens|b)?\b/);
	if (mMatch && mMatch[1]) {
		return parseInt(mMatch[1], 10) * 1_000_000;
	}
	const kMatch = name.match(/(\d+)\s*k(?:tokens|b)?\b/);
	if (kMatch && kMatch[1]) {
		return parseInt(kMatch[1], 10) * 1_000;
	}

	// Multiplier patterns (e.g., "50x", "20x", "15x", "10x", "5x", "3x", "2x", "1x")
	const xMatch = name.match(/(\d+)\s*x\b/);
	if (xMatch && xMatch[1]) {
		const factor = parseInt(xMatch[1], 10);
		return factor * 1_000_000;
	}

	// Named tiers — use word-boundary matching to avoid false positives
	// (e.g., "Product Analytics Pro" should not match "pro")
	if (wb("enterprise", name)) return 500_000_000;
	if (wb("business", name)) return 150_000_000;
	if (wb("premium", name)) return 50_000_000;
	if (wb("pro", name)) return 15_000_000;
	if (wb("starter|basic|trial", name)) return 3_000_000;

	return 0;
}
