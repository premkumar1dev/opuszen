import { useState, useEffect } from "react";
import { type MetaFunction } from "react-router";
import { DashboardSidebar } from "../components/dashboard/dashboard-sidebar";
import {
	FiShoppingBag,
	FiRefreshCw,
	FiDownload,
	FiFilter,
	FiEye,
	FiChevronLeft,
	FiChevronRight,
	FiLoader,
	FiTrendingUp,
	FiClock,
	FiXCircle,
	FiCopy,
	FiExternalLink,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa6";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "~/utils/supabase";

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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
	completed: { label: "Completed", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-500" },
	pending: { label: "Pending", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-500 animate-pulse" },
	failed: { label: "Failed", bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", dot: "bg-red-500" },
	cancelled: { label: "Cancelled", bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20", dot: "bg-zinc-500" },
	refunded: { label: "Refunded", bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", dot: "bg-violet-500" },
};

function formatDate(iso: string | null): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (isNaN(d.getTime())) return iso;
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(n: number, currency = "USD"): string {
	return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);
}

export default function UserOrdersRoute() {
	const [user, setUser] = useState<any>(null);
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [filter, setFilter] = useState<"all" | "pending" | "completed" | "failed" | "cancelled" | "refunded">("all");
	const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => setUser(data.user));
		fetchOrders();
	}, []);

	async function fetchOrders() {
		setLoading(true);
		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session) return;
			const { data } = await supabase
				.from("orders")
				.select("*")
				.eq("user_id", session.user.id)
				.order("created_at", { ascending: false });
			if (data) setOrders(data as Order[]);
		} catch {}
		setLoading(false);
	}

	const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

	return (
		<div className="min-h-screen bg-[#09090b] flex">
			{/* Mobile sidebar overlay */}
			{sidebarOpen && (
				<div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
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
					collapsed={false}
					onToggle={() => {}}
					userEmail={user?.email}
				/>
			</div>

			<main className="flex-1 min-h-screen">
				<header className="sticky top-0 z-40 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.06]">
					<div className="flex items-center justify-between h-14 px-4 sm:px-8">
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
								<h1 className="text-sm font-semibold text-white">My Orders</h1>
								<p className="text-[11px] text-zinc-500 hidden sm:block">
									{orders.length} order{orders.length !== 1 ? "s" : ""} total
								</p>
							</div>
						</div>
						<button
							onClick={fetchOrders}
							disabled={loading}
							className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-50"
						>
							<FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
							<span className="hidden sm:inline">Refresh</span>
						</button>
					</div>
				</header>

				<div className="p-4 sm:p-8 max-w-[1200px]">
					{/* Summary stats */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
						<div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
							<p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Total</p>
							<p className="text-2xl font-bold text-white mt-1">{orders.length}</p>
						</div>
						<div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
							<p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Completed</p>
							<p className="text-2xl font-bold text-emerald-400 mt-1">
								{orders.filter((o) => o.status === "completed").length}
							</p>
						</div>
						<div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
							<p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Pending</p>
							<p className="text-2xl font-bold text-amber-400 mt-1">
								{orders.filter((o) => o.status === "pending").length}
							</p>
						</div>
						<div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
							<p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Total Spent</p>
							<p className="text-2xl font-bold text-indigo-400 mt-1">
								{formatCurrency(orders.filter((o) => o.status === "completed").reduce((s, o) => s + o.final_amount, 0))}
							</p>
						</div>
					</div>

					{/* Filter tabs */}
					<div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
						{(["all", "pending", "completed", "failed", "cancelled", "refunded"] as const).map((f) => (
							<button
								key={f}
								onClick={() => setFilter(f)}
								className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
									filter === f
										? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
										: "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] border border-transparent"
								}`}
							>
								{f === "all" ? "All" : STATUS_CONFIG[f]?.label || f}
								{f !== "all" && (
									<span className="ml-1 text-[10px] opacity-60">
										{orders.filter((o) => o.status === f).length}
									</span>
								)}
							</button>
						))}
					</div>

					{/* Orders table */}
					<div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0f] overflow-hidden">
						{loading && orders.length === 0 ? (
							<div className="flex items-center justify-center py-20">
								<FiLoader className="w-8 h-8 animate-spin text-zinc-600" />
							</div>
						) : filtered.length === 0 ? (
							<div className="text-center py-20">
								<FiShoppingBag className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
								<p className="text-sm text-zinc-400 font-medium">No orders found</p>
								<p className="text-xs text-zinc-600 mt-1">
									{filter !== "all"
										? `No ${filter} orders yet.`
										: "Your orders will appear here after making a purchase."}
								</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-sm text-left">
									<thead>
										<tr className="text-xs uppercase text-zinc-500 border-b border-white/[0.06]">
											<th className="px-4 py-3 font-semibold">Order ID</th>
											<th className="px-4 py-3 font-semibold">Plan</th>
											<th className="px-4 py-3 font-semibold text-right">Amount</th>
											<th className="px-4 py-3 font-semibold text-center">Status</th>
											<th className="px-4 py-3 font-semibold">Payment</th>
											<th className="px-4 py-3 font-semibold">Date</th>
											<th className="px-4 py-3 font-semibold text-center">Actions</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-white/[0.04]">
										{filtered.map((order) => {
											const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
											return (
												<tr key={order.id} className="hover:bg-white/[0.02] transition-all">
													<td className="px-4 py-3">
														<code className="text-[11px] font-mono text-zinc-400">
															#{order.id.slice(0, 8)}
														</code>
													</td>
													<td className="px-4 py-3">
														<p className="text-xs font-medium text-zinc-200">{order.plan_name}</p>
														{order.coupon_code && (
															<p className="text-[10px] text-amber-400 font-mono">{order.coupon_code}</p>
														)}
													</td>
													<td className="px-4 py-3 text-right">
														<p className="text-xs font-bold text-white font-mono">
															{formatCurrency(order.final_amount, order.currency)}
														</p>
														{order.discount > 0 && (
															<p className="text-[10px] text-zinc-600 line-through">
																{formatCurrency(order.amount, order.currency)}
															</p>
														)}
													</td>
													<td className="px-4 py-3 text-center">
														<span
															className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
														>
															<span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
															{cfg.label}
														</span>
													</td>
													<td className="px-4 py-3">
														<span className="text-[11px] text-zinc-400">
															{order.payment_method || "—"}
														</span>
													</td>
													<td className="px-4 py-3">
														<span className="text-[11px] text-zinc-500">
															{formatDate(order.created_at)}
														</span>
													</td>
													<td className="px-4 py-3 text-center">
														<button
															onClick={() => setSelectedOrder(order)}
															className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-zinc-400 hover:text-indigo-400 transition-colors cursor-pointer"
														>
															<FiEye className="w-3.5 h-3.5" />
														</button>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>

				{/* Order Detail Modal */}
				{selectedOrder && (
					<div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
						<div
							className="absolute inset-0 bg-black/60 backdrop-blur-sm"
							onClick={() => setSelectedOrder(null)}
						/>
						<motion.div
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							className="relative w-full max-w-md bg-[#13131a] border border-white/[0.1] rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
						>
							<div className="flex items-center justify-between mb-6">
								<h2 className="text-lg font-bold text-white">Order Details</h2>
								<button
									onClick={() => setSelectedOrder(null)}
									className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all"
								>
									<FiEye className="w-4 h-4 rotate-90" />
								</button>
							</div>

							<div
								className={`p-3 rounded-xl mb-4 border ${STATUS_CONFIG[selectedOrder.status]?.bg} ${STATUS_CONFIG[selectedOrder.status]?.border}`}
							>
								<div className="flex items-center gap-2">
									<span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[selectedOrder.status]?.dot}`} />
									<span className={`text-sm font-bold ${STATUS_CONFIG[selectedOrder.status]?.text}`}>
										{STATUS_CONFIG[selectedOrder.status]?.label}
									</span>
								</div>
							</div>

							<div className="space-y-3">
								<DetailRow label="Plan" value={selectedOrder.plan_name} />
								{selectedOrder.coupon_code && <DetailRow label="Coupon" value={selectedOrder.coupon_code} highlight />}
								<DetailRow label="Amount" value={formatCurrency(selectedOrder.amount, selectedOrder.currency)} />
								{selectedOrder.discount > 0 && (
									<DetailRow label="Discount" value={`-${formatCurrency(selectedOrder.discount, selectedOrder.currency)}`} highlight />
								)}
								<DetailRow label="Final Amount" value={formatCurrency(selectedOrder.final_amount, selectedOrder.currency)} bold />
								<DetailRow label="Payment Method" value={selectedOrder.payment_method || "—"} />
								<DetailRow label="Payment Ref" value={selectedOrder.payment_ref || "—"} mono />
								<DetailRow label="Created" value={formatDate(selectedOrder.created_at)} />
								{selectedOrder.completed_at && (
									<DetailRow label="Completed" value={formatDate(selectedOrder.completed_at)} />
								)}
								{selectedOrder.notes && <DetailRow label="Notes" value={selectedOrder.notes} />}
							</div>

							<button
								onClick={() => setSelectedOrder(null)}
								className="w-full mt-6 py-2.5 rounded-xl border border-white/[0.08] text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
							>
								Close
							</button>
						</motion.div>
					</div>
				)}
			</main>
		</div>
	);
}

function DetailRow({ label, value, mono, highlight, bold }: { label: string; value: string; mono?: boolean; highlight?: boolean; bold?: boolean }) {
	return (
		<div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
			<span className="text-xs text-zinc-500">{label}</span>
			<span
				className={`text-xs font-medium text-right max-w-[60%] break-all ${
					mono ? "font-mono" : ""
				} ${highlight ? "text-amber-400" : "text-zinc-200"} ${bold ? "font-bold text-white" : ""}`}
			>
				{value}
			</span>
		</div>
	);
}
