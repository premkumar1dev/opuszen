import { useState, useEffect, useCallback } from "react";
import { NavLink } from "react-router";
import {
 FiActivity,
 FiZap,
 FiClock,
 FiAlertTriangle,
 FiChevronDown,
 FiExternalLink,
 FiCopy,
 FiKey,
 FiBarChart2,
 FiUsers,
 FiRefreshCw,
 FiPlay,
 FiSquare,
 FiGrid,
} from "react-icons/fi";
import {
 LineChart,
 Line,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
 BarChart,
 Bar,
 PieChart,
 Pie,
 Cell,
} from "recharts";
import { DashboardSidebar } from "./dashboard-sidebar";
import { supabase } from "../../utils/supabase";

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────
interface DashboardStats {
 totalKeys: number;
 activeKeys: number;
 totalRequests: number;
 avgLatency: number;
 errorRate: number;
 tokensUsed: number;
 tokensLimit: number;
 creditsUsed: number;
 creditsLimit: number;
 successRate: number;
 failoverCount: number;
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
 keyPrefix: string;
 planName: string;
 isActive: boolean;
 totalRequests: number;
 tokensUsed: number;
 tokensLimit: number;
 usagePercent: number;
 createdAt: string;
 lastUsedAt: string;
 expiresAt: string;
}

interface RequestLog {
 id: string;
 time: string;
 model: string;
 status: number;
 latencyMs: number;
 tokensUsed: number;
 keyPrefix: string;
}

interface ProviderStatus {
 name: string;
 status: "online" | "degraded" | "offline";
 successRate: number;
 latency: number;
 keys: number;
 activeKeys: number;
}

// ──────────────────────────────────────
// Mock data generators (replace with real API calls)
// ──────────────────────────────────────
function generateMockStats(): DashboardStats {
 return {
 totalKeys: 12,
 activeKeys: 10,
 totalRequests: 148_932,
 avgLatency: 342,
 errorRate: 2.4,
 tokensUsed: 2_847_291,
 tokensLimit: 5_000_000,
 creditsUsed: 124.50,
 creditsLimit: 200,
 successRate: 97.6,
 failoverCount: 3,
 };
}

function generateMockUsageData(): UsageDay[] {
 const days: UsageDay[] = [];
 const now = new Date();
 for (let i = 29; i >= 0; i--) {
 const d = new Date(now);
 d.setDate(d.getDate() - i);
 days.push({
 date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
 requests: Math.floor(Math.random() * 8000) + 2000,
 tokens: Math.floor(Math.random() * 500_000) + 100_000,
 credits: Math.round((Math.random() * 8 + 2) * 100) / 100,
 errors: Math.floor(Math.random() * 200),
 });
 }
 return days;
}

function generateMockModelUsage(): ModelUsage[] {
 return [
 { name: "Claude Sonnet 4.6", value: 45200, color: "#6366f1" },
 { name: "Claude Opus 4.8", value: 28900, color: "#a855f7" },
 { name: "Claude Haiku 4.5", value: 18700, color: "#10b981" },
 { name: "GPT-4o", value: 12300, color: "#f59e0b" },
 { name: "Gemini 2.0", value: 5600, color: "#3b82f6" },
 { name: "Others", value: 3200, color: "#71717a" },
 ];
}

function generateMockKeys(): ApiKeyRow[] {
 return [
 {
 id: "1",
 name: "Production Key",
 keyPrefix: "sk-ant...xk2m",
 planName: "Pro Plan (5x)",
 isActive: true,
 totalRequests: 78432,
 tokensUsed: 1_450_000,
 tokensLimit: 2_500_000,
 usagePercent: 58,
 createdAt: "2025-01-15T10:00:00Z",
 lastUsedAt: new Date().toISOString(),
 expiresAt: "2026-01-15T10:00:00Z",
 },
 {
 id: "2",
 name: "Dev / Testing",
 keyPrefix: "sk-ant...9p4q",
 planName: "Pro Plan (5x)",
 isActive: true,
 totalRequests: 32410,
 tokensUsed: 890_000,
 tokensLimit: 2_500_000,
 usagePercent: 36,
 createdAt: "2025-03-20T14:30:00Z",
 lastUsedAt: new Date(Date.now() - 3600000).toISOString(),
 expiresAt: "2026-03-20T14:30:00Z",
 },
 {
 id: "3",
 name: "Staging Environment",
 keyPrefix: "sk-ant...7w3r",
 planName: "Pro Plan (10x)",
 isActive: true,
 totalRequests: 28091,
 tokensUsed: 507_291,
 tokensLimit: 10_000_000,
 usagePercent: 5,
 createdAt: "2025-06-01T09:00:00Z",
 lastUsedAt: new Date(Date.now() - 7200000).toISOString(),
 expiresAt: "2026-06-01T09:00:00Z",
 },
 {
 id: "4",
 name: "Expired Trial",
 keyPrefix: "sk-ant...2v8n",
 planName: "Trial Plan",
 isActive: false,
 totalRequests: 9999,
 tokensUsed: 1_000_000,
 tokensLimit: 1_000_000,
 usagePercent: 100,
 createdAt: "2025-08-10T11:00:00Z",
 lastUsedAt: new Date(Date.now() - 86400000).toISOString(),
 expiresAt: "2025-09-10T11:00:00Z",
 },
 ];
}

