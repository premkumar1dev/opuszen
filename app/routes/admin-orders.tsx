import { useState, useEffect, useCallback } from "react";
import { type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { useLoaderData } from "react-router";
import { verifyAdminSession } from "../../utils/admin-auth";
import { supabase } from "../../utils/supabase";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import { cn } from "@/lib/utils";
import {
	FiSearch,
	FiRefreshCw,
	FiDownload,
	FiFilter,
	FiEye,
	FiCheck,
	FiChevronLeft,
	FiChevronRight,
	FiLoader,
	FiShoppingBag,
	FiTrendingUp,
	FiClock,
	FiPercent,
	FiXCircle,
	FiCopy,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa6";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
	SheetFooter,
} from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

export const meta: MetaFunction = () => [{ title: "Orders | Admin | OpusZen" }];

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

export interface Order {
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

interface FilterState {
	search: string;
	status: "all" | "pending" | "completed" | "failed" | "cancelled" | "refunded";
}

interface LoaderData {
	orders: Order[];
	error: string | null;
	adminEmail: string | null;
}

/* ------------------------------------------------------------------ */
/* Loader */
/* ------------------------------------------------------------------ */

export async function loader({ request }: LoaderFunctionArgs) {
	const adminCheck = await verifyAdminSession(request);
	if (!adminCheck.isAdmin) {
		return redirect("/auth/admin");
	}

	const { data: orders, error } = await supabase
		.from("orders")
		.select("*")
		.order("created_at", { ascending: false });

	return {
		orders: (orders ?? []) as Order[],
		error: error ? error.message : null,
		adminEmail: adminCheck.adminEmail,
	};
}

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */

function formatDate(iso: string | null): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (isNaN(d.getTime())) return iso;
	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const year = d.getFullYear();
	const time = d.toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
	return `${day}/${month}/${year}, ${time}`;
}

function formatRelative(iso: string | null): string {
	if (!iso) return "Never";
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "Just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	return formatDate(iso);
}

function formatCurrency(n: number, currency = "INR"): string {
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
	}).format(n);
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
	completed: {
		label: "Completed",
		bg: "bg-emerald-500/10",
		text: "text-emerald-400",
		border: "border-emerald-500/20",
		dot: "bg-emerald-500",
	},
	pending: {
		label: "Pending",
		bg: "bg-amber-500/10",
		text: "text-amber-400",
		border: "border-amber-500/20",
		dot: "bg-amber-500 animate-pulse",
	},
	failed: {
		label: "Failed",
		bg: "bg-red-500/10",
		text: "text-red-400",
		border: "border-red-500/20",
		dot: "bg-red-500",
	},
	cancelled: {
		label: "Cancelled",
		bg: "bg-zinc-500/10",
		text: "text-zinc-400",
		border: "border-zinc-500/20",
		dot: "bg-zinc-500",
	},
	refunded: {
		label: "Refunded",
		bg: "bg-violet-500/10",
		text: "text-violet-400",
		border: "border-violet-500/20",
		dot: "bg-violet-500",
	},
};

const PAYMENT_COLORS: Record<string, string> = {
	"UPI": "text-orange-400 bg-orange-500/10 border-orange-500/20",
	"Credit Card": "text-blue-400 bg-blue-500/10 border-blue-500/20",
	"Debit Card": "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
	"PayPal": "text-sky-400 bg-sky-500/10 border-sky-500/20",
	"Bank Transfer": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
	"Apple Pay": "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
};

function getPaymentStyle(method: string): string {
	if (PAYMENT_COLORS[method]) return PAYMENT_COLORS[method];
	const lower = method.toLowerCase();
	if (lower.includes("upi")) return PAYMENT_COLORS["UPI"];
	if (lower.includes("credit") || lower.includes("cc_stripe")) return PAYMENT_COLORS["Credit Card"];
	if (lower.includes("debit") || lower.includes("dc_")) return PAYMENT_COLORS["Debit Card"];
	if (lower.includes("paypal") || lower.includes("pp_")) return PAYMENT_COLORS["PayPal"];
	if (lower.includes("bank") || lower.includes("bt_")) return PAYMENT_COLORS["Bank Transfer"];
	if (lower.includes("apple")) return PAYMENT_COLORS["Apple Pay"];
	return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
}

