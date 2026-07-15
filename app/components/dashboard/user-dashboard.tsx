import { useState, useEffect, useCallback } from "react";
import { NavLink } from "react-router";
import {
	FiActivity,
	FiZap,
	FiClock,
	FiExternalLink,
	FiRefreshCw,
} from "react-icons/fi";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
} from "recharts";
import { DashboardSidebar } from "./dashboard-sidebar";
import { supabase } from "../../utils/supabase";
import { useDashboardTheme } from "../../utils/theme";
import type {
	UserDashboardData,
	UserApiKeyInfo,
	UserActivityEntry,
	UserChartDataPoint,
} from "../../utils/user-dashboard-service";

/* ───────── types ───────── */
interface Stats {
	totalKeys: number;
	activeKeys: number;
	totalRequests: number;
	avgLatency: number;
	errorRate: number;
	tokensUsed: number;
	creditsUsed: number;
	successRate: number;
}
interface UsageDay {
	date: string;
	requests: number;
	tokens: number;
	credits: number;
	errors: number;
}
interface ModelUsage {
	name: string;
	value: number;
	color: string;
}
interface ApiKeyRow {
	id: string;
	name: string;
	status: string;
	totalRequests: number;
	tokensUsed: number;
	tokensLimit: number;
	usagePercent: number;
	lastUsedAt: string | null;
}
interface RequestLog {
	id: string;
	time: string;
	model: string;
	status: number;
	latencyMs: number;
	tokensUsed: number;
}
interface Provider {
	name: string;
	status: "online" | "degraded" | "offline";
	successRate: number;
	latency: number;
	keys: number;
	activeKeys: number;
}

