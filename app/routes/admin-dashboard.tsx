import { useState, useCallback } from "react";
import { type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { useLoaderData } from "react-router";
import { verifyAdminSession } from "../../utils/admin-auth";
import { supabase } from "../../utils/supabase";
import { NavLink } from "react-router";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import { StatCard, Skeleton } from "~/components/admin/stat-card";
import { cn } from "@/lib/utils";
import {
	FiUsers,
	FiShoppingCart,
	FiCreditCard,
	FiKey,
	FiRefreshCw,
	FiBell,
	FiClock,
	FiUserPlus,
	FiCheckCircle,
	FiXCircle,
	FiActivity,
} from "react-icons/fi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const meta: MetaFunction = () => [{ title: "Dashboard | Admin | OpusZen" }];

interface DashboardStats {
	totalUsers: number;
	totalOrders: number;
	totalRevenue: number;
	totalApiKeys: number;
	usersChange: number;
	ordersChange: number;
	revenueChange: number;
	apiKeysChange: number;
}

interface RecentActivity {
	id: string;
	type: "user_signup" | "order_placed" | "payment_success" | "payment_failed" | "order_cancelled" | "order_refunded";
	message: string;
	meta: string;
	time: string;
	amount?: string;
}

interface GatewayStatus {
	status: "online" | "degraded" | "offline";
	latency: number;
	uptime: string;
	requestsToday: number;
	errorsToday: number;
}

interface ChartDataPoint {
	label: string;
	requests: number;
	users: number;
	revenue: number;
}

interface LoaderData {
	stats: DashboardStats;
	chartData: ChartDataPoint[];
	recentActivity: RecentActivity[];
	gatewayStatus: GatewayStatus;
	adminEmail: string;
	loading: boolean;
}

function startOfToday(): Date {
	return new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
}

function formatRelative(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "Just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
	user_signup: <FiUserPlus className="w-3.5 h-3.5" />,
	order_placed: <FiShoppingCart className="w-3.5 h-3.5" />,
	payment_success: <FiCheckCircle className="w-3.5 h-3.5" />,
	payment_failed: <FiXCircle className="w-3.5 h-3.5" />,
	order_cancelled: <FiXCircle className="w-3.5 h-3.5" />,
	order_refunded: <FiRefreshCw className="w-3.5 h-3.5" />,
};

const ACTIVITY_COLORS: Record<string, string> = {
	user_signup: "text-indigo-500 bg-indigo-500/10",
	order_placed: "text-blue-500 bg-blue-500/10",
	payment_success: "text-emerald-500 bg-emerald-500/10",
	payment_failed: "text-red-500 bg-red-500/10",
	order_cancelled: "text-zinc-500 bg-zinc-500/10",
	order_refunded: "text-violet-500 bg-violet-500/10",
};

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
	const adminCheck = await verifyAdminSession(request);

	// Fallback: if no server secret is configured, validate the Supabase session directly
	if (!adminCheck.isAdmin) {
		const cookieHeader = request.headers.get("Cookie") || request.headers.get("cookie") || "";
		const accessTokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
		if (accessTokenMatch) {
			try {
				const { data, error } = await supabase.auth.getUser(accessTokenMatch[1]);
				if (!error && data.user) {
					const role = (data.user as any).app_metadata?.role;
					if (role === "admin") {
						return buildLoaderData({ ...adminCheck, isAdmin: true, email: data.user.email ?? null, adminEmail: data.user.email ?? undefined });
					}
				}
			} catch {
				// fall through to redirect
			}
		}
		throw redirect("/auth/admin");
	}

	return buildLoaderData(adminCheck);
}