/* ------------------------------------------------------------------ */
/* Order Detail Sheet */
/* ------------------------------------------------------------------ */

interface OrderDetailSheetProps {
	order: Order | null;
	onClose: () => void;
}

function OrderDetailSheet({ order, onClose }: OrderDetailSheetProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = (text: string) => {
		navigator.clipboard.writeText(text).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	};

	return (
		<Sheet open={!!order} onOpenChange={(open) => !open && onClose()}>
			<SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						<FiEye className="w-4 h-4" />
						Order Details
					</SheetTitle>
					<SheetDescription>
						{order ? `Order by @${order.username}` : ""}
					</SheetDescription>
				</SheetHeader>

				{order && (
					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.15 }}
						className="mt-6 space-y-5"
					>
						{/* Status Banner */}
						<div className={`p-4 rounded-xl border ${STATUS_CONFIG[order.status]?.bg} ${STATUS_CONFIG[order.status]?.border}`}>
							<div className="flex items-center gap-2">
								<span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[order.status]?.dot}`} />
								<span className={`text-sm font-bold ${STATUS_CONFIG[order.status]?.text}`}>
									{STATUS_CONFIG[order.status]?.label}
								</span>
							</div>
						</div>

						{/* Plan & Pricing */}
						<div className="space-y-3">
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan &amp; Pricing</p>
							<div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2.5">
								<div className="flex justify-between items-center">
									<span className="text-xs text-muted-foreground">Plan</span>
									<span className="text-sm font-bold text-foreground">{order.plan_name}</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-xs text-muted-foreground">Original Amount</span>
									<span className="text-sm font-mono text-foreground">{formatCurrency(order.amount, order.currency)}</span>
								</div>
								{order.discount > 0 && (
									<div className="flex justify-between items-center">
										<span className="text-xs text-muted-foreground">Discount</span>
										<span className="text-sm font-mono text-emerald-400">-{formatCurrency(order.discount, order.currency)}</span>
									</div>
								)}
								{order.coupon_code && (
									<div className="flex justify-between items-center">
										<span className="text-xs text-muted-foreground">Coupon</span>
										<span className="text-sm font-mono text-amber-400">{order.coupon_code}</span>
									</div>
								)}
								<div className="pt-2 border-t border-border/50">
									<div className="flex justify-between items-center">
										<span className="text-xs font-semibold text-muted-foreground">Final Amount</span>
										<span className="text-lg font-bold text-foreground">{formatCurrency(order.final_amount, order.currency)}</span>
									</div>
								</div>
							</div>
						</div>

						{/* Customer */}
						<div className="space-y-3">
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</p>
							<div className="p-4 rounded-xl border border-border bg-muted/20 flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
									{order.username.charAt(0).toUpperCase()}
								</div>
								<div>
									<p className="text-sm font-bold text-foreground">@{order.username}</p>
									<p className="text-xs text-muted-foreground">Customer</p>
								</div>
							</div>
						</div>

						{/* Payment Info */}
						<div className="space-y-3">
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Information</p>
							<div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2.5">
								<div className="flex justify-between items-center">
									<span className="text-xs text-muted-foreground">Method</span>
									<span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${getPaymentStyle(order.payment_method)}`}>
										{order.payment_method || "—"}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-xs text-muted-foreground">Reference</span>
									<button
										onClick={() => handleCopy(order.payment_ref)}
										className="flex items-center gap-1.5 text-xs font-mono text-foreground hover:text-primary transition-colors"
									>
										{order.payment_ref || "—"}
										{order.payment_ref && <FiCopy className="w-3 h-3" />}
									</button>
								</div>
							</div>
						</div>

						{/* Timeline */}
						<div className="space-y-3">
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timeline</p>
							<div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2.5">
								<div className="flex justify-between items-center">
									<span className="text-xs text-muted-foreground">Created</span>
									<span className="text-xs font-mono text-foreground">{formatDate(order.created_at)}</span>
								</div>
								{order.completed_at && (
									<div className="flex justify-between items-center">
										<span className="text-xs text-muted-foreground">Completed</span>
										<span className="text-xs font-mono text-emerald-400">{formatDate(order.completed_at)}</span>
									</div>
								)}
								<div className="flex justify-between items-center">
									<span className="text-xs text-muted-foreground">Last Updated</span>
									<span className="text-xs font-mono text-foreground">{formatRelative(order.updated_at)}</span>
								</div>
							</div>
						</div>

						{/* Notes */}
						{order.notes && (
							<div className="space-y-3">
								<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
								<div className="p-4 rounded-xl border border-border bg-muted/20">
									<p className="text-xs text-foreground leading-relaxed">{order.notes}</p>
								</div>
							</div>
						)}

						{copied && (
							<motion.div
								initial={{ opacity: 0, y: 4 }}
								animate={{ opacity: 1, y: 0 }}
								className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium"
							>
								<FiCheck className="w-3.5 h-3.5" />
								Copied to clipboard
							</motion.div>
						)}
					</motion.div>
				)}

				<SheetFooter className="mt-6">
					<Button variant="outline" className="flex-1" onClick={onClose}>
						Close
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

