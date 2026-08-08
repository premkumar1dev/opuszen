import { useState, useCallback, useEffect } from "react";
import { type LoaderFunctionArgs, type MetaFunction, redirect, useLocation } from "react-router";
import { useLoaderData } from "react-router";
import { verifyAdminSession } from "~/utils/admin-auth";
import { supabaseServer } from "~/utils/supabase.server";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import { cn } from "~/lib/utils";
import {
	Activity,
	RefreshCw,
	Loader,
	Search,
	ChevronLeft,
	ChevronRight,
	CreditCard,
	Key,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export const meta: MetaFunction = () => [{ title: "Activity Logs | Admin | OpusZen" }];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityLogEntry {
	id: string;
	action: string;
	entity_type: string;
	entity_id: string;
	admin_email: string | null;
	admin_ip: string | null;
	details: Record<string, any>;
	created_at: string;
}

interface LoaderData {
	logs: ActivityLogEntry[];
	adminEmail: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
	plan_created: { label: "Plan Created", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
	plan_updated: { label: "Plan Updated", color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
	plan_deleted: { label: "Plan Deleted", color: "text-red-600 bg-red-500/10 border-red-500/20" },
	plan_assigned: { label: "Plan Assigned", color: "text-violet-600 bg-violet-500/10 border-violet-500/20" },
	plan_removed: { label: "Assignment Removed", color: "text-orange-600 bg-orange-500/10 border-orange-500/20" },
	plan_duplicated: { label: "Plan Duplicated", color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20" },
};

const ENTITY_ICONS: Record<string, typeof CreditCard> = {
	plan: CreditCard,
	assignment: Key,
};

function formatDateTime(iso: string): string {
	const d = new Date(iso);
	if (isNaN(d.getTime())) return iso;
	return d.toLocaleString("en-IN", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: true,
	});
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
	const months = Math.floor(days / 30);
	if (months < 12) return `${months}mo ago`;
	return `${Math.floor(days / 365)}y ago`;
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export async function loader({ request }: LoaderFunctionArgs) {
	const adminCheck = await verifyAdminSession(request);
	if (!adminCheck.isAdmin) throw redirect("/auth/admin");

	const url = new URL(request.url);
	const actionFilter = url.searchParams.get("action") || undefined;
	const entityTypeFilter = url.searchParams.get("entity_type") || undefined;

	let query = supabaseServer
		.from("admin_activity_logs")
		.select("*")
		.order("created_at", { ascending: false });

	if (actionFilter) query = query.eq("action", actionFilter);
	if (entityTypeFilter) query = query.eq("entity_type", entityTypeFilter);

	const { data, error } = await query.limit(100);

	if (error || !data) {
		console.error("[activity-logs] loader error:", error);
	}

	return {
		logs: (data ?? []) as ActivityLogEntry[],
		adminEmail: adminCheck.adminEmail,
	};
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

export default function AdminActivityLogsRoute() {
	const { logs, adminEmail } = useLoaderData<LoaderData>();
	const location = useLocation();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [actionFilter, setActionFilter] = useState<string>("");
	const [entityFilter, setEntityFilter] = useState<string>("");
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);

	useEffect(() => { setMobileOpen(false); }, [location.pathname]);

	const refresh = useCallback(async () => {
		window.location.reload();
	}, []);
	const filtered = logs.filter((log) => {
		if (actionFilter && log.action !== actionFilter) return false;
		if (entityFilter && log.entity_type !== entityFilter) return false;
		if (search) {
			const q = search.toLowerCase();
			const searchable = [
				log.action,
				log.entity_type,
				log.admin_email || "",
				log.entity_id,
				JSON.stringify(log.details),
			].join(" ").toLowerCase();
			if (!searchable.includes(q)) return false;
		}
		return true;
	});

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	// Unique values for filters
	const uniqueActions = [...new Set(logs.map((l) => l.action))].sort();
	const uniqueEntityTypes = [...new Set(logs.map((l) => l.entity_type))].sort();

	const getActionMeta = (action: string) => ACTION_LABELS[action] || { label: action, color: "text-muted-foreground bg-muted/50 border-border/50" };
	const EntityIcon = (entityType: string) => ENTITY_ICONS[entityType] || Activity;

	return (
		<div className="min-h-screen bg-background text-foreground">
			<AdminSidebar
				collapsed={false}
				onToggle={() => {}}
				adminEmail={adminEmail || undefined}
				mobileOpen={mobileOpen}
				onMobileToggle={() => setMobileOpen((v) => !v)}
			/>

			<main className="min-h-screen md:ml-[220px]">
				{/* Mobile header */}
				<div className="sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b border-border/60 bg-background/95 backdrop-blur md:hidden">
					<button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors" aria-label="Open menu">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
							<path d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
					<span className="text-sm font-semibold">Activity Logs</span>
				</div>

				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div>
							<div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono font-semibold text-indigo-600 uppercase tracking-wider">
								<Activity className="w-3 h-3" />
								Audit Trail
							</div>
							<h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
								Activity Logs
							</h1>
							<p className="text-muted-foreground text-sm mt-1">
								{filtered.length} of {logs.length} log entries
							</p>
						</div>
						<Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
							<RefreshCw className="w-3.5 h-3.5" />
							Refresh
						</Button>
					</div>

					{/* Filters */}
					<div className="flex flex-col sm:flex-row gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
							<Input
								placeholder="Search logs…"
								value={search}
								onChange={(e) => { setSearch(e.target.value); setPage(1); }}
								className="pl-9 h-10"
							/>
						</div>
						<div className="flex items-center gap-2">
							<select
								value={actionFilter}
								onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
								className="h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
							>
								<option value="">All actions</option>
								{uniqueActions.map((a) => (
									<option key={a} value={a}>{ACTION_LABELS[a]?.label || a}</option>
								))}
							</select>
							<select
								value={entityFilter}
								onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
								className="h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
							>
								<option value="">All entities</option>
								{uniqueEntityTypes.map((e) => (
									<option key={e} value={e}>{e}</option>
								))}
							</select>
						</div>
					</div>

					{/* Logs */}
					{paginated.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-border bg-card">
							<Activity className="w-12 h-12 text-muted-foreground/30 mb-3" />
							<p className="text-sm font-medium text-muted-foreground">No log entries found</p>
						</div>
					) : (
						<div className="rounded-2xl border border-border bg-card overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full text-left text-sm border-collapse">
									<thead>
										<tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
											<th className="py-3 px-4 font-semibold">Action</th>
											<th className="py-3 px-4 font-semibold">Entity</th>
											<th className="py-3 px-4 font-semibold">Admin</th>
											<th className="py-3 px-4 font-semibold">Details</th>
											<th className="py-3 px-4 font-semibold">Timestamp</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border/40">
										{paginated.map((log) => {
											const Icon = EntityIcon(log.entity_type);
											const meta = getActionMeta(log.action);
											return (
												<tr key={log.id} className="hover:bg-muted/10 transition-colors">
													<td className="py-3 px-4">
														<span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", meta.color)}>
															{meta.label}
														</span>
													</td>
													<td className="py-3 px-4">
														<div className="flex items-center gap-2">
															<Icon className="w-3.5 h-3.5 text-muted-foreground" />
															<div>
																<p className="text-xs font-medium text-foreground capitalize">{log.entity_type}</p>
																<p className="text-[10px] text-muted-foreground font-mono">{log.entity_id.slice(0, 8)}</p>
															</div>
														</div>
													</td>
													<td className="py-3 px-4">
														<span className="text-xs text-foreground">
															{log.admin_email || "system"}
														</span>
													</td>
													<td className="py-3 px-4">
														{Object.keys(log.details).length > 0 ? (
															<details className="group">
																<summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground">
																	View details
																</summary>
																<pre className="mt-1 p-2 rounded-lg bg-muted/50 text-[10px] font-mono text-muted-foreground max-w-xs overflow-x-auto">
																	{JSON.stringify(log.details, null, 2)}
																</pre>
															</details>
														) : (
															<span className="text-xs text-muted-foreground/50">—</span>
														)}
													</td>
													<td className="py-3 px-4">
														<div>
															<p className="text-xs text-foreground">{formatDateTime(log.created_at)}</p>
															<p className="text-[10px] text-muted-foreground">{formatRelative(log.created_at)}</p>
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card">
							<p className="text-xs text-muted-foreground">
								Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
							</p>
							<div className="flex items-center gap-1">
								<Button
									variant="outline"
									size="sm"
									className="w-8 h-8 p-0"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1}
								>
									<ChevronLeft className="w-4 h-4" />
								</Button>
								{Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
									const p = i + 1;
									return (
										<Button
											key={p}
											variant={page === p ? "default" : "ghost"}
											size="sm"
											className="w-8 h-8 p-0"
											onClick={() => setPage(p)}
										>
											{p}
										</Button>
									);
								})}
								<Button
									variant="outline"
									size="sm"
									className="w-8 h-8 p-0"
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									disabled={page === totalPages}
								>
									<ChevronRight className="w-4 h-4" />
								</Button>
							</div>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
