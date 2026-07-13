/**
 * Admin - Failover Logs
 * Route: /auth/admin/gateway/failover-logs
 */
import { useState, useCallback } from "react";
import { type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { useLoaderData } from "react-router";
import { verifyAdminSession } from "~/utils/admin-auth";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import { cn } from "~/lib/utils";
import type { ApiFailoverLogRow } from "~/types/gateway";
import {
 FiAlertTriangle,
 FiRefreshCw,
 FiClock,
 FiServer,
 FiArrowRight,
 FiDownload,
 FiLoader,
} from "react-icons/fi";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export const meta: MetaFunction = () => [{ title: "Failover Logs | Admin | OpusZen" }];

const PAGE_SIZE = 20;

export async function loader({ request }: LoaderFunctionArgs) {
 const adminCheck = await verifyAdminSession(request);
 if (!adminCheck.isAdmin) throw redirect("/auth/admin");

 let logs: ApiFailoverLogRow[] = [];
 let total = 0;
 try {
 const result = await (await import("~/utils/logging-service")).getFailoverLogs(1, PAGE_SIZE);
 logs = result.logs;
 total = result.total;
 } catch { /* table may not exist */ }

 return { logs, total, page: 1, adminEmail: adminCheck.adminEmail };
}

export default function AdminFailoverLogsRoute() {
 const { logs: initialLogs, total: initialTotal, adminEmail } = useLoaderData<typeof loader>();
 const [logs, setLogs] = useState<ApiFailoverLogRow[]>(initialLogs);
 const [total, setTotal] = useState(initialTotal);
 const [page, setPage] = useState(1);
 const [loading, setLoading] = useState(false);

 const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

 const refresh = useCallback(async () => {
 setLoading(true);
 try {
 const result = await (await import("~/utils/logging-service")).getFailoverLogs(page, PAGE_SIZE);
 setLogs(result.logs);
 setTotal(result.total);
 } catch { /* ignore */ }
 setLoading(false);
 }, [page]);

 const handleExport = useCallback(() => {
 if (logs.length === 0) return;
 const headers = ['Request ID', 'Original Key', 'New Key', 'Original Provider', 'New Provider', 'Reason', 'HTTP Status', 'Retry', 'Date'];
 const rows = logs.map((l) => [
 l.request_id, l.original_master_key_id ?? 'unknown', l.new_master_key_id ?? 'unknown',
 l.original_provider, l.new_provider, l.failure_reason, l.http_status ?? '', l.retry_number, l.created_at,
 ]);
 const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
 const blob = new Blob([csv], { type: 'text/csv' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `failover-logs-${new Date().toISOString().split('T')[0]}.csv`;
 a.click();
 URL.revokeObjectURL(url);
 }, [logs]);

 const formatTime = (iso: string) => new Date(iso).toLocaleString(undefined, {
 month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
 });

 return (
 <div className="min-h-screen bg-background text-foreground">
 <AdminSidebar collapsed={false} onToggle={() => {}} adminEmail={adminEmail || undefined} />
 <main className="ml-[220px] min-h-screen">
 <div className="max-w-[1400px] space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-3xl font-bold text-foreground">Failover Logs</h1>
 <p className="text-muted-foreground text-sm mt-1">Automatic key-switching events ({total.toLocaleString()} total)</p>
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={handleExport} disabled={logs.length === 0} className="gap-1.5">
 <FiDownload className="w-3.5 h-3.5" />
 Export
 </Button>
 <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-1.5">
 <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
 Refresh
 </Button>
 </div>
 </div>

 {/* Summary */}
 {logs.length > 0 && (
 <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
 <FiAlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
 <p className="text-sm text-muted-foreground">
 <span className="font-semibold text-foreground">{total}</span> failover events recorded.
 {logs.filter(l => l.new_master_key_id && l.new_master_key_id !== l.original_master_key_id).length > 0 && (
 <span> Latest: key switch from {logs[0]?.original_provider} to {logs[0]?.new_provider}.</span>
 )}
 </p>
 </div>
 )}

 {/* Failover Timeline */}
 <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-sm text-left">
 <thead>
 <tr className="text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border">
 <th className="px-4 py-3 font-semibold">Time</th>
 <th className="px-4 py-3 font-semibold">Request</th>
 <th className="px-4 py-3 font-semibold">Failure</th>
 <th className="px-4 py-3 font-semibold text-center">Retry</th>
 <th className="px-4 py-3 font-semibold">Model</th>
 <th className="px-4 py-3 font-semibold">Error</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/40">
 {logs.length === 0 ? (
 <tr>
 <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
 <FiServer className="w-8 h-8 mx-auto mb-2 opacity-30" />
 <p className="text-sm font-medium">No failover events</p>
 <p className="text-xs">When a master key fails, the event appears here</p>
 </td>
 </tr>
 ) : logs.map((log) => (
 <tr key={log.id} className="hover:bg-muted/10 transition-colors">
 <td className="px-4 py-3">
 <span className="text-xs text-muted-foreground font-mono">{formatTime(log.created_at)}</span>
 </td>
 <td className="px-4 py-3">
 <div className="flex items-center gap-2 text-xs">
 <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500")}>
 {log.original_provider}
 </span>
 <FiArrowRight className="w-3 h-3 text-muted-foreground" />
 <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", log.new_master_key_id ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
 {log.new_provider || 'FAILED'}
 </span>
 </div>
 </td>
 <td className="px-4 py-3">
 <span className="text-xs text-muted-foreground">{log.failure_reason}</span>
 </td>
 <td className="px-4 py-3 text-center">
 <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold">
 {log.retry_number}
 </span>
 </td>
 <td className="px-4 py-3">
 <span className="text-xs font-mono text-muted-foreground">{log.model}</span>
 </td>
 <td className="px-4 py-3">
 <span className="text-xs text-muted-foreground truncate max-w-[200px] block" title={log.error_message}>
 {log.error_message}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 {/* Pagination */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
 <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
 <div className="flex items-center gap-1">
 <Button variant="outline" size="sm" className="w-8 h-8 p-0" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</Button>
 {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
 <Button key={i + 1} variant={page === i + 1 ? "default" : "ghost"} size="sm" className="w-8 h-8 p-0 text-xs" onClick={() => setPage(i + 1)}>{i + 1}</Button>
 ))}
 {totalPages > 5 && <span className="px-1 text-xs text-muted-foreground">…</span>}
 <Button variant="outline" size="sm" className="w-8 h-8 p-0" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</Button>
 </div>
 </div>
 )}
 </div>
 </div>
 </main>
 </div>
 );
}
