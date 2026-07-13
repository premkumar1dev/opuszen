/**
 * Admin - Request Logs
 * Route: /auth/admin/gateway/logs
 */
import { useState, useCallback } from "react";
import { type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { useLoaderData } from "react-router";
import { verifyAdminSession } from "~/utils/admin-auth";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import { cn } from "~/lib/utils";
import type { ApiRequestLogRow } from "~/types/gateway";
import {
 FiSearch,
 FiDownload,
 FiRefreshCw,
 FiFilter,
 FiLoader,
 FiClock,
 FiZap,
 FiCheckCircle,
 FiXCircle,
 FiServer,
} from "react-icons/fi";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

export const meta: MetaFunction = () => [{ title: "Request Logs | Admin | OpusZen" }];

const PAGE_SIZE = 20;

export async function loader({ request }: LoaderFunctionArgs) {
 const adminCheck = await verifyAdminSession(request);
 if (!adminCheck.isAdmin) throw redirect("/auth/admin");

 let logs: ApiRequestLogRow[] = [];
 let total = 0;
 try {
 const result = await (await import("~/utils/logging-service")).getRequestLogs({}, 1, PAGE_SIZE);
 logs = result.logs;
 total = result.total;
 } catch { /* table may not exist */ }

 return { logs, total, page: 1, adminEmail: adminCheck.adminEmail };
}

export default function AdminRequestLogsRoute() {
 const { logs: initialLogs, total: initialTotal, adminEmail } = useLoaderData<typeof loader>();
 const [logs, setLogs] = useState<ApiRequestLogRow[]>(initialLogs);
 const [total, setTotal] = useState(initialTotal);
 const [page, setPage] = useState(1);
 const [loading, setLoading] = useState(false);
 const [filters, setFilters] = useState<{ search: string; provider: string; model: string; status: 'success' | 'error' | '' }>({ search: '', provider: '', model: '', status: '' });

 const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

 const refresh = useCallback(async () => {
 setLoading(true);
 try {
  const result = await (await import("~/utils/logging-service")).getRequestLogs({
    ...filters,
    status: filters.status === '' ? undefined : filters.status
  }, page, PAGE_SIZE);
 setLogs(result.logs);
 setTotal(result.total);
 } catch { /* ignore */ }
 setLoading(false);
 }, [filters, page]);

 const handleExport = useCallback(() => {
 if (logs.length === 0) return;
 const headers = ['ID', 'Request ID', 'Provider', 'Model', 'Status', 'Tokens', 'Credits', 'Time (ms)', 'Date', 'IP'];
 const rows = logs.map((l) => [
 l.id, l.request_id, l.provider, l.model, l.http_status,
 `${l.prompt_tokens}+${l.completion_tokens}`, l.credits_used.toFixed(4),
 l.response_time_ms, l.created_at, l.ip_address,
 ]);
 const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
 const blob = new Blob([csv], { type: 'text/csv' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `request-logs-${new Date().toISOString().split('T')[0]}.csv`;
 a.click();
 URL.revokeObjectURL(url);
 }, [logs]);

 const getStatusColor = (status: number) => {
 if (status >= 200 && status < 300) return 'text-emerald-500';
 if (status === 429) return 'text-amber-500';
 if (status >= 500) return 'text-red-500';
 return 'text-muted-foreground';
 };

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
 <h1 className="text-3xl font-bold text-foreground">Request Logs</h1>
 <p className="text-muted-foreground text-sm mt-1">All API requests routed through the gateway ({total.toLocaleString()} total)</p>
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={handleExport} disabled={logs.length === 0} className="gap-1.5">
 <FiDownload className="w-3.5 h-3.5" />
 Export CSV
 </Button>
 <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-1.5">
 <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
 Refresh
 </Button>
 </div>
 </div>

 {/* Filters */}
 <div className="p-4 rounded-xl border border-border bg-card/60 flex flex-wrap gap-3 items-end">
 <div className="flex-1 min-w-[200px]">
 <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Search</label>
 <Input placeholder="Model, provider, error..." value={filters.search} onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))} />
 </div>
 <div className="w-40">
 <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Provider</label>
 <Input placeholder="OpenAI..." value={filters.provider} onChange={(e) => setFilters(f => ({ ...f, provider: e.target.value }))} />
 </div>
 <Button variant="ghost" size="sm" onClick={() => { setFilters({ search: '', provider: '', model: '', status: '' }); setPage(1); }} className="h-9">
 <FiRefreshCw className="w-3.5 h-3.5 mr-1" /> Clear
 </Button>
 </div>

 {/* Logs Table */}
 <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-sm text-left">
 <thead>
 <tr className="text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border">
 <th className="px-4 py-3 font-semibold">Time</th>
 <th className="px-4 py-3 font-semibold">Request ID</th>
 <th className="px-4 py-3 font-semibold">Provider</th>
 <th className="px-4 py-3 font-semibold">Model</th>
 <th className="px-4 py-3 font-semibold text-right">Tokens</th>
 <th className="px-4 py-3 font-semibold text-right">Credits</th>
 <th className="px-4 py-3 font-semibold text-right">Time (ms)</th>
 <th className="px-4 py-3 font-semibold text-center">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/40">
 {logs.length === 0 ? (
 <tr>
 <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
 <FiClock className="w-8 h-8 mx-auto mb-2 opacity-30" />
 <p className="text-sm font-medium">No logs found</p>
 </td>
 </tr>
 ) : logs.map((log) => (
 <tr key={log.id} className="hover:bg-muted/10 transition-colors">
 <td className="px-4 py-3">
 <span className="text-xs text-muted-foreground font-mono">{formatTime(log.created_at)}</span>
 </td>
 <td className="px-4 py-3">
 <code className="text-[11px] font-mono text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{log.request_id.slice(-12)}</code>
 </td>
 <td className="px-4 py-3">
 <span className="text-xs font-medium">{log.provider}</span>
 </td>
 <td className="px-4 py-3">
 <span className="text-xs font-mono text-muted-foreground">{log.model}</span>
 </td>
 <td className="px-4 py-3 text-right">
 <span className="text-xs font-mono">{log.total_tokens.toLocaleString()}</span>
 </td>
 <td className="px-4 py-3 text-right">
 <span className="text-xs font-mono">${log.credits_used.toFixed(4)}</span>
 </td>
 <td className="px-4 py-3 text-right">
 <span className={cn("text-xs font-mono", log.response_time_ms > 5000 ? "text-amber-500" : "text-muted-foreground")}>
 {log.response_time_ms}ms
 </span>
 </td>
 <td className="px-4 py-3 text-center">
 <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", log.is_success ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
 {log.is_success ? <FiCheckCircle className="w-3 h-3" /> : <FiXCircle className="w-3 h-3" />}
 {log.http_status}
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
 <p className="text-xs text-muted-foreground">
 Page {page} of {totalPages} ({total} total)
 </p>
 <div className="flex items-center gap-1">
 <Button variant="outline" size="sm" className="w-8 h-8 p-0" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
 ←
 </Button>
 {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
 const p = i + 1;
 return (
 <Button key={p} variant={page === p ? "default" : "ghost"} size="sm" className="w-8 h-8 p-0 text-xs" onClick={() => setPage(p)}>
 {p}
 </Button>
 );
 })}
 {totalPages > 5 && <span className="px-1 text-xs text-muted-foreground">…</span>}
 <Button variant="outline" size="sm" className="w-8 h-8 p-0" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
 →
 </Button>
 </div>
 </div>
 )}
 </div>
 </div>
 </main>
 </div>
 );
}
