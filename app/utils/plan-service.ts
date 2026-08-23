/**
 * Plan Management Service
 * Centralized operations for admin_plans and plan assignments.
 *
 * SECURITY:
 * - Never exposes OpusLive plan names to customers
 * - Plan data always comes from the OpusZen database
 * - OpusLive is used only for key validation, not for plan branding
 */

import { supabaseServer as supabase } from "~/utils/supabase.server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminPlan {
	id: string;
	name: string;
	display_name: string;
	description: string;
	badge_color: string;
	icon: string;
	features: string[];
	monthly_price: number;
	daily_token_limit: number;
	monthly_token_limit: number;
	model_access: string[];
	is_active: boolean;
	is_visible: boolean;
	priority: number;
	sort_order: number;
	notes: string;
	is_system: boolean;
	created_at: string;
	updated_at: string;
}

export interface PlanAssignment {
	id: string;
	api_key: string;
	user_api_key_id: string | null;
	plan_id: string;
	custom_display_name: string | null;
	custom_badge_color: string | null;
	custom_daily_token_limit: number | null;
	custom_monthly_token_limit: number | null;
	assigned_by: string | null;
	expiry_date: string | null;
	is_active: boolean;
	notes: string;
	created_at: string;
	updated_at: string;
}

export interface PlanAssignmentWithDetails extends PlanAssignment {
	plan: AdminPlan;
	user_api_key?: {
		id: string;
		name: string;
		user_id: string;
	};
}

export interface ActivityLogEntry {
	id: string;
	action: string;
	entity_type: string;
	entity_id: string;
	admin_email: string | null;
	admin_ip: string | null;
	details: Record<string, any>;
	created_at: string;
}

// ---------------------------------------------------------------------------
// Admin Plan CRUD
// ---------------------------------------------------------------------------

export async function getAllPlans(): Promise<AdminPlan[]> {
	const { data, error } = await supabase
		.from("admin_plans")
		.select("*")
		.order("sort_order", { ascending: true });

	if (error) {
		console.error("[plan-service] getAllPlans error:", error);
		return [];
	}
	return (data ?? []) as AdminPlan[];
}

export async function getActivePlans(): Promise<AdminPlan[]> {
	const { data, error } = await supabase
		.from("admin_plans")
		.select("*")
		.eq("is_active", true)
		.eq("is_visible", true)
		.order("sort_order", { ascending: true });

	if (error) {
		console.error("[plan-service] getActivePlans error:", error);
		return [];
	}
	return (data ?? []) as AdminPlan[];
}

export async function getPlanById(id: string): Promise<AdminPlan | null> {
	const { data, error } = await supabase
		.from("admin_plans")
		.select("*")
		.eq("id", id)
		.single();

	if (error || !data) return null;
	return data as AdminPlan;
}

export async function getPlanByName(name: string): Promise<AdminPlan | null> {
	const { data, error } = await supabase
		.from("admin_plans")
		.select("*")
		.eq("name", name)
		.single();

	if (error || !data) return null;
	return data as AdminPlan;
}

export async function createPlan(plan: Partial<AdminPlan>): Promise<AdminPlan | null> {
	const payload = {
		name: plan.name!,
		display_name: plan.display_name!,
		description: plan.description ?? "",
		badge_color: plan.badge_color ?? "#6366f1",
		icon: plan.icon ?? "Star",
		features: plan.features ?? [],
		monthly_price: plan.monthly_price ?? 0,
		daily_token_limit: plan.daily_token_limit ?? 0,
		monthly_token_limit: plan.monthly_token_limit ?? 0,
		model_access: plan.model_access ?? [],
		is_active: plan.is_active ?? true,
		is_visible: plan.is_visible ?? true,
		priority: plan.priority ?? 0,
		sort_order: plan.sort_order ?? 0,
		notes: plan.notes ?? "",
		is_system: plan.is_system ?? false,
		updated_at: new Date().toISOString(),
	};

	const { data, error } = await supabase
		.from("admin_plans")
		.insert(payload)
		.select()
		.single();

	if (error || !data) {
		console.error("[plan-service] createPlan error:", error);
		return null;
	}
	return data as AdminPlan;
}

export async function updatePlan(id: string, updates: Partial<AdminPlan>): Promise<AdminPlan | null> {
	const payload: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };
	delete payload.id;
	delete payload.created_at;
	delete payload.is_system;

	const { data, error } = await supabase
		.from("admin_plans")
		.update(payload)
		.eq("id", id)
		.select()
		.single();

	if (error || !data) {
		console.error("[plan-service] updatePlan error:", error);
		return null;
	}
	return data as AdminPlan;
}

