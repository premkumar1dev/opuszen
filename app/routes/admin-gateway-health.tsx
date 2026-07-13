/**
 * Admin - Health Monitor
 * Route: /auth/admin/gateway/health
 */
import { useState, useCallback, useEffect } from "react";
import { type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { useLoaderData } from "react-router";
import { verifyAdminSession } from "~/utils/admin-auth";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import { cn } from "~/lib/utils";
import {
 FiActivity,
 FiRefreshCw,
 FiPlay,
 FiRotateCcw,
 FiClock,
 FiServer,
 FiAlertTriangle,
 FiCheckCircle,
 FiXCircle,
 FiZap,
 FiLoader,
} from "react-icons/fi";
import { Button } from "~/components/ui/button";

export const meta: MetaFunction = () => [{ title: "Health Monitor | Admin | OpusZen" }];

const HEALTH_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
 healthy: { label: "Healthy", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", border: "border-emerald-500/30" },
 rate_limited: { label: "Rate Limited", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500", border: "border-amber-500/30" },
 unhealthy: { label: "Temporary Failure", bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500", border: "border-orange-500/30" },
 quota_exhausted: { label: "Quota Exhausted", bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", dot: "bg-red-500", border: "border-red-500/30" },
 disabled: { label: "Disabled", bg: "bg-zinc-500/10", text: "text-zinc-500 dark:text-zinc-400", dot: "bg-zinc-400", border: "border-zinc-500/30" },
};

export async function loader({ request }: LoaderFunctionArgs) {
 const adminCheck = await verifyAdminSession(request);
 if (!adminCheck.isAdmin) throw redirect("/auth/admin");

 let records: any[] = [];
 try {
 records = await (await import("~/utils/health-service")).getAllHealthRecords();
 } catch { /* table may not exist */ }

 return { records, adminEmail: adminCheck.adminEmail };
}

function formatTime(iso: string | null): string {
 if (!iso) return "—";
 const d = new Date(iso);
 const now = new Date();
 const diff = now.getTime() - d.getTime();
 if (diff < 60000) return "Just now";
 if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
 if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
 return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AdminHealthMonitorRoute() {
 const { records, adminEmail } = useLoaderData<typeof loader>();
 const [loading, setLoading] = useState(false);
 const [resetting, setResetting] = useState<string | null>(null);

 const refresh = useCallback(async () => {
 setLoading(true);
 await new Promise(r => setTimeout(r, 500));
 window.location.reload();
 }, []);

 const handleReset = useCallback(async (keyId: string) => {
 setResetting(keyId);
 try {
 await (await import("~/utils/health-service")).resetHealthStatus(keyId);
 window.location.reload();
 } catch (err: any) { alert("Failed: " + err.message); }
 setResetting(null);
 }, []);

 const handleRetest = useCallback(async (keyId: string) => {
 setResetting(keyId);
 try {
 await (await import("~/utils/health-service")).runHealthCheck(keyId);
 window.location.reload();
 } catch { /* ignore */ }
 setResetting(null);
 }, []);

 const stats = {
 total: records.length,
 healthy: records.filter((r) => r.status === 'healthy').length,
 rateLimited: records.filter((r) => r.status === 'rate_limited').length,
 unhealthy: records.filter((r) => r.status === 'unhealthy').length,
 quotaExhausted: records.filter((r) => r.status === 'quota_exhausted').length,
 disabled: records.filter((r) => r.status === 'disabled').length,
 };

 const grouped: Record<string, any[]> = {
 healthy: [],
 rate_limited: [],
 unhealthy: [],
 quota_exhausted: [],
 disabled: [],
 };

 for (const r of records) {
 const status = r.status || 'healthy';
 if (!grouped[status]) grouped[status] = [];
 grouped[status].push(r);
 }

 const order = ['healthy', 'rate_limited', 'unhealthy', 'quota_exhausted', 'disabled'];

 return (
 <div className="min-h-screen bg-background text-foreground">
 <AdminSidebar collapsed={false} onToggle={() => {}} adminEmail={adminEmail || undefined} />
 <main className="ml-[220px] min-h-screen">
 <div className="max-w-[1400px] space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-3xl font-bold text-foreground">Health Monitor</h1>
 <p className="text-muted-foreground text-sm mt-1">Real-time status of all upstream provider keys</p>
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-1.5">
 <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
 Refresh
 </Button>
 <Button size="sm" className="gap-1.5" onClick={() => window.location.reload()}>
 <FiActivity className="w-3.5 h-3.5" />
 Check All
 </Button>
 </div>
 </div>

 {/* Status Summary */}
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
 {[
 { label: "Healthy", count: stats.healthy, config: HEALTH_CONFIG.healthy },
 { label: "Rate Limited", count: stats.rateLimited, config: HEALTH_CONFIG.rate_limited },
 { label: "Temporary Failure", count: stats.unhealthy, config: HEALTH_CONFIG.unhealthy },
 { label: "Quota Exhausted", count: stats.quotaExhausted, config: HEALTH_CONFIG.quota_exhausted },
 { label: "Disabled", count: stats.disabled, config: HEALTH_CONFIG.disabled },
 ].map((s) => (
 <div key={s.label} className={cn("p-4 rounded-xl border", s.config.bg, s.config.border)}>
 <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
 <p className={cn("text-3xl font-bold mt-1 tracking-tight", s.config.text)}>{s.count}</p>
 <div className="flex items-center gap-1.5 mt-2">
 <span className={cn("w-2 h-2 rounded-full", s.config.dot)} />
 <span className="text-[10px] text-muted-foreground">of {stats.total} keys</span>
 </div>
 </div>
 ))}
 </div>

 {/* Legend */}
 <div className="flex flex-wrap gap-4 p-4 rounded-xl border border-border bg-card/40">
 <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">Legend:</p>
 {Object.entries(HEALTH_CONFIG).map(([key, config]) => (
 <div key={key} className="flex items-center gap-1.5">
 <span className={cn("w-3 h-3 rounded-full border-2", config.dot, config.bg, config.border)} />
 <span className="text-xs text-muted-foreground">{config.label}</span>
 </div>
 ))}
 </div>

 {/* Health Cards by Status */}
 {order.map((status) => {
 const items = grouped[status] || [];
 if (items.length === 0) return null;
 const config = HEALTH_CONFIG[status];

 return (
 <div key={status} className="space-y-3">
 <div className="flex items-center gap-2 mb-2">
 <span className={cn("w-2.5 h-2.5 rounded-full", config.dot)} />
 <h3 className="text-sm font-bold text-foreground">{config.label} ({items.length})</h3>
 </div>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
 {items.map((record: any) => {
 const mk = record.master_api_keys || {};
 const isResetting = resetting === record.master_api_key_id;

 return (
 <div key={record.id} className={cn("p-5 rounded-2xl border transition-all", config.bg, config.border)}>
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-3">
 <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold", config.bg, config.text)}>
 {mk.provider?.slice(0, 2) || '??'}
 </div>
 <div>
 <p className="font-semibold text-foreground text-sm">{mk.name || 'Unknown Key'}</p>
 <p className="text-xs text-muted-foreground">{mk.provider || 'Unknown'} · Priority {mk.priority || '?'}</p>
 </div>
 </div>
 <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", config.bg, config.text)}>
 {config.label}
 </span>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
 <div className="p-2.5 rounded-lg bg-background/50 border border-border/50">
 <p className="text-[10px] font-semibold text-muted-foreground uppercase">Success Rate</p>
 <p className={cn("text-sm font-bold mt-0.5", (record.success_rate ?? 100) >= 95 ? "text-emerald-500" : "text-red-500")}>
 {record.success_rate ?? 100}%
 </p>
 </div>
 <div className="p-2.5 rounded-lg bg-background/50 border border-border/50">
 <p className="text-[10px] font-semibold text-muted-foreground uppercase">Avg Response</p>
 <p className="text-sm font-bold mt-0.5 text-foreground">{record.avg_response_time_ms ?? 0}ms</p>
 </div>
 <div className="p-2.5 rounded-lg bg-background/50 border border-border/50">
 <p className="text-[10px] font-semibold text-muted-foreground uppercase">Consec. Failures</p>
 <p className={cn("text-sm font-bold mt-0.5", (record.consecutive_failures ?? 0) > 0 ? "text-red-500" : "text-emerald-500")}>
 {record.consecutive_failures ?? 0}
 </p>
 </div>
 <div className="p-2.5 rounded-lg bg-background/50 border border-border/50">
 <p className="text-[10px] font-semibold text-muted-foreground uppercase">Last Check</p>
 <p className="text-sm font-bold mt-0.5 text-foreground">{formatTime(record.last_check)}</p>
 </div>
 </div>

 {record.last_error && (
 <div className="mt-3 p-2.5 rounded-lg bg-red-500/5 border border-red-500/15">
 <p className="text-[11px] text-red-400 font-mono truncate" title={record.last_error}>
 <FiAlertTriangle className="w-3 h-3 inline mr-1" />
 {record.last_error}
 </p>
 </div>
 )}

 <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
 <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => handleRetest(record.master_api_key_id)} disabled={isResetting}>
 {isResetting ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiPlay className="w-3.5 h-3.5" />}
 Retry Test
 </Button>
 <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => handleReset(record.master_api_key_id)} disabled={isResetting}>
 {isResetting ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiRotateCcw className="w-3.5 h-3.5" />}
 Reset Status
 </Button>
 </div>
 </div>
 )})}
 </div>
 </div>
 )})}
 </div>
 </main>
 </div>
 );
}
