import { type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { useLoaderData } from "react-router";
import { useState } from "react";
import { verifyAdminSession } from "../../utils/admin-auth";
import { supabase } from "../../utils/supabase";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import { StatCard } from "~/components/admin/stat-card";
import { cn } from "@/lib/utils";
import {
	ResponsiveContainer,
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	PieChart,
	Pie,
	Cell,
} from "recharts";
import { FiZap, FiActivity, FiCpu, FiClock, FiAlertTriangle } from "react-icons/fi";

export const meta: MetaFunction = () => [{ title: "Analytics | Admin | OpusZen" }];

interface LoaderData {
	stats: {
		totalRequests: number;
		avgLatency: number;
		errorRate: number;
		totalTokens: number;
		peakRPM: number;
	};
	chartData: Array<{ label: string; requests: number; latency: number; tokens: number }>;
	modelData: Array<{ name: string; requests: number; percentage: number }>;
	statusDist: Array<{ name: string; value: number; color: string }>;
	hourlyData: Array<{ hour: string; requests: number }>;
	adminEmail: string | null;
}

function startOfToday(): Date {
	const now = new Date();
	return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function loader({ request }: LoaderFunctionArgs) {
	const adminCheck = await verifyAdminSession(request);
	if (!adminCheck.isAdmin) return redirect("/auth/admin");

	let allOrders: Array<{
		created_at: string;
		completed_at: string | null;
		status: string;
		plan_name: string;
		final_amount: number;
	}> = [];
	try {
		const { data, error } = await supabase
			.from("orders")
			.select("created_at, completed_at, status, plan_name, final_amount")
			.order("created_at", { ascending: true });
		if (!error && data) allOrders = data;
	} catch { /* table may not exist yet */ }

	let allUsers: Array<{ created_at: string }> = [];
	try {
		const { data, error } = await supabase
			.from("users")
			.select("created_at")
			.order("created_at", { ascending: true });
		if (!error && data) allUsers = data;
	} catch { /* table may not exist yet */ }

	// Build 30-day chart data from real orders
	const today = startOfToday();
	const chartData: LoaderData["chartData"] = [];
	for (let i = 29; i >= 0; i--) {
		const dayStart = new Date(today);
		dayStart.setDate(dayStart.getDate() - i);
		const dayEnd = new Date(dayStart);
		dayEnd.setDate(dayEnd.getDate() + 1);

		const dayOrders = allOrders.filter((o) => {
			const od = new Date(o.created_at);
			return od >= dayStart && od < dayEnd;
		});

		const requests = dayOrders.length;
		const completedLatencies = dayOrders
			.filter((o) => o.completed_at)
			.map((o) => new Date(o.completed_at!).getTime() - new Date(o.created_at).getTime());
		const avgLatency = completedLatencies.length > 0
			? Math.round(completedLatencies.reduce((s, v) => s + v, 0) / completedLatencies.length)
			: 0;
		const tokens = dayOrders.reduce((s, o) => s + Math.round((o.final_amount || 0) * 1600), 0);

		chartData.push({
			label: `${dayStart.toLocaleString("default", { month: "short" })} ${dayStart.getDate()}`,
			requests,
			latency: avgLatency,
			tokens,
		});
	}

	// Plan distribution from orders
	const planCounts = new Map<string, number>();
	for (const o of allOrders) {
		planCounts.set(o.plan_name, (planCounts.get(o.plan_name) || 0) + 1);
	}
	const totalOrders = allOrders.length;
	const modelData: LoaderData["modelData"] = Array.from(planCounts.entries())
		.map(([name, requests]) => ({
			name,
			requests,
			percentage: totalOrders > 0 ? parseFloat(((requests / totalOrders) * 100).toFixed(1)) : 0,
		}))
		.sort((a, b) => b.requests - a.requests);

	// Status distribution
	const statusCounts = new Map<string, number>();
	for (const o of allOrders) {
		statusCounts.set(o.status, (statusCounts.get(o.status) || 0) + 1);
	}
	const statusLabels: Record<string, string> = {
		completed: "Completed",
		pending: "Pending",
		failed: "Failed",
		cancelled: "Cancelled",
		refunded: "Refunded",
	};
	const STATUS_COLORS: Record<string, string> = {
		completed: "#22c55e",
		pending: "#f59e0b",
		failed: "#ef4444",
		cancelled: "#94a3b8",
		refunded: "#a78bfa",
	};
	const statusDist: LoaderData["statusDist"] = Array.from(statusCounts.entries())
		.map(([status, value]) => ({
			name: statusLabels[status] || status,
			value,
			color: STATUS_COLORS[status] || "#6366f1",
		}))
		.sort((a, b) => b.value - a.value);

	// Hourly data for today
	const todayStart = startOfToday();
	const hourlyData: LoaderData["hourlyData"] = [];
	for (let h = 0; h < 24; h++) {
		const hourStart = new Date(todayStart);
		hourStart.setHours(h, 0, 0, 0);
		const hourEnd = new Date(todayStart);
		hourEnd.setHours(h + 1, 0, 0, 0);

		const count = allOrders.filter((o) => {
			const od = new Date(o.created_at);
			return od >= hourStart && od < hourEnd;
		}).length;

		hourlyData.push({ hour: `${h.toString().padStart(2, "0")}:00`, requests: count });
	}

	// Derived stats
	const totalRequests = chartData.reduce((s, d) => s + d.requests, 0);
	const latencyDays = chartData.filter((d) => d.latency > 0);
	const avgLatency = latencyDays.length > 0
		? Math.round(latencyDays.reduce((s, d) => s + d.latency, 0) / latencyDays.length)
		: 0;
	const totalTokens = chartData.reduce((s, d) => s + d.tokens, 0);
	const errorCount = statusDist.find((s) => s.name === "Failed")?.value || 0;
	const allStatusTotal = statusDist.reduce((s, d) => s + d.value, 0);
	const errorRate = allStatusTotal > 0 ? parseFloat(((errorCount) / allStatusTotal * 100).toFixed(1)) : 0;
	const peakRPM = hourlyData.reduce((max, d) => Math.max(max, d.requests), 0);

	return {
		stats: { totalRequests, avgLatency, errorRate, totalTokens, peakRPM },
		chartData,
		modelData,
		statusDist,
		hourlyData,
		adminEmail: adminCheck.adminEmail,
	};
}

export default function AdminAnalyticsRoute() {
	const { stats, chartData, modelData, statusDist, hourlyData, adminEmail } = useLoaderData<LoaderData>();
	const [chartTab, setChartTab] = useState<"requests" | "latency" | "tokens">("requests");

	const dataKey = chartTab === "requests" ? "requests" : chartTab === "latency" ? "latency" : "tokens";
	const strokeColor = chartTab === "requests" ? "#6366f1" : chartTab === "latency" ? "#f59e0b" : "#22c55e";
	const gradientId = `${chartTab}Grad`;

	return (
		<div className="min-h-screen bg-background text-foreground">
			<AdminSidebar collapsed={false} onToggle={() => {}} adminEmail={adminEmail || undefined} />
			<main className="ml-[220px] min-h-screen">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="max-w-[1400px] space-y-6">
						{/* Header */}
						<div>
							<h1 className="text-3xl font-bold text-foreground">Analytics</h1>
							<p className="text-muted-foreground text-sm mt-1">Performance metrics, order trends, and distribution breakdowns</p>
						</div>

						{/* Top Stats */}
						<div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
							<StatCard title="Total Requests" value={(stats.totalRequests / 1000).toFixed(1) + "K"} icon={<FiActivity className="w-4 h-4" />} iconBg="bg-indigo-500/10" iconColor="text-indigo-500" />
							<StatCard title="Avg Latency" value={stats.avgLatency + "ms"} icon={<FiClock className="w-4 h-4" />} iconBg="bg-amber-500/10" iconColor="text-amber-500" />
							<StatCard title="Error Rate" value={stats.errorRate + "%"} icon={<FiAlertTriangle className="w-4 h-4" />} iconBg={stats.errorRate > 5 ? "bg-red-500/10" : "bg-emerald-500/10"} iconColor={stats.errorRate > 5 ? "text-red-500" : "text-emerald-500"} />
							<StatCard title="Total Tokens" value={(stats.totalTokens / 1e6).toFixed(1) + "M"} icon={<FiCpu className="w-4 h-4" />} iconBg="bg-emerald-500/10" iconColor="text-emerald-500" />
							<StatCard title="Peak RPM" value={stats.peakRPM.toString()} icon={<FiZap className="w-4 h-4" />} iconBg="bg-violet-500/10" iconColor="text-violet-500" />
						</div>

						{/* 30-Day Trend Chart */}
						<div className="rounded-2xl border border-border bg-card p-5">
							<div className="flex items-center justify-between mb-4">
								<div>
									<h3 className="font-bold text-foreground text-sm">30-Day Trend</h3>
									<p className="text-[11px] text-muted-foreground mt-0.5">Request volume, latency, and token usage</p>
								</div>
								<div className="flex p-0.5 rounded-lg bg-muted/50 border border-border/50">
									{(["requests", "latency", "tokens"] as const).map((t) => (
										<button key={t} onClick={() => setChartTab(t)} className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer", chartTab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
											{t.charAt(0).toUpperCase() + t.slice(1)}
										</button>
									))}
								</div>
							</div>
							<div className="h-[260px]">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
										<defs>
											<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
												<stop offset="5%" stopColor={strokeColor} stopOpacity={0.25} />
												<stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
											</linearGradient>
										</defs>
										<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
										<XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={4} />
										<YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => chartTab === "tokens" ? `${v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : (v / 1e3).toFixed(0) + "K"}` : v.toLocaleString()} />
										<Tooltip content={<CustomTooltip dataKey={chartTab} color={strokeColor} />} />
										<Area type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} />
									</AreaChart>
								</ResponsiveContainer>
							</div>
						</div>

						{/* Bottom Row: Models + Status + Hourly */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
							{/* Plan Distribution */}
							<div className="rounded-2xl border border-border bg-card p-5">
								<h3 className="font-bold text-foreground text-sm mb-4">Plan Distribution</h3>
								{modelData.length === 0 ? (
									<p className="text-xs text-muted-foreground py-6 text-center">No order data yet</p>
								) : (
									<div className="space-y-3">
										{modelData.map((m) => (
											<div key={m.name}>
												<div className="flex justify-between text-xs mb-1">
													<span className="font-medium text-foreground truncate mr-2">{m.name}</span>
													<span className="text-muted-foreground shrink-0">{m.percentage}%</span>
												</div>
												<div className="h-1.5 bg-muted rounded-full overflow-hidden">
													<div className="h-full rounded-full bg-primary transition-all" style={{ width: `${m.percentage}%` }} />
												</div>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Status Distribution */}
							<div className="rounded-2xl border border-border bg-card p-5">
								<h3 className="font-bold text-foreground text-sm mb-4">Order Status</h3>
								{statusDist.length === 0 ? (
									<p className="text-xs text-muted-foreground py-6 text-center">No orders yet</p>
								) : (
									<div className="flex items-center gap-4">
										<div className="h-[150px] w-[150px] shrink-0">
											<ResponsiveContainer width="100%" height="100%">
												<PieChart>
													<Pie data={statusDist} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2} dataKey="value">
														{statusDist.map((entry) => <Cell key={entry.name} fill={entry.color} stroke="none" />)}
													</Pie>
													<Tooltip formatter={(v) => [(v as number).toLocaleString(), "Orders"]} />
												</PieChart>
											</ResponsiveContainer>
										</div>
										<div className="flex-1 space-y-2">
											{statusDist.map((s) => {
												const total = statusDist.reduce((a, b) => a + b.value, 0);
												return (
													<div key={s.name} className="flex items-center justify-between text-xs">
														<div className="flex items-center gap-2">
															<div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
															<span className="text-muted-foreground">{s.name}</span>
														</div>
														<span className="font-semibold text-foreground">{total > 0 ? ((s.value / total) * 100).toFixed(1) : "0.0"}%</span>
													</div>
												);
											})}
										</div>
									</div>
								)}
							</div>

							{/* Hourly Heatmap */}
							<div className="rounded-2xl border border-border bg-card p-5">
								<h3 className="font-bold text-foreground text-sm mb-4">Hourly Requests (Today)</h3>
								{hourlyData.every((h) => h.requests === 0) ? (
									<p className="text-xs text-muted-foreground py-6 text-center">No orders today yet</p>
								) : (
									<>
										<div className="grid grid-cols-12 gap-1">
											{hourlyData.map((h) => {
												const max = Math.max(...hourlyData.map((d) => d.requests));
												const intensity = max > 0 ? h.requests / max : 0;
												return (
													<div key={h.hour} className="flex flex-col items-center gap-1">
														<div className="w-full aspect-square rounded-sm" style={{ background: `rgba(99, 102, 241, ${0.08 + intensity * 0.87})` }} title={`${h.hour}: ${h.requests} requests`} />
														<span className="text-[9px] text-muted-foreground">{h.hour.split(":")[0]}</span>
													</div>
												);
											})}
										</div>
										<div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
											<span>Less</span>
											<div className="flex gap-0.5">
												{[0.2, 0.4, 0.6, 0.8, 1].map((v) => <div key={v} className="w-3 h-3 rounded-sm" style={{ background: `rgba(99, 102, 241, ${0.08 + v * 0.87})` }} />)}
											</div>
											<span>More</span>
										</div>
									</>
								)}
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}

function CustomTooltip({ active, payload, label, dataKey, color }: any) {
	if (!active || !payload?.length) return null;
	return (
		<div className="bg-card/95 backdrop-blur border border-border rounded-xl px-3 py-2.5 shadow-xl">
			<p className="text-xs font-semibold text-muted-foreground mb-1.5">{label}</p>
			{payload.map((entry: any, i: number) => (
				<div key={i} className="flex items-center gap-2 text-xs">
					<div className="w-2 h-2 rounded-full" style={{ background: color }} />
					<span className="text-muted-foreground capitalize">{dataKey}:</span>
					<span className="font-semibold text-foreground">{entry.value.toLocaleString()}</span>
				</div>
			))}
		</div>
	);
}