export async function deletePlan(id: string): Promise<boolean> {
	const { error } = await supabase
		.from("admin_plans")
		.delete()
		.eq("id", id);

	if (error) {
		console.error("[plan-service] deletePlan error:", error);
		return false;
	}
	return true;
}

export async function duplicatePlan(id: string, newName: string, newDisplayName: string): Promise<AdminPlan | null> {
	const source = await getPlanById(id);
	if (!source) return null;

	return createPlan({
		...source,
		name: newName,
		display_name: newDisplayName,
		is_system: false,
		sort_order: source.sort_order + 1,
	});
}

// ---------------------------------------------------------------------------
// Plan Assignments
// ---------------------------------------------------------------------------

export async function assignPlanToApiKey(assignment: {
	api_key: string;
	plan_id: string;
	user_api_key_id?: string | null;
	expiry_date?: string | null;
	notes?: string;
	assigned_by?: string;
}): Promise<PlanAssignment | null> {
	// Upsert: one active assignment per api_key
	const payload = {
		api_key: assignment.api_key,
		plan_id: assignment.plan_id,
		user_api_key_id: assignment.user_api_key_id ?? null,
		expiry_date: assignment.expiry_date ?? null,
		notes: assignment.notes ?? "",
		assigned_by: assignment.assigned_by ?? null,
		is_active: true,
		updated_at: new Date().toISOString(),
	};

	const { data, error } = await supabase
		.from("api_key_plan_assignments")
		.upsert(payload, { onConflict: "api_key" })
		.select()
		.single();

	if (error || !data) {
		console.error("[plan-service] assignPlanToApiKey error:", error);
		return null;
	}
	return data as PlanAssignment;
}

export async function getAssignmentByApiKey(apiKey: string): Promise<PlanAssignmentWithDetails | null> {
	if (!apiKey) return null;
	const cleanKey = apiKey.trim();
	const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanKey);

	// First try direct lookup by api_key in assignments
	let query = supabase
		.from("api_key_plan_assignments")
		.select("*")
		.eq("is_active", true);

	if (isUuid) {
		query = query.or(`api_key.eq.${cleanKey},user_api_key_id.eq.${cleanKey}`);
	} else {
		query = query.eq("api_key", cleanKey);
	}

	const { data: directAssignment } = await query.maybeSingle();

	if (directAssignment) {
		const plan = await getPlanById(directAssignment.plan_id);
		if (plan) {
			return {
				...directAssignment,
				plan,
			};
		}
	}

	// Next, check user_api_keys to find user_api_key_id or plan_name
	try {
		const { data: userKey } = await supabase
			.from("user_api_keys")
			.select("id, plan_name")
			.or(isUuid ? `id.eq.${cleanKey},api_key.eq.${cleanKey}` : `api_key.eq.${cleanKey}`)
			.maybeSingle();

		if (userKey) {
			if (userKey.id) {
				const { data: linkedAssignment } = await supabase
					.from("api_key_plan_assignments")
					.select("*")
					.eq("user_api_key_id", userKey.id)
					.eq("is_active", true)
					.maybeSingle();

				if (linkedAssignment) {
					const plan = await getPlanById(linkedAssignment.plan_id);
					if (plan) {
						return {
							...linkedAssignment,
							plan,
						};
					}
				}
			}

			// If plan_name exists on user_api_keys, match with admin_plans
			if (userKey.plan_name) {
				const { data: matchedPlan } = await supabase
					.from("admin_plans")
					.select("*")
					.ilike("name", userKey.plan_name)
					.eq("is_active", true)
					.maybeSingle();

				if (matchedPlan) {
					return {
						id: userKey.id,
						api_key: cleanKey,
						user_api_key_id: userKey.id,
						plan_id: matchedPlan.id,
						custom_display_name: null,
						custom_badge_color: null,
						custom_daily_token_limit: null,
						custom_monthly_token_limit: null,
						assigned_by: null,
						expiry_date: null,
						is_active: true,
						notes: "",
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
						plan: matchedPlan as any,
					};
				}
			}
		}
	} catch {
		// ignore lookup errors
	}

	return null;
}

export async function getAllAssignments(): Promise<PlanAssignmentWithDetails[]> {
	const { data: assignments, error } = await supabase
		.from("api_key_plan_assignments")
		.select("*")
		.order("created_at", { ascending: false });

	if (error || !assignments) return [];

	const result: PlanAssignmentWithDetails[] = [];
	for (const a of assignments as PlanAssignment[]) {
		const plan = await getPlanById(a.plan_id);
		if (!plan) continue;

			// Fetch user key info
			let userApiKeyData: PlanAssignmentWithDetails["user_api_key"] = undefined;
			if (a.user_api_key_id) {
				const { data } = await supabase
					.from("user_api_keys")
					.select("id, name, user_id")
					.eq("id", a.user_api_key_id)
					.maybeSingle();
				if (data) userApiKeyData = data;
			}

			result.push({ ...a, plan, user_api_key: userApiKeyData });
	}

	return result;
}