async function buildLoaderData(adminCheck: { isAdmin: boolean; email: string | null; adminEmail?: string }): Promise<LoaderData> {
	let users: Array<{ created_at: string }> = [];
	let orders: OrderRow[] = [];
	let apiKeysCount = 0;

	try {
		const { data: u } = await supabase.from("users").select("created_at").order("created_at", { ascending: true });
		if (u) users = u;
	} catch { /* ignore */ }

	try {
		const { data: o } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
		if (o) orders = o as OrderRow[];
	} catch { /* ignore */ }

	try {
		const { count } = await supabase.from("user_api_keys").select("*", { count: "exact", head: true });
		apiKeysCount = count ?? 0;
	} catch { /* ignore */ }

	// Fetch today's API request logs for real gateway stats
	const todayIso = startOfToday().toISOString();
	let apiLogs: Array<{ is_success: boolean; response_time_ms: number }> = [];
	try {
		const { data: logs } = await supabase
			.from("api_request_logs")
			.select("is_success, response_time_ms")
			.gte("created_at", todayIso);
		if (logs) apiLogs = logs;
	} catch { /* ignore */ }

	// Build 30-day chart data from real orders
	const today = startOfToday();
	const chartData: ChartDataPoint[] = [];
	for (let i = 29; i >= 0; i--) {
		const dayStart = new Date(today);
		dayStart.setDate(dayStart.getDate() - i);
		const dayEnd = new Date(dayStart);
		dayEnd.setDate(dayEnd.getDate() + 1);

		const dayOrders = orders.filter((o) => {
			const od = new Date(o.created_at);
			return od >= dayStart && od < dayEnd;
		});

		chartData.push({
			label: `${dayStart.toLocaleString("default", { month: "short" })} ${dayStart.getDate()}`,
			requests: dayOrders.length,
			users: users.filter((u) => {
				const ud = new Date(u.created_at);
				return ud >= dayStart && ud < dayEnd;
			}).length,
			revenue: dayOrders
				.filter((o) => o.status === "completed")
				.reduce((s, o) => s + Number(o.final_amount || 0), 0),
		});
	}

	// Derive stats
	const totalOrders = orders.length;
	const completedOrders = orders.filter((o) => o.status === "completed");
	const totalRevenue = completedOrders.reduce((s, o) => s + Number(o.final_amount || 0), 0);

	// Build recent activity from orders
	const recentActivity: RecentActivity[] = orders.slice(0, 20).map((o) => {
		const time = o.completed_at || o.created_at;
		switch (o.status) {
			case "completed":
				return {
					id: o.id,
					type: "payment_success",
					message: "Payment received",
					meta: `@${o.username} · ${o.plan_name}`,
					time,
					amount: new Intl.NumberFormat("en-IN", { style: "currency", currency: o.currency, maximumFractionDigits: 0 }).format(o.final_amount),
				};
			case "pending":
				return {
					id: o.id,
					type: "order_placed",
					message: "New order",
					meta: `@${o.username} · ${o.plan_name}`,
					time,
					amount: new Intl.NumberFormat("en-IN", { style: "currency", currency: o.currency, maximumFractionDigits: 0 }).format(o.final_amount),
				};
			case "failed":
				return {
					id: o.id,
					type: "payment_failed",
					message: "Payment failed",
					meta: `@${o.username} · ${o.plan_name}`,
					time,
				};
			case "cancelled":
				return {
					id: o.id,
					type: "order_cancelled",
					message: "Order cancelled",
					meta: `@${o.username} · ${o.plan_name}`,
					time,
				};
			case "refunded":
				return {
					id: o.id,
					type: "order_refunded",
					message: "Order refunded",
					meta: `@${o.username} · ${o.plan_name}`,
					time,
				};
			default:
				return {
					id: o.id,
					type: "order_placed",
					message: "Order updated",
					meta: `@${o.username} · ${o.plan_name}`,
					time,
				};
		}
	});

	// Gateway status — derived from real API request logs
	const gatewayRequestsToday = apiLogs.length;
	const gatewayErrorsToday = apiLogs.filter((l) => !l.is_success).length;
	const avgLatency = gatewayRequestsToday > 0
		? Math.round(apiLogs.reduce((s, l) => s + l.response_time_ms, 0) / gatewayRequestsToday)
		: 0;
	const gatewaySuccessRate = gatewayRequestsToday > 0
		? ((gatewayRequestsToday - gatewayErrorsToday) / gatewayRequestsToday * 100).toFixed(2)
		: "100.00";
	const gatewayStatus: GatewayStatus = {
		status: gatewayErrorsToday > gatewayRequestsToday * 0.5 ? "degraded" : "online",
		latency: avgLatency,
		uptime: `${gatewaySuccessRate}%`,
		requestsToday: gatewayRequestsToday,
		errorsToday: gatewayErrorsToday,
	};

	// Calculate changes (compare last 15d vs prior 15d)
	const now = today.getTime();
	const dayMs = 86400000;
	const recentUsers = users.filter((u) => Date.now() - new Date(u.created_at).getTime() < 15 * dayMs).length;
	const priorUsers = users.filter((u) => {
		const age = Date.now() - new Date(u.created_at).getTime();
		return age >= 15 * dayMs && age < 30 * dayMs;
	}).length;
	const usersChange = priorUsers > 0 ? Math.round(((recentUsers - priorUsers) / priorUsers) * 100) : 0;

	const recentOrderCount = orders.filter((o) => Date.now() - new Date(o.created_at).getTime() < 15 * dayMs).length;
	const priorOrderCount = orders.filter((o) => {
		const age = Date.now() - new Date(o.created_at).getTime();
		return age >= 15 * dayMs && age < 30 * dayMs;
	}).length;
	const ordersChange = priorOrderCount > 0 ? Math.round(((recentOrderCount - priorOrderCount) / priorOrderCount) * 100) : 0;

	const recentRevenue = orders
		.filter((o) => o.status === "completed" && Date.now() - new Date(o.created_at).getTime() < 15 * dayMs)
		.reduce((s, o) => s + Number(o.final_amount || 0), 0);
	const priorRevenue = orders
		.filter((o) => {
			const age = Date.now() - new Date(o.created_at).getTime();
			return o.status === "completed" && age >= 15 * dayMs && age < 30 * dayMs;
		})
		.reduce((s, o) => s + Number(o.final_amount || 0), 0);
	const revenueChange = priorRevenue > 0 ? Math.round(((recentRevenue - priorRevenue) / priorRevenue) * 100) : 0;

	const stats: DashboardStats = {
		totalUsers: users.length,
		totalOrders,
		totalRevenue: Math.round(totalRevenue),
		totalApiKeys: apiKeysCount,
		usersChange,
		ordersChange,
		revenueChange,
		apiKeysChange: 0,
	};

	return {
		stats,
		chartData,
		recentActivity,
		gatewayStatus,
		adminEmail: adminCheck.adminEmail || "",
		loading: false,
	};
}

