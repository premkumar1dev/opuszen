/**
 * Sanitized Key Status Service
 *
 * Wraps the gateway getKeyStatus and STRIPS all OpusLive plan data.
 * Customers NEVER see OpusLive internal plan names (5X, 20X, etc.).
 * All plan branding comes exclusively from the OpusZen admin_plans table.
 */

import { getKeyStatus } from "~/utils/gateway-service";
import { getPlanInfoForApiKey } from "~/utils/plan-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OpusZenPlanMetadata {
	planName: string;
	displayName: string;
	badgeColor: string;
	description: string;
	monthlyPrice: number;
	dailyTokenLimit: number;
	monthlyTokenLimit: number;
	features: string[];
	modelAccess: string[];
	priority: number;
}

export interface SanitizedKeyStatus {
	status: string;
	[key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

// OpusLive plan name patterns that must NEVER be shown to customers
const OPUSLIVE_PLAN_PATTERNS = [
	/\b\d+X\b/i, // 5X, 10X, 20X, etc.
	/\b\d+times\b/i, // 5times, etc.
	/\b(max|pro|plus|premium|enterprise|business|starter|developer)\s?\d+\b/i, // plan names with numbers
	/opuslive/i, // any opuslive branding
];

/**
 * Strip OpusLive plan names from a string
 */
function sanitizePlanName(name: string): string {
	if (!name) return name;
	// If it matches an OpusLive pattern, replace with "Custom Plan"
	for (const pattern of OPUSLIVE_PLAN_PATTERNS) {
		if (pattern.test(name)) {
			return "Custom Plan";
		}
	}
	return name;
}

/**
 * Sanitize any object to strip OpusLive data
 */
function sanitizeObject(
	obj: Record<string, unknown>,
	planName?: string
): SanitizedKeyStatus {
	const sanitized: SanitizedKeyStatus = { ...obj, status: obj.status as string };

	// Override planName with OpusZen plan name
	if (sanitized.planName && planName) {
		sanitized.planName = planName;
	} else if (sanitized.planName) {
		// Strip any OpusLive naming patterns
		if (typeof sanitized.planName === "string") {
			sanitized.planName = sanitizePlanName(sanitized.planName);
		}
	}

	// Remove any fields that might expose OpusLive internal data
	delete sanitized.multiplier;
	delete sanitized.opuslivePlan;
	delete sanitized.originalPlanName;

	// Sanitize allowedModels — remove any OpusLive-specific model naming
	if (sanitized.allowedModels && Array.isArray(sanitized.allowedModels)) {
		sanitized.allowedModels = (sanitized.allowedModels as string[]).map((m) =>
			typeof m === "string" ? m.replace(/opuslive/gi, "").trim() || m : m
		);
	}

	return sanitized;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get sanitized key status — the ONLY function that should be called
 * from customer-facing endpoints.
 *
 * CRITICAL: This function ensures no OpusLive plan names are ever returned.
 */
export async function getSanitizedKeyStatus(apiKey: string): Promise<SanitizedKeyStatus> {
	// Get raw status from gateway (validates key with OpusLive internally)
	const rawResult = await getKeyStatus(apiKey);

	// If error, return as-is (no plan data to sanitize)
	if (rawResult.status === "error") {
		return rawResult as SanitizedKeyStatus;
	}

	// Look up the OpusZen plan assignment for this key
	const planInfo = await getPlanInfoForApiKey(apiKey);

	const opusZenPlanName = planInfo?.displayName;

	// Sanitize: replace OpusLive plan name with OpusZen plan name
	const sanitized = sanitizeObject(rawResult as Record<string, unknown>, opusZenPlanName);

	// Add plan metadata from OpusZen database if available
	if (planInfo && sanitized.status !== "error") {
		sanitized.opusZenPlan = {
			planName: planInfo.planName,
			displayName: planInfo.displayName,
			badgeColor: planInfo.badgeColor,
			description: planInfo.description,
			monthlyPrice: planInfo.monthlyPrice,
			dailyTokenLimit: planInfo.dailyTokenLimit,
			monthlyTokenLimit: planInfo.monthlyTokenLimit,
			features: planInfo.features,
			modelAccess: planInfo.modelAccess,
			priority: planInfo.priority,
		} as OpusZenPlanMetadata;
		sanitized.planName = planInfo.displayName;
		if (planInfo.monthlyTokenLimit && (!sanitized.windowTokensLimit || Number(sanitized.windowTokensLimit) === 0)) {
			sanitized.windowTokensLimit = planInfo.monthlyTokenLimit;
		}
	}

	return sanitized;
}