export async function getAssignmentsByPlanId(planId: string): Promise<PlanAssignment[]> {
	const { data, error } = await supabase
		.from("api_key_plan_assignments")
		.select("*")
		.eq("plan_id", planId)
		.order("created_at", { ascending: false });

	if (error || !data) return [];
	return data as PlanAssignment[];
}

export async function removeAssignment(assignmentId: string): Promise<boolean> {
	const { error } = await supabase
		.from("api_key_plan_assignments")
		.delete()
		.eq("id", assignmentId);

	if (error) {
		console.error("[plan-service] removeAssignment error:", error);
		return false;
	}
	return true;
}

export async function deactivateAssignment(assignmentId: string): Promise<boolean> {
	const { error } = await supabase
		.from("api_key_plan_assignments")
		.update({ is_active: false, updated_at: new Date().toISOString() })
		.eq("id", assignmentId);

	if (error) {
		console.error("[plan-service] deactivateAssignment error:", error);
		return false;
	}
	return true;
}

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

	// Named tiers
	if (name.includes("enterprise")) return 500_000_000;
	if (name.includes("business")) return 150_000_000;
	if (name.includes("premium")) return 50_000_000;
	if (name.includes("pro")) return 15_000_000;
	if (name.includes("starter") || name.includes("basic") || name.includes("trial")) return 3_000_000;

	return 0;
}

// ---------------------------------------------------------------------------
// Get plan info for key-status display (strips OpusLive data)
// ---------------------------------------------------------------------------

export async function getPlanInfoForApiKey(apiKey: string): Promise<{
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
	isActive: boolean;
} | null> {
	const assignment = await getAssignmentByApiKey(apiKey);
	if (!assignment || !assignment.is_active) return null;

	const plan = assignment.plan;
	if (!plan.is_active) return null;

	return {
		planName: plan.name,
		displayName: assignment.custom_display_name || plan.display_name,
		badgeColor: assignment.custom_badge_color || plan.badge_color,
		description: plan.description,
		monthlyPrice: Number(plan.monthly_price),
		dailyTokenLimit: assignment.custom_daily_token_limit ?? plan.daily_token_limit,
		monthlyTokenLimit: assignment.custom_monthly_token_limit ?? plan.monthly_token_limit,
		features: plan.features,
		modelAccess: plan.model_access,
		priority: plan.priority,
		isActive: plan.is_active,
	};
}

// ---------------------------------------------------------------------------
// Activity Logging
// ---------------------------------------------------------------------------

export async function logActivity(entry: {
	action: string;
	entity_type: string;
	entity_id: string;
	admin_email?: string | null;
	admin_ip?: string | null;
	details?: Record<string, any>;
}): Promise<void> {
	try {
		await supabase.from("admin_activity_logs").insert({
			action: entry.action,
			entity_type: entry.entity_type,
			entity_id: entry.entity_id,
			admin_email: entry.admin_email ?? null,
			admin_ip: entry.admin_ip ?? null,
			details: entry.details ?? {},
		});
	} catch {
		// best-effort logging
	}
}

export async function getActivityLogs(options?: {
	action?: string;
	entity_type?: string;
	limit?: number;
	offset?: number;
}): Promise<ActivityLogEntry[]> {
	let query = supabase
		.from("admin_activity_logs")
		.select("*")
		.order("created_at", { ascending: false });

	if (options?.action) {
		query = query.eq("action", options.action);
	}
	if (options?.entity_type) {
		query = query.eq("entity_type", options.entity_type);
	}

	const { data, error } = await query.limit(options?.limit ?? 50).range(options?.offset ?? 0, (options?.limit ?? 50) - 1);

	if (error || !data) return [];
	return data as ActivityLogEntry[];
}

// ---------------------------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------------------------

export async function getPlanManagementStats(): Promise<{
	totalPlans: number;
	activePlans: number;
	totalAssignments: number;
	activeAssignments: number;
	recentAssignments: PlanAssignmentWithDetails[];
	recentActivity: ActivityLogEntry[];
}> {
	const plans = await getAllPlans();
	const assignments = await getAllAssignments();

	const recentAssignments = assignments.slice(0, 5);
	const recentActivity = await getActivityLogs({ limit: 10 });

	return {
		totalPlans: plans.length,
		activePlans: plans.filter((p) => p.is_active).length,
		totalAssignments: assignments.length,
		activeAssignments: assignments.filter((a) => a.is_active).length,
		recentAssignments,
		recentActivity,
	};
}