function generateMockLogs(): RequestLog[] {
 const models = [
 "claude-sonnet-4-20250514",
 "claude-opus-4-20250514",
 "claude-haiku-4-20250514",
 "gpt-4o",
 "gemini-2.0-flash",
 ];
 const statuses = [200, 200, 200, 200, 200, 200, 429, 500];
 const logs: RequestLog[] = [];
 for (let i = 0; i < 20; i++) {
 const status = statuses[Math.floor(Math.random() * statuses.length)];
 logs.push({
 id: String(i + 1),
 time: new Date(Date.now() - i * 180000 - Math.random() * 60000).toISOString(),
 model: models[Math.floor(Math.random() * models.length)],
 status,
 latencyMs: status === 200
 ? Math.floor(Math.random() * 800) + 150
 : Math.floor(Math.random() * 2000) + 500,
 tokensUsed: Math.floor(Math.random() * 4000) + 500,
 keyPrefix: `sk-ant...${Math.random().toString(36).slice(2, 6)}`,
 });
 }
 return logs;
}

function generateMockProviders(): ProviderStatus[] {
 return [
 { name: "Anthropic (Direct)", status: "online", successRate: 99.2, latency: 340, keys: 4, activeKeys: 4 },
 { name: "Anthropic (Azure)", status: "online", successRate: 98.8, latency: 420, keys: 2, activeKeys: 2 },
 { name: "OpenAI", status: "degraded", successRate: 94.1, latency: 560, keys: 3, activeKeys: 2 },
 { name: "Google AI", status: "online", successRate: 99.5, latency: 310, keys: 2, activeKeys: 2 },
 ];
}

