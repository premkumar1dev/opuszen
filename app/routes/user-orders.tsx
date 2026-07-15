import { useState, useEffect } from "react";
import { type MetaFunction } from "react-router";
import { DashboardSidebar } from "../components/dashboard/dashboard-sidebar";
import {
	FiShoppingBag,
	FiRefreshCw,
	FiEye,
	FiLoader,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "~/utils/supabase";
import { useDashboardTheme } from "~/utils/theme";

interface Order {
	id: string;
	username: string;
	plan_name: string;
	amount: number;
	currency: string;
	status: "pending" | "completed" | "failed" | "cancelled" | "refunded";
	payment_method: string;
	payment_ref: string;
	coupon_code: string;
	discount: number;
	final_amount: number;
	notes: string;
	completed_at: string | null;
	created_at: string;
	updated_at: string;
}

export const meta: MetaFunction = () => [
	{ title: "My Orders | Opuszen" },
	{ name: "description", content: "View and manage your orders." },
];

const STATUS: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
	completed: { label: "Completed", bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20", dot: "bg-emerald-500" },
	pending: { label: "Pending", bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20", dot: "bg-amber-500 animate-pulse" },
	failed: { label: "Failed", bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/20", dot: "bg-red-500" },
	cancelled: { label: "Cancelled", bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20", dot: "bg-zinc-400" },
	refunded: { label: "Refunded", bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", dot: "bg-violet-400" },
};

function fmtDate(iso: string | null): string {
	if (!iso) return "—";
	const d = new Date(iso);
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtCurrency(n: number, c = "USD"): string {
	return new Intl.NumberFormat("en-US", { style: "currency", currency: c, minimumFractionDigits: 2 }).format(n);
}

export default function UserOrdersRoute() {
	const { theme, toggleTheme } = useDashboardTheme();
	const [user, setUser] = useState<any>(null);
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<"all" | "pending" | "completed" | "failed" | "cancelled" | "refunded">("all");
	const [selected, setSelected] = useState<Order | null>(null);
	const [sidebarOpen, setSidebarOpen] = useState(false);

	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => setUser(data.user));
		fetchOrders();
	}, []);

	async function fetchOrders() {
		setLoading(true);
		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session) return;
			const { data } = await supabase.from("orders").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
			if (data) setOrders(data as Order[]);
		} catch { }
		setLoading(false);
	}

	const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

	return (
		<div className="dashboard flex min-h-screen">
			{/* Mobile overlay */}
			{sidebarOpen && <div className="fixed inset-0 z-[55] dashboard-overlay backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />}

			{/* Mobile sidebar drawer */}
			<div className={`fixed top-0 left-0 z-[60] h-full md:hidden transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
				<DashboardSidebar collapsed={false} onToggle={() => setSidebarOpen(false)} userEmail={user?.email} theme={theme} onThemeToggle={toggleTheme} />
			</div>

			{/* Desktop sidebar */}
			<div className="hidden md:block">
				<DashboardSidebar collapsed={false} onToggle={() => { }} userEmail={user?.email} theme={theme} onThemeToggle={toggleTheme} />
			</div>

			{/* Main content — offset by sidebar width */}
			<main className="flex-1 min-h-screen md:ml-[240px]">
				<header className="sticky top-0 z-40 border-b border-[var(--dashboard-border)]" style={{ backgroundColor: `color-mix(in srgb, var(--dashboard-bg) 85%, transparent)`, WebkitBackdropFilter: 'saturate(180%) blur(8px)', backdropFilter: 'saturate(180%) blur(8px)' }}>
					<div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8 gap-2">
						<div className="flex items-center gap-3 min-w-0">
							<button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--dashboard-nav-hover)] text-[var(--dashboard-text-secondary)] transition-colors shrink-0" aria-label="Open menu">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
							</button>
							<div className="min-w-0">
								<h1 className="text-sm font-semibold text-[var(--dashboard-text)] truncate">My Orders</h1>
								<p className="text-[11px] text-[var(--dashboard-text-muted)] hidden sm:block">{orders.length} order{orders.length !== 1 ? "s" : ""} total</p>
							</div>
						</div>
						<button onClick={fetchOrders} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] transition-all disabled:opacity-50 shrink-0 touch-manipulation">
							<FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
							<span className="hidden sm:inline">Refresh</span>
						</button>
					</div>
				</header>

				<div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto w-full">
					{/* Stats */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
						<div className="dashboard-card p-4 rounded-2xl dashboard-card-hover transition-all">
							<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider">Total</p>
							<p className="text-xl sm:text-2xl font-bold text-[var(--dashboard-text)] mt-1">{orders.length}</p>
						</div>
						<div className="dashboard-card p-4 rounded-2xl dashboard-card-hover transition-all">
							<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider">Completed</p>
							<p className="text-xl sm:text-2xl font-bold text-emerald-500 mt-1">{orders.filter((o) => o.status === "completed").length}</p>
						</div>
						<div className="dashboard-card p-4 rounded-2xl dashboard-card-hover transition-all">
							<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider">Pending</p>
							<p className="text-xl sm:text-2xl font-bold text-amber-500 mt-1">{orders.filter((o) => o.status === "pending").length}</p>
						</div>
						<div className="dashboard-card p-4 rounded-2xl dashboard-card-hover transition-all">
							<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider">Total Spent</p>
							<p className="text-base sm:text-xl font-bold text-indigo-500 mt-1 truncate">{fmtCurrency(orders.filter((o) => o.status === "completed").reduce((s, o) => s + o.final_amount, 0))}</p>
						</div>
					</div>

					{/* Filter tabs */}
					<div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
						{(["all", "pending", "completed", "failed", "cancelled", "refunded"] as const).map((f) => (
							<button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap touch-manipulation shrink-0 ${filter === f ? "bg-indigo-500/15 text-indigo-500 border border-indigo-500/30" : "text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] border border-transparent"}`}>
								{f === "all" ? "All" : STATUS[f]?.label || f}
								{f !== "all" && <span className="ml-1 text-[10px] opacity-60">({orders.filter((o) => o.status === f).length})</span>}
							</button>
						))}
					</div>

					{/* Orders table on desktop, cards on mobile */}
					<div className="dashboard-card rounded-2xl overflow-hidden">
						{loading && orders.length === 0 ? (
							<div className="flex items-center justify-center py-16 sm:py-20">
								<FiLoader className="w-8 h-8 animate-spin text-[var(--dashboard-text-muted)]" />
							</div>
						) : filtered.length === 0 ? (
							<div className="text-center py-16 sm:py-20 px-4">
								<FiShoppingBag className="w-10 h-10 text-[var(--dashboard-text-muted)] mx-auto mb-3" />
								<p className="text-sm text-[var(--dashboard-text-secondary)] font-medium">No orders found</p>
								<p className="text-xs text-[var(--dashboard-text-muted)] mt-1">{filter !== "all" ? `No ${filter} orders yet.` : "Your orders will appear here after making a purchase."}</p>
							</div>
						) : (
							<>
								{/* Mobile card list */}
								<div className="md:hidden divide-y divide-[var(--dashboard-border)]">
									{filtered.map((order) => {
										const cfg = STATUS[order.status] || STATUS.pending;
										return (
											<div key={order.id} onClick={() => setSelected(order)} className="p-4 hover:bg-[var(--dashboard-nav-hover)] transition-all cursor-pointer touch-manipulation active:bg-[var(--dashboard-nav-hover)]">
												<div className="flex items-start justify-between gap-3 mb-2">
													<div className="min-w-0 flex-1">
														<p className="text-xs font-medium text-[var(--dashboard-text)] truncate">{order.plan_name}</p>
														<code className="text-[10px] font-mono text-[var(--dashboard-text-muted)]">#{order.id.slice(0, 8)}</code>
													</div>
													<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
														<span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
														{cfg.label}
													</span>
												</div>
												<div className="flex items-center justify-between gap-2">
													<div className="flex items-center gap-3 text-[11px] text-[var(--dashboard-text-muted)]">
														<span>{fmtDate(order.created_at)}</span>
														{order.payment_method && <span className="truncate">{order.payment_method}</span>}
													</div>
													<p className="text-sm font-bold text-[var(--dashboard-text)] font-mono shrink-0">{fmtCurrency(order.final_amount, order.currency)}</p>
												</div>
											</div>
										);
									})}
								</div>

								{/* Desktop table */}
								<div className="hidden md:block table-responsive">
									<table className="w-full text-sm text-left">
										<thead>
											<tr className="text-xs uppercase text-[var(--dashboard-text-muted)] border-b border-[var(--dashboard-border)]">
												<th className="px-4 py-3 font-semibold">Order ID</th>
												<th className="px-4 py-3 font-semibold">Plan</th>
												<th className="px-4 py-3 font-semibold text-right">Amount</th>
												<th className="px-4 py-3 font-semibold text-center">Status</th>
												<th className="px-4 py-3 font-semibold hidden lg:table-cell">Payment</th>
												<th className="px-4 py-3 font-semibold hidden lg:table-cell">Date</th>
												<th className="px-4 py-3 font-semibold text-center">Actions</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-[var(--dashboard-border)]">
											{filtered.map((order) => {
												const cfg = STATUS[order.status] || STATUS.pending;
												return (
													<tr key={order.id} onClick={() => setSelected(order)} className="hover:bg-[var(--dashboard-nav-hover)] transition-all cursor-pointer">
														<td className="px-4 py-3"><code className="text-[11px] font-mono text-[var(--dashboard-text-muted)]">#{order.id.slice(0, 8)}</code></td>
														<td className="px-4 py-3">
															<p className="text-xs font-medium text-[var(--dashboard-text)] truncate max-w-[180px]">{order.plan_name}</p>
															{order.coupon_code && <p className="text-[10px] text-amber-500 font-mono">{order.coupon_code}</p>}
														</td>
														<td className="px-4 py-3 text-right">
															<p className="text-xs font-bold text-[var(--dashboard-text)] font-mono">{fmtCurrency(order.final_amount, order.currency)}</p>
															{order.discount > 0 && <p className="text-[10px] text-[var(--dashboard-text-muted)] line-through">{fmtCurrency(order.amount, order.currency)}</p>}
														</td>
														<td className="px-4 py-3 text-center">
															<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
																<span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
																{cfg.label}
															</span>
														</td>
														<td className="px-4 py-3 hidden lg:table-cell"><span className="text-[11px] text-[var(--dashboard-text-secondary)]">{order.payment_method || "—"}</span></td>
														<td className="px-4 py-3 hidden lg:table-cell"><span className="text-[11px] text-[var(--dashboard-text-muted)]">{fmtDate(order.created_at)}</span></td>
														<td className="px-4 py-3 text-center">
															<button onClick={(e) => { e.stopPropagation(); setSelected(order); }} className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-[var(--dashboard-text-muted)] hover:text-indigo-500 transition-colors cursor-pointer" aria-label="View"><FiEye className="w-3.5 h-3.5" /></button>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</>
						)}
					</div>
				</div>

				{/* Detail modal */}
				<AnimatePresence>
					{selected && (
						<div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
							<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 dashboard-overlay backdrop-blur-sm" onClick={() => setSelected(null)} />
							<motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={{ duration: 0.18 }} className="dashboard-modal-bg dashboard-card relative w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto border border-[var(--dashboard-border)]">
								<div className="flex items-center justify-between mb-5 sm:mb-6">
									<h2 className="text-base sm:text-lg font-bold text-[var(--dashboard-text)]">Order Details</h2>
									<button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] transition-all" aria-label="Close"><FiEye className="w-4 h-4 rotate-90" /></button>
								</div>
								<div className={`p-3 rounded-xl mb-4 border ${STATUS[selected.status]?.bg} ${STATUS[selected.status]?.border}`}>
									<div className="flex items-center gap-2">
										<span className={`w-2 h-2 rounded-full ${STATUS[selected.status]?.dot}`} />
										<span className={`text-sm font-bold ${STATUS[selected.status]?.text}`}>{STATUS[selected.status]?.label}</span>
									</div>
								</div>
								<div className="space-y-1">
									{[
										["Plan", selected.plan_name],
										...selected.coupon_code ? [["Coupon", selected.coupon_code, "text-amber-500"]] : [],
										["Amount", fmtCurrency(selected.amount, selected.currency)],
										...(selected.discount > 0 ? [["Discount", `-${fmtCurrency(selected.discount, selected.currency)}`, "text-amber-500"]] : []),
										["Final Amount", fmtCurrency(selected.final_amount, selected.currency), "font-bold text-[var(--dashboard-text)]"],
										["Payment Method", selected.payment_method || "—"],
										["Payment Ref", selected.payment_ref || "—", "font-mono text-[11px]"],
										["Created", fmtDate(selected.created_at)],
										...(selected.completed_at ? [["Completed", fmtDate(selected.completed_at), "text-emerald-500"]] : []),
										...(selected.notes ? [["Notes", selected.notes]] : []),
									].map(([label, value, cls = "text-[var(--dashboard-text-secondary)]"], i) => (
										<div key={i} className="flex items-start justify-between gap-3 py-2.5 border-b border-[var(--dashboard-border)] last:border-0">
											<span className="text-xs text-[var(--dashboard-text-muted)] shrink-0">{String(label)}</span>
											<span className={`text-xs font-medium text-right max-w-[60%] break-words ${String(cls)}`}>{String(value)}</span>
										</div>
									))}
								</div>
								<button onClick={() => setSelected(null)} className="w-full mt-6 py-2.5 rounded-xl border border-[var(--dashboard-border)] text-sm font-medium text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] transition-all cursor-pointer touch-manipulation">Close</button>
							</motion.div>
						</div>
					)}
				</AnimatePresence>
			</main>
		</div>
	);
}