/* ───────── helpers ───────── */
function fmt(n: number): string {
	if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
	if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
	return String(n);
}
function timeAgo(iso: string): string {
	const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
	if (m < 1) return "Just now";
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

/* ───────── chart tooltip ───────── */
function ChartTooltip({ active, payload, label }: any) {
	if (!active || !payload?.length) return null;
	return (
		<div className="dashboard-modal-bg dashboard-card border rounded-xl px-4 py-3 shadow-2xl">
			<p className="text-xs text-[var(--dashboard-text-secondary)] mb-2 font-medium">{label}</p>
			{payload.map((e: any, i: number) => (
				<div key={i} className="flex items-center gap-2 text-xs">
					<span className="w-2 h-2 rounded-full" style={{ background: e.color }} />
					<span className="text-[var(--dashboard-text-secondary)]">{e.name}:</span>
					<span className="text-[var(--dashboard-text)] font-semibold font-mono">{typeof e.value === "number" ? e.value.toLocaleString() : e.value}</span>
				</div>
			))}
		</div>
	);
}

/* ───────── stat card ───────── */
function Card({ title, value, subtitle, icon: Icon, color = "indigo", trend }: { title: string; value: string | number; subtitle: string; icon: any; color?: string; trend?: { value: number; label: string } }) {
	const colors: Record<string, string> = {
		indigo: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
		emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
		violet: "text-violet-500 bg-violet-500/10 border-violet-500/20",
		amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
	};
	const c = colors[color] || colors.indigo;
	return (
		<div className="dashboard-card p-4 sm:p-5 rounded-2xl dashboard-card-hover transition-all duration-200">
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-1 min-w-0">
					<p className="text-[10px] sm:text-xs font-medium text-[var(--dashboard-text-muted)] uppercase tracking-wider">{title}</p>
					<p className="text-xl sm:text-2xl font-bold text-[var(--dashboard-text)] tracking-tight">{typeof value === "number" ? value.toLocaleString() : value}</p>
					<p className="text-[11px] text-[var(--dashboard-text-muted)]">{subtitle}</p>
					{trend && (
						<div className={`flex items-center gap-1 text-[11px] font-medium ${trend.value >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
							<span>{trend.value >= 0 ? "↑" : "↓"}</span>
							<span>{Math.abs(trend.value)}%</span>
							<span className="text-[var(--dashboard-text-muted)]">{trend.label}</span>
						</div>
					)}
				</div>
				<div className={`p-2 rounded-xl border ${c} shrink-0`}>
					<Icon className="w-4 h-4 sm:w-5 sm:h-5" />
				</div>
			</div>
		</div>
	);
}

/* ───────── build model usage from real activity ───────── */
function buildModelUsage(activity: UserActivityEntry[]): ModelUsage[] {
	if (!activity || activity.length === 0) return [];
	const map = new Map<string, number>();
	for (const a of activity) {
		const name = a.model || "unknown";
		map.set(name, (map.get(name) || 0) + 1);
	}
	const colors = ["#6366f1", "#a855f7", "#10b981", "#f59e0b", "#3b82f6", "#71717a"];
	let i = 0;
	return Array.from(map.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 6)
		.map(([name, value]) => ({
			name: name.length > 25 ? name.slice(0, 22) + "..." : name,
			value,
			color: colors[i++ % colors.length],
		}));
}

/* ───────── build provider health from real activity ───────── */
function buildProviders(activity: UserActivityEntry[]): Provider[] {
	if (!activity || activity.length === 0) return [];
	const map = new Map<string, { total: number; success: number; latencies: number[] }>();
	for (const a of activity) {
		const p = a.provider || "unknown";
		if (!map.has(p)) map.set(p, { total: 0, success: 0, latencies: [] });
		const entry = map.get(p)!;
		entry.total++;
		if (a.isSuccess) entry.success++;
		if (a.responseTimeMs > 0) entry.latencies.push(a.responseTimeMs);
	}
	return Array.from(map.entries()).map(([name, data]) => {
		const successRate = data.total > 0 ? Math.round((data.success / data.total) * 100) : 100;
		const avgLatency = data.latencies.length > 0
			? Math.round(data.latencies.reduce((s, l) => s + l, 0) / data.latencies.length)
			: 0;
		const status: "online" | "degraded" | "offline" =
			successRate >= 95 ? "online" : successRate >= 80 ? "degraded" : "offline";
		return {
			name,
			status,
			successRate,
			latency: avgLatency,
			keys: 1,
			activeKeys: successRate >= 80 ? 1 : 0,
		};
	});
}

/* ───────── main ───────── */
export default function UserDashboard({
	dashboardData: initialDashboardData,
	userEmail: initialEmail,
	userName,
}: {
	dashboardData?: UserDashboardData;
	userEmail?: string;
	userName?: string;
}) {
	const { theme, toggleTheme } = useDashboardTheme();
	const [collapsed, setCollapsed] = useState(false);
	const [timeRange, setTimeRange] = useState("30d");
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [user, setUser] = useState<any>(null);
	const [loading, setLoading] = useState(false);

	const [stats, setStats] = useState<Stats>(() => {
		if (initialDashboardData) return initialDashboardData.stats;
		return { totalKeys: 0, activeKeys: 0, totalRequests: 0, avgLatency: 0, errorRate: 0, tokensUsed: 0, creditsUsed: 0, successRate: 100 };
	});
	const [keys, setKeys] = useState<ApiKeyRow[]>(() => {
		if (!initialDashboardData) return [];
		return initialDashboardData.keys.map((k: UserApiKeyInfo) => ({
			id: k.id,
			name: k.name,
			status: k.status,
			totalRequests: k.totalRequests,
			tokensUsed: k.tokensUsed,
			tokensLimit: k.tokensLimit,
			usagePercent: k.usagePercent,
			lastUsedAt: k.lastUsedAt,
		}));
	});
	const [activity, setActivity] = useState<UserActivityEntry[]>(() =>
		initialDashboardData ? initialDashboardData.recentActivity : []
	);
	const [chartData, setChartData] = useState<UserChartDataPoint[]>(() =>
		initialDashboardData ? initialDashboardData.chartData : []
	);

	// Sync local state when SSR data arrives (or changes)
	useEffect(() => {
		if (initialDashboardData) {
			setStats(initialDashboardData.stats);
			setKeys(
				initialDashboardData.keys.map((k) => ({
					id: k.id,
					name: k.name,
					status: k.status,
					totalRequests: k.totalRequests,
					tokensUsed: k.tokensUsed,
					tokensLimit: k.tokensLimit,
					usagePercent: k.usagePercent,
					lastUsedAt: k.lastUsedAt,
				}))
			);
			setActivity(initialDashboardData.recentActivity);
			setChartData(initialDashboardData.chartData);
		}
	}, [initialDashboardData]);

	// Fallback: fetch user + data on client when no SSR data
	useEffect(() => {
		if (!user) {
			supabase.auth.getUser().then(async ({ data }) => {
				const currentUser = data.user;
				setUser(currentUser);
				if (currentUser) {
					try {
						const { getUserDashboardData } = await import("../../utils/user-dashboard-service.client");
						const data = await getUserDashboardData(currentUser.id, 30);
						setStats(data.stats);
						setKeys(
							data.keys.map((k) => ({
								id: k.id,
								name: k.name,
								status: k.status,
								totalRequests: k.totalRequests,
								tokensUsed: k.tokensUsed,
								tokensLimit: k.tokensLimit,
								usagePercent: k.usagePercent,
								lastUsedAt: k.lastUsedAt,
							}))
						);
						setActivity(data.recentActivity);
						setChartData(data.chartData);
					} catch (err) {
						console.error("[dashboard] Initial load failed:", err);
					}
				}
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			const { data: { user: currentUser } } = await supabase.auth.getUser();
			if (!currentUser) { setLoading(false); return; }
			// Lazy import service to avoid bundling server-only code on client
			const { getUserDashboardData } = await import("../../utils/user-dashboard-service.client");
			const data = await getUserDashboardData(currentUser.id, 30);
			setStats(data.stats);
			setKeys(
				data.keys.map((k) => ({
					id: k.id,
					name: k.name,
					status: k.status,
					totalRequests: k.totalRequests,
					tokensUsed: k.tokensUsed,
					tokensLimit: k.tokensLimit,
					usagePercent: k.usagePercent,
					lastUsedAt: k.lastUsedAt,
				}))
			);
			setActivity(data.recentActivity);
			setChartData(data.chartData);
		} catch (err) {
			console.error("[dashboard] Refresh failed:", err);
		}
		setLoading(false);
	}, []);

	// Build derived data from real stats
	const models = buildModelUsage(activity);
	const providers = buildProviders(activity);

	const filtered: UsageDay[] = chartData
		.slice(timeRange === "7d" ? -7 : timeRange === "90d" ? -90 : -30)
		.map((d) => ({
			date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
			requests: d.requests,
			tokens: d.tokens,
			credits: d.credits,
			errors: d.errors,
		}));

	const totalAllocated = keys.reduce((s, k) => s + (k.tokensLimit || 0), 0);
	const tokPct = totalAllocated > 0 ? Math.min(100, (stats.tokensUsed / totalAllocated) * 100) : 0;
	const credPct = stats.creditsUsed > 0 ? Math.min(100, stats.creditsUsed) : 0;
	const todayReqs = chartData.length > 0 ? chartData[chartData.length - 1].requests : 0;

	// Transform activity into log format for display
	const logs: RequestLog[] = activity.slice(0, 15).map((a) => ({
		id: a.id,
		time: a.createdAt,
		model: a.model,
		status: a.httpStatus,
		latencyMs: a.responseTimeMs,
		tokensUsed: a.totalTokens,
	}));

	const displayUser = initialEmail || user?.email;

	return (
		<div className="dashboard flex min-h-screen">
			{/* Overlay */}
			{sidebarOpen && <div className="fixed inset-0 z-[55] dashboard-overlay backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />}

			{/* Mobile sidebar */}
			<div className={`fixed top-0 left-0 z-[60] h-full md:hidden transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
				<DashboardSidebar collapsed={false} onToggle={() => setSidebarOpen(false)} userEmail={displayUser} theme={theme} onThemeToggle={toggleTheme} />
			</div>

			{/* Desktop sidebar — fixed, out of flow */}
			<div className="hidden md:block">
				<DashboardSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} userEmail={displayUser} theme={theme} onThemeToggle={toggleTheme} />
			</div>

			{/* Main */}
			<main className={`flex-1 min-h-screen transition-all duration-300 ${collapsed ? "md:ml-[68px]" : "md:ml-[240px]"}`}>
				<header className="sticky top-0 z-40 border-b border-[var(--dashboard-border)]" style={{ backgroundColor: `color-mix(in srgb, var(--dashboard-bg) 80%, transparent)`, WebkitBackdropFilter: "saturate(180%) blur(8px)", backdropFilter: "saturate(180%) blur(8px)" }}>
					<div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">
						<div className="flex items-center gap-3">
							<button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--dashboard-nav-hover)] text-[var(--dashboard-text-secondary)] transition-colors" aria-label="Open menu">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
							</button>
							<div>
								<h1 className="text-sm font-semibold text-[var(--dashboard-text)]">Dashboard</h1>
								<p className="text-[11px] text-[var(--dashboard-text-muted)] hidden sm:block">
									{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<button onClick={refresh} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] transition-all disabled:opacity-50 cursor-pointer">
								<FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
								<span className="hidden sm:inline">Refresh</span>
							</button>
							{stats.activeKeys > 0 && (
								<span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--dashboard-text-secondary)]">
									<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
									All Systems Operational
								</span>
							)}
						</div>
					</div>
				</header>

				<div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px]">
					{/* Welcome */}
					<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
						<div>
							<h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--dashboard-text)] tracking-tight">
								Welcome back{userName ? `, ${userName}` : displayUser ? `, ${displayUser.split("@")[0]}` : ""}
							</h2>
							<p className="text-sm text-[var(--dashboard-text-secondary)] mt-1">Here's what's happening with your OpusZen API gateway today.</p>
						</div>
						<div className="flex items-center gap-1.5 bg-[var(--dashboard-input-bg)] p-1 rounded-xl border border-[var(--dashboard-border)] w-fit">
							{["7d", "30d", "90d"].map((r) => (
								<button key={r} onClick={() => setTimeRange(r)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${timeRange === r ? "bg-indigo-500 text-white shadow-sm" : "text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-text)]"}`}>
									{r}
								</button>
							))}
						</div>
					</div>

					{/* Stat cards */}
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
						<Card title="Total Requests" value={fmt(stats.totalRequests)} subtitle={`${fmt(todayReqs)} today`} icon={FiActivity} color="indigo" />
						<Card title="API Keys" value={`${stats.activeKeys}/${stats.totalKeys}`} subtitle="Active / Total" icon={FiClock} color="emerald" />
						<Card title="Avg Latency" value={`${stats.avgLatency}ms`} subtitle="Response time" icon={FiZap} color="violet" />
						<Card title="Success Rate" value={`${stats.successRate}%`} subtitle={`${stats.errorRate}% error rate`} icon={FiActivity} color={stats.successRate > 95 ? "emerald" : "amber"} />
					</div>

					{/* Usage bars */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
						<div className="dashboard-card p-4 sm:p-5 rounded-2xl">
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-xs sm:text-sm font-semibold text-[var(--dashboard-text)]">Token Usage</h3>
								<span className="text-[11px] text-[var(--dashboard-text-muted)] font-mono">{fmt(stats.tokensUsed)} used</span>
							</div>
							<div className="w-full bg-[var(--dashboard-input-bg)] rounded-full h-2 overflow-hidden">
								<div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500" style={{ width: `${tokPct}%` }} />
							</div>
							<div className="mt-2 text-[11px] text-[var(--dashboard-text-muted)]">
								{tokPct.toFixed(1)}% of allocated capacity
							</div>
						</div>
						<div className="dashboard-card p-4 sm:p-5 rounded-2xl">
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-xs sm:text-sm font-semibold text-[var(--dashboard-text)]">Credits Used</h3>
								<span className="text-[11px] text-[var(--dashboard-text-muted)] font-mono">{fmt(stats.creditsUsed)} credits</span>
							</div>
							<div className="w-full bg-[var(--dashboard-input-bg)] rounded-full h-2 overflow-hidden">
								<div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" style={{ width: `${credPct}%` }} />
							</div>
							<div className="mt-2 text-[11px] text-[var(--dashboard-text-muted)]">
								Total credits consumed across all keys
							</div>
						</div>
					</div>

					{/* Charts row */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
						{/* Request volume */}
						<div className="lg:col-span-2 dashboard-card p-4 sm:p-5 rounded-2xl">
							<div className="flex items-center justify-between mb-4">
								<div>
									<h3 className="text-xs sm:text-sm font-semibold text-[var(--dashboard-text)]">Request Volume</h3>
									<p className="text-[11px] text-[var(--dashboard-text-muted)]">Daily API requests & errors</p>
								</div>
								<div className="hidden sm:flex items-center gap-4 text-[11px]">
									<span className="flex items-center gap-1.5 text-[var(--dashboard-text-secondary)]"><span className="w-2.5 h-0.5 rounded-full bg-indigo-500" /> Requests</span>
									<span className="flex items-center gap-1.5 text-[var(--dashboard-text-secondary)]"><span className="w-2.5 h-0.5 rounded-full bg-rose-500" /> Errors</span>
								</div>
							</div>
							{filtered.length > 0 ? (
								<ResponsiveContainer width="100%" height={200}>
									<LineChart data={filtered}>
										<defs>
											<linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
											<linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} /><stop offset="100%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
										</defs>
										<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
										<XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} tickLine={false} tickMargin={8} />
										<YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
										<Tooltip content={<ChartTooltip />} />
										<Line type="monotone" dataKey="requests" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#6366f1", stroke: "var(--dashboard-bg)", strokeWidth: 2 }} fill="url(#rg)" />
										<Line type="monotone" dataKey="errors" stroke="#f43f5e" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: "#f43f5e", stroke: "var(--dashboard-bg)", strokeWidth: 2 }} fill="url(#eg)" />
									</LineChart>
								</ResponsiveContainer>
							) : (
								<div className="flex flex-col items-center justify-center h-[200px] text-[var(--dashboard-text-muted)]">
									<p className="text-xs">No request data yet. Start making API calls to see your activity.</p>
								</div>
							)}
						</div>

						{/* Model distribution */}
						<div className="dashboard-card p-4 sm:p-5 rounded-2xl">
							<h3 className="text-xs sm:text-sm font-semibold text-[var(--dashboard-text)]">Model Distribution</h3>
							<p className="text-[11px] text-[var(--dashboard-text-muted)] mb-4">Requests by model</p>
							{models.length > 0 ? (
								<>
									<ResponsiveContainer width="100%" height={160}>
										<PieChart>
											<Pie data={models} cx="50%" cy="50%" innerRadius={40} outerRadius="75%" paddingAngle={2} dataKey="value" stroke="none">
												{models.map((e, i) => <Cell key={i} fill={e.color} />)}
											</Pie>
											<Tooltip content={<ChartTooltip />} />
										</PieChart>
									</ResponsiveContainer>
									<div className="space-y-1.5 mt-2">
										{models.slice(0, 4).map((m) => (
											<div key={m.name} className="flex items-center justify-between text-xs">
												<div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} /><span className="text-[var(--dashboard-text-secondary)] truncate">{m.name}</span></div>
												<span className="text-[var(--dashboard-text-muted)] font-mono text-[11px]">{fmt(m.value)}</span>
											</div>
										))}
									</div>
								</>
							) : (
								<div className="flex flex-col items-center justify-center h-[200px] text-[var(--dashboard-text-muted)]">
									<p className="text-xs">No model data yet</p>
								</div>
							)}
						</div>
					</div>

					{/* Providers + Account summary */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
						<div className="lg:col-span-2 dashboard-card p-4 sm:p-5 rounded-2xl">
							<h3 className="text-xs sm:text-sm font-semibold text-[var(--dashboard-text)]">Provider Health</h3>
							<p className="text-[11px] text-[var(--dashboard-text-muted)] mb-4">Based on your recent requests</p>
							{providers.length > 0 ? (
								<div className="space-y-2.5">
									{providers.map((p) => (
										<div key={p.name} className="p-3 rounded-xl bg-[var(--dashboard-input-bg)] border border-[var(--dashboard-border)]">
											<div className="flex items-center justify-between mb-1.5">
												<span className="text-xs font-medium text-[var(--dashboard-text-secondary)]">{p.name}</span>
												<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === "online" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : p.status === "degraded" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"}`}>
													<span className={`w-1 h-1 rounded-full ${p.status === "online" ? "bg-emerald-500" : p.status === "degraded" ? "bg-amber-500" : "bg-rose-500"}`} />
													{p.status}
												</span>
											</div>
											<div className="flex items-center justify-between text-[11px] text-[var(--dashboard-text-muted)]">
												<span>{p.activeKeys}/{p.keys} active</span>
												<span className="font-mono">{p.latency}ms</span>
												<span className="font-mono">{p.successRate}%</span>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center h-[140px] text-[var(--dashboard-text-muted)]">
									<p className="text-xs">No provider data yet. Make some API requests to see stats.</p>
								</div>
							)}
						</div>

						<div className="dashboard-card p-4 sm:p-5 rounded-2xl space-y-4">
							<h3 className="text-xs sm:text-sm font-semibold text-[var(--dashboard-text)]">Account Summary</h3>
							<div className="space-y-3">
								<div className="flex items-center justify-between text-xs">
									<span className="text-[var(--dashboard-text-muted)]">Total API Keys</span>
									<span className="text-[var(--dashboard-text)] font-semibold">{stats.totalKeys}</span>
								</div>
								<div className="flex items-center justify-between text-xs">
									<span className="text-[var(--dashboard-text-muted)]">Active Keys</span>
									<span className="text-emerald-500 font-semibold">{stats.activeKeys}</span>
								</div>
								<div className="flex items-center justify-between text-xs">
									<span className="text-[var(--dashboard-text-muted)]">Total Requests</span>
									<span className="text-[var(--dashboard-text)] font-mono">{fmt(stats.totalRequests)}</span>
								</div>
								<div className="flex items-center justify-between text-xs">
									<span className="text-[var(--dashboard-text-muted)]">Success Rate</span>
									<span className={`font-semibold ${stats.successRate > 95 ? "text-emerald-500" : "text-amber-500"}`}>{stats.successRate}%</span>
								</div>
								<div className="flex items-center justify-between text-xs">
									<span className="text-[var(--dashboard-text-muted)]">Avg Latency</span>
									<span className="text-[var(--dashboard-text)] font-mono">{stats.avgLatency}ms</span>
								</div>
							</div>
							<NavLink to="/user/my-keys" className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-all cursor-pointer">
								Manage Keys
							</NavLink>
						</div>
					</div>

					{/* API Keys + Activity */}
					<div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
						<div className="dashboard-card p-4 sm:p-5 rounded-2xl">
							<div className="flex items-center justify-between mb-4">
								<div>
									<h3 className="text-xs sm:text-sm font-semibold text-[var(--dashboard-text)]">Your API Keys</h3>
									<p className="text-[11px] text-[var(--dashboard-text-muted)]">{keys.length} key{keys.length !== 1 ? "s" : ""} configured</p>
								</div>
								<NavLink to="/user/my-keys" className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400 transition-colors">
									Manage <FiExternalLink className="w-3 h-3" />
								</NavLink>
							</div>
							<div className="space-y-2">
								{keys.length === 0 && (
									<div className="text-center py-8">
										<p className="text-xs text-[var(--dashboard-text-muted)] mb-3">No API keys yet</p>
										<NavLink to="/user/my-keys" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-all">
											Create your first key
										</NavLink>
									</div>
								)}
								{keys.map((k) => {
									const pct = Math.min(100, k.usagePercent);
									return (
										<div key={k.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--dashboard-input-bg)] border border-[var(--dashboard-border)] hover:border-[var(--dashboard-nav-hover)] transition-all gap-3">
											<div className="flex items-center gap-3 min-w-0">
												<span className={`w-2 h-2 rounded-full shrink-0 ${k.status === "active" ? "bg-emerald-500" : "bg-[var(--dashboard-text-muted)]"}`} />
												<div className="min-w-0">
													<p className="text-xs font-medium text-[var(--dashboard-text)] truncate">{k.name}</p>
													<p className="text-[11px] text-[var(--dashboard-text-muted)]">requests: {k.totalRequests.toLocaleString()}</p>
												</div>
											</div>
											<div className="w-16 shrink-0">
												<div className="flex justify-between text-[10px] mb-0.5">
													<span className={`font-mono ${pct > 80 ? "text-rose-500" : pct > 50 ? "text-amber-500" : "text-emerald-500"}`}>{pct}%</span>
												</div>
												<div className="w-full bg-[var(--dashboard-nav-hover)] rounded-full h-1">
													<div className={`h-full rounded-full transition-all ${pct > 80 ? "bg-rose-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						<div className="dashboard-card p-4 sm:p-5 rounded-2xl">
							<div className="flex items-center justify-between mb-4">
								<div>
									<h3 className="text-xs sm:text-sm font-semibold text-[var(--dashboard-text)]">Recent Activity</h3>
									<p className="text-[11px] text-[var(--dashboard-text-muted)]">Latest API requests</p>
								</div>
								<span className="text-[11px] text-[var(--dashboard-text-muted)] font-mono">{activity.length} entries</span>
							</div>
							<div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
								{logs.length === 0 && (
									<div className="text-center py-8">
										<p className="text-xs text-[var(--dashboard-text-muted)]">No activity yet</p>
									</div>
								)}
								{logs.map((log) => (
									<div key={log.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--dashboard-nav-hover)] transition-all gap-3">
										<div className="flex items-center gap-3 min-w-0">
											<span className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold ${log.status === 200 ? "bg-emerald-500/10 text-emerald-500" : log.status === 429 ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"}`}>
												{log.status}
											</span>
											<div className="min-w-0">
												<p className="text-xs text-[var(--dashboard-text-secondary)] font-mono truncate">{log.model}</p>
												<p className="text-[10px] text-[var(--dashboard-text-muted)]">{timeAgo(log.time)}</p>
											</div>
										</div>
										<div className="flex items-center gap-3 shrink-0 text-[11px] text-[var(--dashboard-text-muted)]">
											<span className="font-mono">{log.latencyMs}ms</span>
											<span className="font-mono hidden sm:inline">{log.tokensUsed} tok</span>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>

					<div className="text-center py-6">
						<p className="text-[11px] text-[var(--dashboard-text-muted)]">OpusZen Gateway &middot; {new Date().getFullYear()}</p>
					</div>
				</div>
			</main>
		</div>
	);
}