// ──────────────────────────────────────
// Sub-components
// ──────────────────────────────────────
function StatCard({
 title,
 value,
 subtitle,
 icon: Icon,
 color = "indigo",
 trend,
}: {
 title: string;
 value: string | number;
 subtitle: string;
 icon: any;
 color?: "indigo" | "emerald" | "amber" | "violet" | "blue" | "rose";
 trend?: { value: number; label: string };
}) {
 const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
 indigo: { bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-400", iconBg: "bg-indigo-500/10 text-indigo-400" },
 emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", iconBg: "bg-emerald-500/10 text-emerald-400" },
 amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", iconBg: "bg-amber-500/10 text-amber-400" },
 violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400", iconBg: "bg-violet-500/10 text-violet-400" },
 blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", iconBg: "bg-blue-500/10 text-blue-400" },
 rose: { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400", iconBg: "bg-rose-500/10 text-rose-400" },
 };
 const c = colorMap[color] || colorMap.indigo;

 return (
 <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0f] hover:border-white/[0.12] transition-all duration-200 group">
 <div className="flex items-start justify-between">
 <div className="space-y-2">
 <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</p>
 <p className="text-2xl font-bold text-white tracking-tight">{typeof value === "number" ? value.toLocaleString() : value}</p>
 <p className="text-xs text-zinc-500">{subtitle}</p>
 {trend && (
 <div className={`flex items-center gap-1 text-[11px] font-medium ${trend.value >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
 <span>{trend.value >= 0 ? "↑" : "↓"}</span>
 <span>{Math.abs(trend.value)}%</span>
 <span className="text-zinc-600">{trend.label}</span>
 </div>
 )}
 </div>
 <div className={`p-2.5 rounded-xl ${c.iconBg} border ${c.border}`}>
 <Icon className="w-5 h-5" />
 </div>
 </div>
 </div>
 );
}

function formatNumber(n: number): string {
 if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
 if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
 return String(n);
}

function formatTimeAgo(iso: string): string {
 const diff = Date.now() - new Date(iso).getTime();
 const mins = Math.floor(diff / 60000);
 if (mins < 1) return "Just now";
 if (mins < 60) return `${mins}m ago`;
 const hrs = Math.floor(mins / 60);
 if (hrs < 24) return `${hrs}h ago`;
 return `${Math.floor(hrs / 24)}d ago`;
}

// ──────────────────────────────────────
// Custom Tooltip for charts
// ──────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
 if (!active || !payload?.length) return null;
 return (
 <div className="bg-[#13131a] border border-white/[0.1] rounded-xl px-4 py-3 shadow-2xl">
 <p className="text-xs text-zinc-400 mb-2 font-medium">{label}</p>
 {payload.map((entry: any, i: number) => (
 <div key={i} className="flex items-center gap-2 text-xs">
 <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
 <span className="text-zinc-300">{entry.name}:</span>
 <span className="text-white font-semibold font-mono">{typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}</span>
 </div>
 ))}
 </div>
 );
}

// ──────────────────────────────────────
// Main Dashboard
// ──────────────────────────────────────
export default function UserDashboard() {
 const [collapsed, setCollapsed] = useState(false);
 const [timeRange, setTimeRange] = useState("30d");
 const [sidebarOpen, setSidebarOpen] = useState(false);

 const [stats, setStats] = useState<DashboardStats>(generateMockStats);
 const [usageData, setUsageData] = useState<UsageDay[]>(generateMockUsageData);
 const [modelData, setModelData] = useState<ModelUsage[]>(generateMockModelUsage);
 const [keys, setKeys] = useState<ApiKeyRow[]>(generateMockKeys);
 const [logs, setLogs] = useState<RequestLog[]>(generateMockLogs);
 const [providers, setProviders] = useState<ProviderStatus[]>(generateMockProviders);
 const [loading, setLoading] = useState(true);

 const [user, setUser] = useState<any>(null);

 useEffect(() => {
 supabase.auth.getUser().then(({ data }) => {
 setUser(data.user);
 });
 }, []);

 // Refresh data
 const refreshData = useCallback(() => {
 setLoading(true);
 setTimeout(() => {
 setStats(generateMockStats());
 setUsageData(generateMockUsageData());
 setModelData(generateMockModelUsage());
 setKeys(generateMockKeys());
 setLogs(generateMockLogs());
 setProviders(generateMockProviders());
 setLoading(false);
 }, 600);
 }, []);

 // Filter usage data based on timeRange
 const filteredUsage = usageData.filter((_, i) => {
 if (timeRange === "7d") return i >= usageData.length - 7;
 if (timeRange === "30d") return true;
 const days = parseInt(timeRange);
 return i >= usageData.length - days;
 });

 const tokensPercent = Math.min(100, (stats.tokensUsed / stats.tokensLimit) * 100);
 const creditsPercent = Math.min(100, (stats.creditsUsed / stats.creditsLimit) * 100);

 const totalRequestsToday = usageData.length > 0 ? usageData[usageData.length - 1].requests : 0;

 return (
 <div className="min-h-screen bg-[#09090b] flex">
 {/* Mobile sidebar overlay */}
 {sidebarOpen && (
 <div
 className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm md:hidden"
 onClick={() => setSidebarOpen(false)}
 />
 )}

 {/* Mobile sidebar */}
 <div
 className={`fixed top-0 left-0 z-[60] h-full md:hidden transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
 >
 <DashboardSidebar
 collapsed={false}
 onToggle={() => setSidebarOpen(false)}
 userEmail={user?.email}
 />
 </div>

 {/* Desktop sidebar */}
 <div className="hidden md:block shrink-0">
 <DashboardSidebar
 collapsed={collapsed}
 onToggle={() => setCollapsed(!collapsed)}
 userEmail={user?.email}
 />
 </div>

 {/* Main Content */}
 <main
 className={`
 flex-1 min-h-screen
 transition-all duration-300
 ${collapsed ? "md:ml-[68px]" : "md:ml-[240px]"}
 `}
 >
 {/* Top Header Bar */}
 <header className="sticky top-0 z-40 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.06]">
 <div className="flex items-center justify-between h-14 px-4 sm:px-8">
 {/* Mobile hamburger + breadcrumb */}
 <div className="flex items-center gap-3">
 <button
 onClick={() => setSidebarOpen(true)}
 className="md:hidden p-2 -ml-2 rounded-lg hover:bg-white/[0.06] text-zinc-400 transition-colors"
 aria-label="Open menu"
 >
 <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
 <path d="M4 6h16M4 12h16M4 18h16" />
 </svg>
 </button>
 <div>
 <h1 className="text-sm font-semibold text-white">Dashboard</h1>
 <p className="text-[11px] text-zinc-500 hidden sm:block">
 {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button
 onClick={refreshData}
 disabled={loading}
 className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-50"
 >
 <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
 <span className="hidden sm:inline">Refresh</span>
 </button>
 <NavLink
 to="/user/my-keys"
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all"
 >
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
 <span className="hidden sm:inline">All Systems Operational</span>
 </NavLink>
 </div>
 </div>
 </header>

 <div className="p-4 sm:p-8 space-y-6 max-w-[1400px]">
 {/* Welcome banner */}
 <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
 <div>
 <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
 Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : user?.email ? `, ${user.email.split("@")[0]}` : ""}
 </h2>
 <p className="text-sm text-zinc-400 mt-1">
 Here's what's happening with your OpusZen API gateway today.
 </p>
 </div>
 <div className="flex items-center gap-2">
 {["7d", "30d", "90d"].map((range) => (
 <button
 key={range}
 onClick={() => setTimeRange(range)}
 className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
 timeRange === range
 ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
 : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] border border-transparent"
 }`}
 >
 {range}
 </button>
 ))}
 </div>
 </div>

 {/* ── Stat Cards ── */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <StatCard
 title="Total Requests"
 value={stats.totalRequests.toLocaleString()}
 subtitle={`${formatNumber(totalRequestsToday)} today`}
 icon={FiActivity}
 color="indigo"
 trend={{ value: 12.5, label: "vs last period" }}
 />
 <StatCard
 title="API Keys"
 value={`${stats.activeKeys}/${stats.totalKeys}`}
 subtitle="Active / Total"
 icon={FiKey}
 color="emerald"
 />
 <StatCard
 title="Avg Latency"
 value={`${stats.avgLatency}ms`}
 subtitle="Response time"
 icon={FiClock}
 color="violet"
 trend={{ value: -8.3, label: "improved" }}
 />
 <StatCard
 title="Success Rate"
 value={`${stats.successRate}%`}
 subtitle={`${stats.errorRate}% error rate`}
 icon={FiZap}
 color={stats.successRate > 95 ? "emerald" : "amber"}
 />
 </div>

 {/* ── Token & Credit Usage Bars ── */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm font-semibold text-white">Token Usage</h3>
 <span className="text-xs text-zinc-500 font-mono">
 {formatNumber(stats.tokensUsed)} / {formatNumber(stats.tokensLimit)}
 </span>
 </div>
 <div className="w-full bg-zinc-800/60 rounded-full h-2 overflow-hidden">
 <div
 className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
 style={{ width: `${tokensPercent}%` }}
 />
 </div>
 <div className="flex justify-between text-[11px] mt-2 text-zinc-500">
 <span>{tokensPercent.toFixed(1)}% used</span>
 <span>{formatNumber(stats.tokensLimit - stats.tokensUsed)} remaining</span>
 </div>
 </div>

 <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm font-semibold text-white">Credit Usage</h3>
 <span className="text-xs text-zinc-500 font-mono">
 ${stats.creditsUsed.toFixed(2)} / ${stats.creditsLimit.toFixed(2)}
 </span>
 </div>
 <div className="w-full bg-zinc-800/60 rounded-full h-2 overflow-hidden">
 <div
 className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
 style={{ width: `${creditsPercent}%` }}
 />
 </div>
 <div className="flex justify-between text-[11px] mt-2 text-zinc-500">
 <span>{creditsPercent.toFixed(1)}% used</span>
 <span>${(stats.creditsLimit - stats.creditsUsed).toFixed(2)} remaining</span>
 </div>
 </div>
 </div>

 {/* ── Charts Row ── */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
 {/* Request Volume Chart */}
 <div className="lg:col-span-2 p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
 <div className="flex items-center justify-between mb-6">
 <div>
 <h3 className="text-sm font-semibold text-white">Request Volume</h3>
 <p className="text-[11px] text-zinc-500 mt-0.5">Daily API requests & errors</p>
 </div>
 <div className="flex items-center gap-4 text-[11px]">
 <span className="flex items-center gap-1.5 text-zinc-400">
 <span className="w-2.5 h-0.5 rounded-full bg-indigo-500" /> Requests
 </span>
 <span className="flex items-center gap-1.5 text-zinc-400">
 <span className="w-2.5 h-0.5 rounded-full bg-rose-500" /> Errors
 </span>
 </div>
 </div>
 <ResponsiveContainer width="100%" height={220}>
 <LineChart data={filteredUsage}>
 <defs>
 <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
 <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
 </linearGradient>
 <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
 <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
 <XAxis
 dataKey="date"
 tick={{ fill: "#71717a", fontSize: 10 }}
 axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
 tickLine={false}
 tickMargin={8}
 />
 <YAxis
 tick={{ fill: "#71717a", fontSize: 10 }}
 axisLine={false}
 tickLine={false}
 tickFormatter={(v) => formatNumber(v)}
 />
 <Tooltip content={<ChartTooltip />} />
 <Line
 type="monotone"
 dataKey="requests"
 name="Requests"
 stroke="#6366f1"
 strokeWidth={2}
 dot={false}
 activeDot={{ r: 4, fill: "#6366f1", stroke: "#09090b", strokeWidth: 2 }}
 fill="url(#reqGrad)"
 />
 <Line
 type="monotone"
 dataKey="errors"
 name="Errors"
 stroke="#f43f5e"
 strokeWidth={1.5}
 dot={false}
 activeDot={{ r: 3, fill: "#f43f5e", stroke: "#09090b", strokeWidth: 2 }}
 fill="url(#errGrad)"
 />
 </LineChart>
 </ResponsiveContainer>
 </div>

 {/* Model Distribution */}
 <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
 <h3 className="text-sm font-semibold text-white mb-1">Model Distribution</h3>
 <p className="text-[11px] text-zinc-500 mb-4">Requests by model</p>
 <ResponsiveContainer width="100%" height={180}>
 <PieChart>
 <Pie
 data={modelData}
 cx="50%"
 cy="50%"
 innerRadius={50}
 outerRadius={80}
 paddingAngle={2}
 dataKey="value"
 stroke="none"
 >
 {modelData.map((entry, index) => (
 <Cell key={index} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip content={<ChartTooltip />} />
 </PieChart>
 </ResponsiveContainer>
 <div className="space-y-1.5 mt-2">
 {modelData.slice(0, 4).map((item) => (
 <div key={item.name} className="flex items-center justify-between text-xs">
 <div className="flex items-center gap-2">
 <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
 <span className="text-zinc-400">{item.name}</span>
 </div>
 <span className="text-zinc-500 font-mono text-[11px]">
 {formatNumber(item.value)}
 </span>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* ── Credits Over Time + Provider Status ── */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
 {/* Credits chart */}
 <div className="lg:col-span-2 p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h3 className="text-sm font-semibold text-white">Credit Consumption</h3>
 <p className="text-[11px] text-zinc-500 mt-0.5">Daily spending across all providers</p>
 </div>
 <div className="text-xs text-zinc-500">
 Total: <span className="text-white font-semibold font-mono">${stats.creditsUsed.toFixed(2)}</span>
 </div>
 </div>
 <ResponsiveContainer width="100%" height={200}>
 <BarChart data={filteredUsage}>
 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
 <XAxis
 dataKey="date"
 tick={{ fill: "#71717a", fontSize: 10 }}
 axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
 tickLine={false}
 tickMargin={8}
 />
 <YAxis
 tick={{ fill: "#71717a", fontSize: 10 }}
 axisLine={false}
 tickLine={false}
 tickFormatter={(v) => `$${v}`}
 />
 <Tooltip content={<ChartTooltip />} />
 <Bar dataKey="credits" name="Credits ($)" fill="#10b981" radius={[3, 3, 0, 0]} opacity={0.8} />
 </BarChart>
 </ResponsiveContainer>
 </div>

 {/* Provider Status */}
 <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
 <h3 className="text-sm font-semibold text-white mb-1">Providers</h3>
 <p className="text-[11px] text-zinc-500 mb-4">Gateway health status</p>
 <div className="space-y-3">
 {providers.map((p) => (
 <div key={p.name} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
 <div className="flex items-center justify-between mb-1.5">
 <span className="text-xs font-medium text-zinc-300">{p.name}</span>
 <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
 p.status === "online"
 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
 : p.status === "degraded"
 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
 : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
 }`}>
 <span className={`w-1 h-1 rounded-full ${p.status === "online" ? "bg-emerald-500" : p.status === "degraded" ? "bg-amber-500" : "bg-rose-500"}`} />
 {p.status}
 </span>
 </div>
 <div className="flex items-center justify-between text-[11px] text-zinc-500">
 <span>{p.activeKeys}/{p.keys} keys</span>
 <span className="font-mono">{p.latency}ms</span>
 <span className="font-mono">{p.successRate}%</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* ── API Keys + Recent Activity ── */}
 <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
 {/* API Keys Table */}
 <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h3 className="text-sm font-semibold text-white">API Keys</h3>
 <p className="text-[11px] text-zinc-500 mt-0.5">{keys.length} keys configured</p>
 </div>
 <NavLink
 to="/user/my-keys"
 className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
 >
 Manage <FiExternalLink className="w-3 h-3" />
 </NavLink>
 </div>
 <div className="space-y-2">
 {keys.map((key) => (
 <div
 key={key.id}
 className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all"
 >
 <div className="flex items-center gap-3 min-w-0">
 <div className={`w-2 h-2 rounded-full shrink-0 ${key.isActive ? "bg-emerald-500" : "bg-zinc-600"}`} />
 <div className="min-w-0">
 <p className="text-xs font-medium text-zinc-200 truncate">{key.name}</p>
 <p className="text-[11px] text-zinc-500 font-mono">{key.keyPrefix}</p>
 </div>
 </div>
 <div className="flex items-center gap-3 shrink-0">
 <div className="text-right hidden sm:block">
 <p className="text-[11px] text-zinc-400 font-mono">{formatNumber(key.totalRequests)} reqs</p>
 <p className="text-[10px] text-zinc-600">{key.planName}</p>
 </div>
 <div className="w-16">
 <div className="flex justify-between text-[10px] mb-0.5">
 <span className={`font-mono ${key.usagePercent > 80 ? "text-rose-400" : key.usagePercent > 50 ? "text-amber-400" : "text-emerald-400"}`}>
 {key.usagePercent}%
 </span>
 </div>
 <div className="w-full bg-zinc-800 rounded-full h-1">
 <div
 className={`h-full rounded-full transition-all ${
 key.usagePercent > 80 ? "bg-rose-500" : key.usagePercent > 50 ? "bg-amber-500" : "bg-emerald-500"
 }`}
 style={{ width: `${key.usagePercent}%` }}
 />
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Recent Activity */}
 <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
 <p className="text-[11px] text-zinc-500 mt-0.5">Latest API requests</p>
 </div>
 <span className="text-[11px] text-zinc-600 font-mono">{logs.length} entries</span>
 </div>
 <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
 {logs.slice(0, 15).map((log) => (
 <div
 key={log.id}
 className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.02] transition-all group"
 >
 <div className="flex items-center gap-3 min-w-0">
 <span
 className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold ${
 log.status === 200
 ? "bg-emerald-500/10 text-emerald-400"
 : log.status === 429
 ? "bg-amber-500/10 text-amber-400"
 : "bg-rose-500/10 text-rose-400"
 }`}
 >
 {log.status}
 </span>
 <div className="min-w-0">
 <p className="text-xs text-zinc-300 font-mono truncate">{log.model}</p>
 <p className="text-[10px] text-zinc-600">{formatTimeAgo(log.time)}</p>
 </div>
 </div>
 <div className="flex items-center gap-3 shrink-0 text-[11px] text-zinc-500">
 <span className="font-mono">{log.latencyMs}ms</span>
 <span className="font-mono hidden sm:inline">{log.tokensUsed} tok</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* ── Footer ── */}
 <div className="text-center py-6">
 <p className="text-[11px] text-zinc-600">
 OpusZen Gateway · {new Date().getFullYear()} · All systems nominal
 </p>
 </div>
 </div>
 </main>
 </div>
 );
}
