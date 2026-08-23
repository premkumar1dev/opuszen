/**
 * Shared core logic for user dashboard data.
 * Accepts a Supabase client as a parameter so both server and client
 * can reuse the same data-fetching and transformation code.
 */

// Supabase client type (compatible with both server and client clients)
export type SupabaseClient = any;

export interface UserDashboardStats {
	totalKeys: number;
	activeKeys: number;
	totalRequests: number;
	avgLatency: number;
	errorRate: number;
	tokensUsed: number;
	creditsUsed: number;
	successRate: number;
}

export interface UserApiKeyInfo {
	id: string;
	name: string;
	status: string;
	totalRequests: number;
	tokensUsed: number;
	tokensLimit: number;
	remainingCredits: number;
	allocatedCredits: number;
	usagePercent: number;
	lastUsedAt: string | null;
	createdAt: string;
	expiryDate: string | null;
	rateLimit: number;
	planName?: string;
}

export interface UserActivityEntry {
	id: string;
	createdAt: string;
	provider: string;
	model: string;
	totalTokens: number;
	creditsUsed: number;
	responseTimeMs: number;
	httpStatus: number;
	isSuccess: boolean;
	errorMessage?: string;
}

export interface UserCreditEntry {
	id: string;
	action: string;
	amount: number;
	balanceAfter: number;
	description: string;
	createdAt: string;
}

export interface UserChartDataPoint {
	date: string;
	requests: number;
	tokens: number;
	credits: number;
	errors: number;
}

export interface UserDashboardData {
	stats: UserDashboardStats;
	keys: UserApiKeyInfo[];
	recentActivity: UserActivityEntry[];
	creditHistory: UserCreditEntry[];
	chartData: UserChartDataPoint[];
}

export async function getUserDashboardData(
	supabase: SupabaseClient,
	userId: string,
	days = 30
): Promise<UserDashboardData> {
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - days);
	const startDateStr = startDate.toISOString().split("T")[0];

	// Fetch all data in parallel
	const [keysResult, logsResult, creditResult, usageResult] = await Promise.all([
		supabase.from("user_api_keys").select("id, name, status, total_requests, tokens_used, tokens_limit, remaining_credits, allocated_credits, last_used_at, created_at, expiry_date, rate_limit, plan_name, user_id").eq("user_id", userId).order("created_at", { ascending: false }),
		supabase.from("api_request_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
		supabase.from("user_credit_history").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
		supabase.from("usage_statistics").select("*").gte("date", startDateStr).order("date", { ascending: true }),
	]);

	const keys = (keysResult.data ?? []) as any[];
	const logs = (logsResult.data ?? []) as any[];
	const creditHistory = (creditResult.data ?? []) as any[];
	const usageStats = (usageResult.data ?? []) as any[];

	// Compute stats from keys
	const totalKeys = keys.length;
	const activeKeys = keys.filter((k) => k.status === "active").length;
	const totalRequests = keys.reduce((s, k) => s + (k.total_requests || 0), 0);

	// Compute stats from logs
	const successCount = logs.filter((l) => l.is_success).length;
	const errorCount = logs.filter((l) => !l.is_success).length;
	const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 100;
	const errorRate = logs.length > 0 ? ((errorCount / logs.length) * 100).toFixed(1) : "0.0";

	const avgLatency =
		logs.length > 0
			? Math.round(logs.reduce((s, l) => s + (l.response_time_ms || 0), 0) / logs.length)
			: 0;

	const tokensUsed = keys.reduce((s, k) => s + (k.used_credits || 0), 0);
	const creditsUsed = keys.reduce((s, k) => s + (k.remaining_credits || 0), 0);

	// Map keys to display format
	const mappedKeys: UserApiKeyInfo[] = keys.map((k) => {
		const tokensLimit = k.allocated_credits > 0 ? k.allocated_credits * 1000 : 10_000_000;
		const usagePercent =
			k.allocated_credits > 0
				? Math.round((k.used_credits / k.allocated_credits) * 100)
				: Math.min(100, (k.total_requests || 0) / 100);
		return {
			id: k.id,
			name: k.name,
			status: k.status,
			totalRequests: k.total_requests || 0,
			tokensUsed: k.used_credits || 0,
			tokensLimit,
			remainingCredits: k.remaining_credits || 0,
			allocatedCredits: k.allocated_credits || 0,
			usagePercent: Math.min(100, usagePercent),
			lastUsedAt: k.last_used,
			createdAt: k.created_at,
			expiryDate: k.expiry_date,
			rateLimit: k.rate_limit || 60,
			planName: k.name,
		};
	});

	// Map recent activity
	const recentActivity: UserActivityEntry[] = logs.slice(0, 20).map((l) => ({
		id: l.id,
		createdAt: l.created_at,
		provider: l.provider || "Unknown",
		model: l.model || "unknown",
		totalTokens: l.total_tokens || 0,
		creditsUsed: l.credits_used || 0,
		responseTimeMs: l.response_time_ms || 0,
		httpStatus: l.http_status || 0,
		isSuccess: l.is_success,
		errorMessage: l.error_message || undefined,
	}));

	// Map credit history
	const mappedCredits: UserCreditEntry[] = creditHistory.map((c) => ({
		id: c.id,
		action: c.action,
		amount: parseFloat(c.amount || 0),
		balanceAfter: parseFloat(c.balance_after || 0),
		description: c.description || "",
		createdAt: c.created_at,
	}));

	// Build chart data from usage stats joined with error counts from logs
	const errorByDate = new Map<string, number>();
	for (const log of logs) {
		const d = log.created_at.split("T")[0];
		if (d >= startDateStr) {
			errorByDate.set(d, (errorByDate.get(d) ?? 0) + (log.is_success ? 0 : 1));
		}
	}

	const chartData: UserChartDataPoint[] = usageStats.map((u) => ({
		date: u.date,
		requests: u.total_requests || 0,
		tokens: u.total_tokens || 0,
		credits: parseFloat(u.total_credits || 0),
		errors: errorByDate.get(u.date) ?? 0,
	}));

	// Fill in dates that have logs but no usage stats (for the line chart)
	if (logs.length > 0) {
		for (const log of logs) {
			const d = log.created_at.split("T")[0];
			if (d >= startDateStr) {
				if (!chartData.find((c) => c.date === d)) {
					const dayLogs = logs.filter((l) => l.created_at.startsWith(d));
					const dayErrors = dayLogs.filter((l) => !l.is_success).length;
					chartData.push({
						date: d,
						requests: dayLogs.length,
						tokens: dayLogs.reduce((s, l) => s + (l.total_tokens || 0), 0),
						credits: dayLogs.reduce((s, l) => s + (l.credits_used || 0), 0),
						errors: dayErrors,
					});
				}
			}
		}
		chartData.sort((a, b) => a.date.localeCompare(b.date));
	}

	return {
		stats: {
			totalKeys,
			activeKeys,
			totalRequests,
			avgLatency,
			errorRate: parseFloat(errorRate),
			tokensUsed,
			creditsUsed,
			successRate,
		},
		keys: mappedKeys,
		recentActivity,
		creditHistory: mappedCredits,
		chartData,
	};
}