/* ------------------------------------------------------------------ */
/* Sort Icon */
/* ------------------------------------------------------------------ */

const SortIcon = ({
	field,
	sortField,
	sortDir,
}: {
	field: keyof Order;
	sortField: keyof Order;
	sortDir: "asc" | "desc";
}) => (
	<span className="ml-1 inline-flex flex-col gap-[1px]">
		<FiChevronRight
			className={`w-2.5 h-2.5 -ml-0.5 transition-colors ${
				sortField === field && sortDir === "asc" ? "text-primary" : "text-muted-foreground/40"
			}`}
			style={{ transform: "rotate(-90deg)" }}
		/>
		<FiChevronRight
			className={`w-2.5 h-2.5 -ml-0.5 -mt-[3px] transition-colors ${
				sortField === field && sortDir === "desc" ? "text-primary" : "text-muted-foreground/40"
			}`}
			style={{ transform: "rotate(90deg)" }}
		/>
	</span>
);

/* ------------------------------------------------------------------ */
/* Main Component */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 12;

export default function AdminOrdersRoute() {
	const { orders: initialOrders, error: loadError, adminEmail } = useLoaderData<LoaderData>();

	const [allOrders, setAllOrders] = useState<Order[]>(initialOrders);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [filters, setFilters] = useState<FilterState>({ search: "", status: "all" });
	const [page, setPage] = useState(1);
	const [sortField, setSortField] = useState<keyof Order>("created_at");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
	const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
	const [showFilters, setShowFilters] = useState(false);

	const refresh = useCallback(async () => {
		setLoading(true);
		const { data, error } = await supabase
			.from("orders")
			.select("*")
			.order("created_at", { ascending: false });
		if (!error && data) setAllOrders(data as Order[]);
		setLoading(false);
	}, []);

	const handleView = useCallback((order: Order) => {
		setSelectedOrder(order);
	}, []);

	const handleExport = () => {
		const csv = [
			["Order ID", "Username", "Plan", "Amount", "Currency", "Status", "Payment Method", "Payment Ref", "Coupon Code", "Discount", "Final Amount", "Notes", "Created At", "Completed At"].join(","),
			...allOrders.map((o) =>
				[
					o.id,
					`"${o.username}"`,
					`"${o.plan_name}"`,
					o.amount,
					`"${o.currency}"`,
					o.status,
					`"${o.payment_method}"`,
					`"${o.payment_ref}"`,
					o.coupon_code ? `"${o.coupon_code}"` : "",
					o.discount,
					o.final_amount,
					`"${(o.notes || "").replace(/"/g, '""')}"`,
					o.created_at,
					o.completed_at || "",
				].join(",")
			),
		].join("\n");

		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `orders-export-${new Date().toISOString().split("T")[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleSort = (field: keyof Order) => {
		if (sortField === field) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortField(field);
			setSortDir("asc");
		}
	};

	// Filter & sort
	const filtered = allOrders.filter((o) => {
		if (filters.status !== "all" && o.status !== filters.status) return false;
		if (filters.search) {
			const q = filters.search.toLowerCase();
			if (
				!o.username.toLowerCase().includes(q) &&
				!o.plan_name.toLowerCase().includes(q) &&
				!o.payment_ref.toLowerCase().includes(q) &&
				!o.coupon_code.toLowerCase().includes(q)
			) {
				return false;
			}
		}
		return true;
	});

	const sorted = [...filtered].sort((a, b) => {
		const valA = a[sortField];
		const valB = b[sortField];
		let cmp = 0;
		if (typeof valA === "string" && typeof valB === "string") {
			cmp = valA.localeCompare(valB);
		} else if (typeof valA === "number" && typeof valB === "number") {
			cmp = valA - valB;
		}
		return sortDir === "asc" ? cmp : -cmp;
	});

	const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
	const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	const activeFilterCount = (filters.search ? 1 : 0) + (filters.status !== "all" ? 1 : 0);

	// Stats
	const stats = {
		total: allOrders.length,
		completed: allOrders.filter((o) => o.status === "completed").length,
		totalRevenue: allOrders
			.filter((o) => o.status === "completed")
			.reduce((sum, o) => sum + Number(o.final_amount), 0),
		pendingCount: allOrders.filter((o) => o.status === "pending").length,
		failedCount: allOrders.filter((o) => o.status === "failed").length,
		avgOrderValue:
			allOrders.length > 0
				? allOrders.reduce((sum, o) => sum + Number(o.final_amount), 0) / allOrders.length
				: 0,
		completionRate:
			allOrders.length > 0
				? (allOrders.filter((o) => o.status === "completed").length / allOrders.length) * 100
				: 0,
		totalDiscount: allOrders.reduce((sum, o) => sum + Number(o.discount), 0),
	};

	return (
		<div className="min-h-screen bg-background text-foreground">
			<AdminSidebar collapsed={false} onToggle={() => {}} adminEmail={adminEmail || undefined} />
			<main className="ml-[220px] min-h-screen">
				<div className="max-w-[1400px]">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
						<div>
							<div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
								<FiShoppingBag className="w-3.5 h-3.5" />
								Order Management
							</div>
							<h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-gradient">
								All Orders
							</h1>
							<p className="text-muted-foreground text-sm mt-1">
								{filtered.length} of {allOrders.length} orders
								{activeFilterCount > 0 ? ` (${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""} active)` : ""}
							</p>
						</div>

						<div className="flex items-center gap-2 flex-wrap">
							<Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
								<FiDownload className="w-3.5 h-3.5" />
								Export
							</Button>
							<Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-1.5">
								<FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
								Refresh
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowFilters((v) => !v)}
								className="gap-1.5"
							>
								<FiFilter className="w-3.5 h-3.5" />
								Filters
								{activeFilterCount > 0 && (
									<span className="ml-1 w-4 h-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
										{activeFilterCount}
									</span>
								)}
							</Button>
						</div>
					</div>

					{/* Error Banner */}
					{loadError && (
						<div className="mb-4 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-sm">
							Failed to load orders: {loadError}. Check your Supabase configuration.
						</div>
					)}

					{/* Stats Row */}
					<div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
						{[
							{ label: "Total Orders", value: stats.total, color: "text-foreground", icon: <FiShoppingBag className="w-4 h-4" /> },
							{ label: "Revenue", value: formatCurrency(stats.totalRevenue), color: "text-emerald-500", icon: <FaRupeeSign className="w-3.5 h-3.5" /> },
							{ label: "Avg Order", value: formatCurrency(stats.avgOrderValue), color: "text-amber-500", icon: <FiTrendingUp className="w-4 h-4" /> },
							{ label: "Pending", value: stats.pendingCount, color: "text-amber-500", icon: <FiClock className="w-4 h-4" /> },
							{ label: "Failed", value: stats.failedCount, color: "text-red-500", icon: <FiXCircle className="w-4 h-4" /> },
							{ label: "Completion", value: `${stats.completionRate.toFixed(0)}%`, color: "text-indigo-500", icon: <FiPercent className="w-4 h-4" /> },
						].map((stat) => (
							<div key={stat.label} className="p-4 rounded-xl border border-border bg-card dark:bg-card/60">
								<div className="flex items-center gap-2 mb-1.5">
									<div className="text-muted-foreground">{stat.icon}</div>
									<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
								</div>
								<p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
							</div>
						))}
					</div>

					{/* Filter Bar */}
					<AnimatePresence>
						{showFilters && (
							<motion.div
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: "auto", opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								transition={{ duration: 0.2 }}
								className="overflow-hidden mb-4"
							>
								<div className="p-4 rounded-xl border border-border bg-card dark:bg-card/60 flex flex-col sm:flex-row gap-3 items-end">
									<div className="flex-1 min-w-[200px]">
										<label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
											Search (username, plan, ref, coupon)
										</label>
										<Input
											placeholder="Search orders..."
											value={filters.search}
											onChange={(e) => {
												setFilters((f) => ({ ...f, search: e.target.value }));
												setPage(1);
											}}
											className="h-9"
										/>
									</div>
									<div>
										<label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
											Status
										</label>
										<select
											value={filters.status}
											onChange={(e) => {
												setFilters((f) => ({ ...f, status: e.target.value as FilterState["status"] }));
												setPage(1);
											}}
											className="h-9 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
										>
											<option value="all">All Status</option>
											<option value="completed">Completed</option>
											<option value="pending">Pending</option>
											<option value="failed">Failed</option>
											<option value="cancelled">Cancelled</option>
											<option value="refunded">Refunded</option>
										</select>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setFilters({ search: "", status: "all" })}
										className="h-9"
									>
										<FiRefreshCw className="w-3.5 h-3.5 mr-1" />
										Clear
									</Button>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Table */}
					<div className="rounded-2xl border border-border bg-card dark:bg-card/60 overflow-hidden">
						{loading && allOrders.length === 0 ? (
							<div className="flex items-center justify-center py-20">
								<FiLoader className="w-8 h-8 animate-spin text-muted-foreground" />
							</div>
						) : (
							<>
								<div className="overflow-x-auto">
									<table className="w-full text-sm text-left">
										<thead>
											<tr className="text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border">
												<th
													className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
													onClick={() => handleSort("created_at")}
												>
													<span className="flex items-center">Order Date <SortIcon field="created_at" sortField={sortField} sortDir={sortDir} /></span>
												</th>
												<th
													className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
													onClick={() => handleSort("username")}
												>
													<span className="flex items-center">Customer <SortIcon field="username" sortField={sortField} sortDir={sortDir} /></span>
												</th>
												<th
													className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
													onClick={() => handleSort("plan_name")}
												>
													<span className="flex items-center">Plan <SortIcon field="plan_name" sortField={sortField} sortDir={sortDir} /></span>
												</th>
												<th
													className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors text-right"
													onClick={() => handleSort("final_amount")}
												>
													<span className="flex items-center justify-end">Final Amount <SortIcon field="final_amount" sortField={sortField} sortDir={sortDir} /></span>
												</th>
												<th
													className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors text-center"
													onClick={() => handleSort("status")}
												>
													<span className="flex items-center justify-center">Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} /></span>
												</th>
												<th
													className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors text-center"
												>
													Payment
												</th>
												<th className="px-4 py-3 font-semibold text-right">Actions</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-border/40">
											{paginated.length === 0 ? (
												<tr>
													<td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
														<div className="flex flex-col items-center gap-2">
															<FiShoppingBag className="w-10 h-10 opacity-30" />
															<p className="text-sm font-medium">No orders found</p>
															<p className="text-xs">Try adjusting your filters</p>
														</div>
													</td>
												</tr>
											) : (
												paginated.map((order) => {
													const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["pending"];
													const paymentStyle = getPaymentStyle(order.payment_method);
													return (
														<tr key={order.id} className="hover:bg-muted/10 transition-colors group">
															{/* Date */}
															<td className="px-4 py-3">
																<div className="min-w-[120px]">
																	<p className="text-xs font-medium text-foreground">
																		{new Date(order.created_at).toLocaleDateString(undefined, {
																			month: "short",
																			day: "numeric",
																			year: "numeric",
																		})}
																	</p>
																	<p className="text-[11px] text-muted-foreground font-mono">
																		{new Date(order.created_at).toLocaleTimeString(undefined, {
																			hour: "numeric",
																			minute: "2-digit",
																			hour12: true,
																		})}
																	</p>
																</div>
															</td>

															{/* Username */}
															<td className="px-4 py-3">
																<div className="flex items-center gap-2.5">
																	<div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-[11px] shrink-0">
																		{order.username.charAt(0).toUpperCase()}
																	</div>
																	<div className="min-w-0">
																		<p className="text-xs font-medium text-foreground truncate max-w-[140px]">
																			{order.username}
																		</p>
																		<p className="text-[10px] text-muted-foreground">
																			{order.payment_ref || "—"}
																		</p>
																	</div>
																</div>
															</td>

															{/* Plan */}
															<td className="px-4 py-3">
																<p className="text-xs font-medium text-foreground max-w-[160px] truncate" title={order.plan_name}>
																	{order.plan_name}
																</p>
																{order.coupon_code && (
																	<p className="text-[10px] text-amber-400 font-mono">{order.coupon_code}</p>
																)}
															</td>

															{/* Final Amount */}
															<td className="px-4 py-3 text-right">
																<p className="text-xs font-bold text-foreground font-mono">
																	{formatCurrency(order.final_amount, order.currency)}
																</p>
																{order.discount > 0 && (
																	<p className="text-[10px] text-muted-foreground line-through">
																		{formatCurrency(order.amount, order.currency)}
																	</p>
																)}
															</td>

															{/* Status */}
															<td className="px-4 py-3 text-center">
																<span
																	className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
																>
																	<span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
																	{statusCfg.label}
																</span>
															</td>

															{/* Payment Method */}
															<td className="px-4 py-3 text-center">
																{order.payment_method ? (
																	<span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${paymentStyle}`}>
																		{order.payment_method}
																	</span>
																) : (
																	<span className="text-[10px] text-muted-foreground">—</span>
																)}
															</td>

															{/* Actions */}
															<td className="px-4 py-3">
																<div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
																	<button
																		onClick={() => handleView(order)}
																		className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-muted-foreground hover:text-indigo-400 transition-colors cursor-pointer"
																		title="View details"
																		type="button"
																	>
																		<FiEye className="w-3.5 h-3.5" />
																	</button>
																</div>
															</td>
														</tr>
													);
												})
											)}
										</tbody>
									</table>
								</div>

								{/* Pagination */}
								{totalPages > 1 && (
									<div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
										<p className="text-xs text-muted-foreground">
											Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
										</p>
										<div className="flex items-center gap-1">
											<Button
												variant="outline"
												size="sm"
												className="w-8 h-8 p-0"
												onClick={() => setPage((p) => Math.max(1, p - 1))}
												disabled={page === 1}
											>
												<FiChevronLeft className="w-4 h-4" />
											</Button>
											{Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
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
											{totalPages > 7 && (
												<span className="px-1 text-xs text-muted-foreground">…</span>
											)}
											<Button
												variant="outline"
												size="sm"
												className="w-8 h-8 p-0"
												onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
												disabled={page === totalPages}
											>
												<FiChevronRight className="w-4 h-4" />
											</Button>
										</div>
									</div>
								)}
							</>
						)}
					</div>

					{/* Detail Sheet */}
					<OrderDetailSheet
						order={selectedOrder}
						onClose={() => setSelectedOrder(null)}
					/>
				</div>
			</main>
		</div>
	);
}