interface OrderRow {
	id: string;
	created_at: string;
	completed_at: string | null;
	status: string;
	final_amount: number;
	currency: string;
	plan_name: string;
	username: string;
}

function CustomTooltip({ active, payload, label }: any) {
	if (!active || !payload?.length) return null;
	return (
		<div className="bg-card/95 dark:bg-card/90 backdrop-blur border border-border rounded-xl px-3 py-2.5 shadow-xl">
			<p className="text-xs font-semibold text-muted-foreground mb-1.5">{label}</p>
			{payload.map((entry: any, i: number) => (
				<div key={i} className="flex items-center gap-2 text-xs">
					<div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
					<span className="text-muted-foreground capitalize">{entry.name}:</span>
					<span className="font-semibold text-foreground">
						{entry.name === "Revenue (₹)"
							? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(entry.value)
							: entry.value.toLocaleString()}
					</span>
				</div>
			))}
		</div>
	);
}

export default function AdminDashboardRoute() {
	const { stats, chartData, recentActivity, gatewayStatus, adminEmail, loading } = useLoaderData<LoaderData>();
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [chartTab, setChartTab] = useState<"requests" | "users" | "revenue">("requests");
	const [refreshing, setRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		await new Promise((r) => setTimeout(r, 600));
		window.location.reload();
	}, []);

	const gradientId = `${chartTab}Grad`;
	const strokeColor = chartTab === "requests" ? "#6366f1" : chartTab === "users" ? "#34d399" : "#f59e0b";

	return (
		<div className="min-h-screen bg-background text-foreground">
			<AdminSidebar
				collapsed={sidebarCollapsed}
				onToggle={() => setSidebarCollapsed((v) => !v)}
				adminEmail={adminEmail || undefined}
			/>

			{/* Main content area with left margin for sidebar */}
			<main
				className={`
					min-h-screen transition-all duration-300 ease-in-out
					${sidebarCollapsed ? "ml-[68px]" : "ml-[220px]"}
				`}
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="space-y-6">
						{/* Header */}
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<div>
								<div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-semibold text-emerald-600 uppercase tracking-wider">
									<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
									{gatewayStatus.status === "online" ? "All Systems Operational" : "Attention Needed"}
								</div>
								<h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
									Overview Dashboard
								</h1>
								<p className="text-muted-foreground text-sm mt-1">
									Real-time analytics and system metrics
								</p>
							</div>
							<div className="flex items-center gap-2">
								<div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-[11px] text-muted-foreground">
									<FiClock className="w-3 h-3" />
									Updated just now
								</div>
								<button
									onClick={handleRefresh}
									className={cn(
										"flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/50 hover:bg-muted/50 transition-all cursor-pointer text-muted-foreground",
										refreshing && "pointer-events-none",
									)}
								>
									<FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
									Refresh
								</button>
							</div>
						</div>

						{/* Stat Cards */}
						<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
							<StatCard
								title="Total Users"
								value={loading ? "—" : stats.totalUsers.toLocaleString()}
								change={stats.usersChange}
								icon={<FiUsers className="w-5 h-5" />}
								iconBg="bg-indigo-500/10"
								iconColor="text-indigo-500"
								loading={loading}
							/>
							<StatCard
								title="Total Orders"
								value={loading ? "—" : stats.totalOrders.toLocaleString()}
								change={stats.ordersChange}
								icon={<FiShoppingCart className="w-5 h-5" />}
								iconBg="bg-emerald-500/10"
								iconColor="text-emerald-500"
								loading={loading}
							/>
							<StatCard
								title="Revenue"
								value={loading ? "—" : `₹${stats.totalRevenue.toLocaleString()}`}
								change={stats.revenueChange}
								icon={<FiCreditCard className="w-5 h-5" />}
								iconBg="bg-amber-500/10"
								iconColor="text-amber-500"
								loading={loading}
							/>
							<StatCard
								title="API Keys"
								value={loading ? "—" : stats.totalApiKeys.toLocaleString()}
								change={stats.apiKeysChange}
								icon={<FiKey className="w-5 h-5" />}
								iconBg="bg-violet-500/10"
								iconColor="text-violet-500"
								loading={loading}
							/>
						</div>

						{/* Charts Row: Area Chart + Activity Feed */}
						<div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
							{/* Main Chart */}
							<div className="xl:col-span-2 rounded-2xl border border-border bg-card p-5">
								<div className="flex items-center justify-between mb-4">
									<div>
										<h3 className="text-sm font-bold text-foreground">Request Volume</h3>
										<p className="text-[11px] text-muted-foreground mt-0.5">
											{new Intl.NumberFormat("en-IN").format(chartData.reduce((s, d) => s + d.requests, 0))} requests in the last 30 days
										</p>
									</div>
									<div className="flex p-0.5 rounded-lg bg-muted/50 border border-border/50">
										{(["requests", "users", "revenue"] as const).map((tab) => (
											<button
												key={tab}
												onClick={() => setChartTab(tab)}
												className={cn(
													"px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
													chartTab === tab
														? "bg-background shadow-sm text-foreground"
														: "text-muted-foreground hover:text-foreground",
												)}
											>
												{tab.charAt(0).toUpperCase() + tab.slice(1)}
											</button>
										))}
									</div>
								</div>
								<div className="h-[260px]">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
											<defs>
												<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
													<stop offset="5%" stopColor={strokeColor} stopOpacity={0.35} />
													<stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
												</linearGradient>
											</defs>
											<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
											<XAxis
												dataKey="label"
												tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
												tickLine={false}
												axisLine={false}
												interval={4}
											/>
											<YAxis
												tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
												tickLine={false}
												axisLine={false}
												tickFormatter={(v) => chartTab === "revenue" ? `₹${v >= 1000 ? (v / 1000).toFixed(0) + "K" : v}` : v.toLocaleString()}
											/>
											<Tooltip content={<CustomTooltip />} />
											<Bar
												dataKey={chartTab}
												name={chartTab === "revenue" ? "Revenue (₹)" : chartTab.charAt(0).toUpperCase() + chartTab.slice(1)}
												fill={`url(#${gradientId})`}
												stroke={strokeColor}
												strokeWidth={1.5}
												radius={[3, 3, 0, 0]}
											/>
										</BarChart>
									</ResponsiveContainer>
								</div>
							</div>

							{/* Recent Activity Feed */}
							<div className="rounded-2xl border border-border bg-card p-5 flex flex-col">
								<div className="flex items-center justify-between mb-4">
									<div>
										<h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
										<p className="text-[11px] text-muted-foreground mt-0.5">Latest order events</p>
									</div>
									<span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-500">
										<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
										Live
									</span>
								</div>
								<div className="flex-1 space-y-1 max-h-[280px] overflow-y-auto custom-scrollbar">
									{recentActivity.length === 0 ? (
										<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
											<FiActivity className="w-8 h-8 opacity-30 mb-2" />
											<p className="text-xs">No activity yet</p>
										</div>
									) : (
										recentActivity.map((item) => (
											<div
												key={item.id}
												className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/20 transition-colors"
											>
												<div className={cn("shrink-0 w-7 h-7 rounded-lg flex items-center justify-center", ACTIVITY_COLORS[item.type] || "text-muted-foreground bg-muted/50")}>
													{ACTIVITY_ICONS[item.type] || <FiBell className="w-3.5 h-3.5" />}
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex items-center justify-between">
														<p className="text-xs font-medium text-foreground">{item.message}</p>
														{item.amount && (
															<span className="text-[11px] font-semibold text-emerald-500 shrink-0 ml-2">{item.amount}</span>
														)}
													</div>
													<p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.meta}</p>
												</div>
												<span className="shrink-0 text-[10px] text-muted-foreground/70 font-medium ml-1">
													{formatRelative(item.time)}
												</span>
											</div>
										))
									)}
								</div>
							</div>
						</div>

						{/* Gateway Status */}
						<div className="rounded-2xl border border-border bg-card p-5">
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-2">
									<span className={cn("w-2 h-2 rounded-full", gatewayStatus.status === "online" ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
									<h3 className="text-sm font-bold text-foreground">API Gateway</h3>
								</div>
								<span className={cn("text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider", gatewayStatus.status === "online" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
									{gatewayStatus.status}
								</span>
							</div>
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
									{[
										{ label: "Latency", value: `${gatewayStatus.latency}ms`, color: "text-foreground", subtitle: "Computed from orders" },
										{ label: "Uptime", value: gatewayStatus.uptime, color: "text-emerald-500", subtitle: "Target SLA" },
										{ label: "Requests Today", value: gatewayStatus.requestsToday.toLocaleString(), color: "text-foreground", subtitle: "From orders" },
										{ label: "Errors Today", value: gatewayStatus.errorsToday.toString(), color: gatewayStatus.errorsToday > 0 ? "text-red-500" : "text-emerald-500", subtitle: "Failed orders" },
									].map((g) => (
										<div key={g.label} className="p-3 rounded-xl bg-muted/30 border border-border/50">
											<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{g.label}</p>
											<p className={`text-lg font-bold mt-0.5 tracking-tight ${g.color}`}>{g.value}</p>
											<p className="text-[9px] text-muted-foreground/70 mt-0.5">{g.subtitle}</p>
										</div>
									))}
								</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
