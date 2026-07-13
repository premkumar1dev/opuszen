import { useState, useCallback } from "react";
import { type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { useLoaderData } from "react-router";
import { verifyAdminSession } from "../../utils/admin-auth";
import { supabase } from "../../utils/supabase";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import {
	FiSearch,
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
	FiCheckCircle,
	FiCreditCard,
	FiCalendar,
	FiHash,
	FiUser,
	FiArrowUpRight,
	FiArrowDownRight,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa6";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

export const meta: MetaFunction = () => [{ title: "Payments | Admin | OpusZen" }];

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

interface Payment {
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
	method: "all" | string;
}

interface LoaderData {
	payments: Payment[];
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
		payments: (orders ?? []) as Payment[],
		error: error ? error.message : null,
		adminEmail: adminCheck.adminEmail,
	};
}

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */

function formatCurrency(n: number, currency = "INR"): string {
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
	}).format(n);
}

function formatDate(iso: string | null): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (isNaN(d.getTime())) return iso;
	return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(iso: string | null): string {
	if (!iso) return "";
	const d = new Date(iso);
	if (isNaN(d.getTime())) return "";
	return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
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
/* Payment Detail Sheet */
/* ------------------------------------------------------------------ */

interface PaymentDetailSheetProps {
	payment: Payment | null;
	onClose: () => void;
}

function PaymentDetailSheet({ payment, onClose }: PaymentDetailSheetProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = (text: string) => {
		navigator.clipboard.writeText(text).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	};

	return (
		<Sheet open={!!payment} onOpenChange={(open) => !open && onClose()}>
			<SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						<FiCreditCard className="w-4 h-4" />
						Payment Details
					</SheetTitle>
					<SheetDescription>
						{payment ? `Payment by @${payment.username}` : ""}
					</SheetDescription>
				</SheetHeader>

				{payment && (
					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.15 }}
						className="mt-6 space-y-5"
					>
						{/* Status Banner */}
						<div className={`p-4 rounded-xl border ${STATUS_CONFIG[payment.status]?.bg} ${STATUS_CONFIG[payment.status]?.border}`}>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[payment.status]?.dot}`} />
									<span className={`text-sm font-bold ${STATUS_CONFIG[payment.status]?.text}`}>
										{STATUS_CONFIG[payment.status]?.label}
									</span>
								</div>
								<span className="text-xl font-bold text-foreground font-mono">
									{formatCurrency(payment.final_amount, payment.currency)}
								</span>
							</div>
						</div>

						{/* Payment Reference */}
						{payment.payment_ref && (
							<div className="space-y-2">
								<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Reference</p>
								<div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/20">
									<code className="text-xs font-mono text-foreground flex-1 break-all">{payment.payment_ref}</code>
									<button
										onClick={() => handleCopy(payment.payment_ref)}
										className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
										title="Copy reference"
										type="button"
									>
										{copied ? <FiCheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <FiCopy className="w-3.5 h-3.5" />}
									</button>
								</div>
							</div>
						)}

						{/* Payment Info Grid */}
						<div className="space-y-3">
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Information</p>
							<div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2.5">
								{[
									{ label: "Customer", value: `@${payment.username}` },
									{ label: "Plan", value: payment.plan_name },
									{ label: "Payment Method", value: payment.payment_method || "—" },
									{ label: "Original Amount", value: formatCurrency(payment.amount, payment.currency) },
									...(payment.discount > 0
										? [
												{ label: "Discount", value: `−${formatCurrency(payment.discount, payment.currency)}` },
												{ label: "Coupon", value: payment.coupon_code || "—" },
										  ]
										: []),
									{ label: "Final Amount", value: formatCurrency(payment.final_amount, payment.currency) },
									{ label: "Currency", value: payment.currency },
								].map((row) => (
									<div key={row.label} className="flex justify-between items-center">
										<span className="text-xs text-muted-foreground">{row.label}</span>
										<span className="text-sm font-medium text-foreground">{row.value}</span>
									</div>
								))}
							</div>
						</div>

						{/* Timestamps */}
						<div className="space-y-3">
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timeline</p>
							<div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2.5">
								<div className="flex justify-between items-center">
									<span className="text-xs text-muted-foreground">Created</span>
									<span className="text-xs font-medium text-foreground">
										{formatDate(payment.created_at)} {formatTime(payment.created_at)}
									</span>
								</div>
								{payment.completed_at && (
									<div className="flex justify-between items-center">
										<span className="text-xs text-muted-foreground">Completed</span>
										<span className="text-xs font-medium text-emerald-400">
											{formatDate(payment.completed_at)} {formatTime(payment.completed_at)}
										</span>
									</div>
								)}
								<div className="flex justify-between items-center">
									<span className="text-xs text-muted-foreground">Last Updated</span>
									<span className="text-xs font-medium text-foreground">
										{formatRelative(payment.updated_at)}
									</span>
								</div>
							</div>
						</div>

						{/* Notes */}
						{payment.notes && (
							<div className="space-y-3">
								<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
								<div className="p-4 rounded-xl border border-border bg-muted/20">
									<p className="text-xs text-muted-foreground whitespace-pre-wrap">{payment.notes}</p>
								</div>
							</div>
						)}

						{/* Order ID */}
						<div className="flex items-center gap-2 p-3 rounded-xl border border-border/40 bg-muted/10">
							<FiHash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
							<code className="text-[10px] font-mono text-muted-foreground break-all">{payment.id}</code>
							<button
								onClick={() => handleCopy(payment.id)}
								className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 ml-auto"
								title="Copy order ID"
								type="button"
							>
								<FiCopy className="w-3 h-3" />
							</button>
						</div>
					</motion.div>
				)}
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
	field: keyof Payment;
	sortField: keyof Payment;
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

const PAGE_SIZE = 15;

export default function AdminPaymentsRoute() {
	const { payments: initialPayments, error: loadError, adminEmail } = useLoaderData<LoaderData>();

	const [allPayments, setAllPayments] = useState<Payment[]>(initialPayments);
	const [loading, setLoading] = useState(false);
	const [filters, setFilters] = useState<FilterState>({ search: "", status: "all", method: "all" });
	const [page, setPage] = useState(1);
	const [sortField, setSortField] = useState<keyof Payment>("created_at");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
	const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
	const [showFilters, setShowFilters] = useState(false);

	const refresh = useCallback(async () => {
		setLoading(true);
		const { data, error } = await supabase
			.from("orders")
			.select("*")
			.order("created_at", { ascending: false });
		if (!error && data) setAllPayments(data as Payment[]);
		setLoading(false);
	}, []);

	// Unique payment methods for filter
	const paymentMethods = Array.from(
		new Set(allPayments.map((p) => p.payment_method).filter(Boolean))
	).sort();

	const handleExport = () => {
		const csv = [
			["Payment Ref", "Order ID", "Customer", "Plan", "Amount", "Discount", "Final Amount", "Currency", "Status", "Payment Method", "Coupon", "Created At", "Completed At"].join(","),
			...allPayments.map((p) =>
				[
					`"${p.payment_ref}"`,
					p.id,
					`"${p.username}"`,
					`"${p.plan_name}"`,
					p.amount,
					p.discount,
					p.final_amount,
					`"${p.currency}"`,
					p.status,
					`"${p.payment_method}"`,
					p.coupon_code ? `"${p.coupon_code}"` : "",
					p.created_at,
					p.completed_at || "",
				].join(",")
			),
		].join("\n");

		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `payments-export-${new Date().toISOString().split("T")[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleSort = (field: keyof Payment) => {
		if (sortField === field) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortField(field);
			setSortDir("asc");
		}
	};

	// Filter & sort
	const filtered = allPayments.filter((p) => {
		if (filters.status !== "all" && p.status !== filters.status) return false;
		if (filters.method !== "all" && p.payment_method !== filters.method) return false;
		if (filters.search) {
			const q = filters.search.toLowerCase();
			if (
				!p.username.toLowerCase().includes(q) &&
				!p.payment_ref.toLowerCase().includes(q) &&
				!p.plan_name.toLowerCase().includes(q) &&
				!p.id.toLowerCase().includes(q)
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

	const activeFilterCount =
		(filters.search ? 1 : 0) +
		(filters.status !== "all" ? 1 : 0) +
		(filters.method !== "all" ? 1 : 0);

	// Stats
	const completed = allPayments.filter((p) => p.status === "completed");
	const stats = {
		totalRevenue: completed.reduce((sum, p) => sum + Number(p.final_amount), 0),
		totalPayments: allPayments.length,
		completedCount: completed.length,
		pendingCount: allPayments.filter((p) => p.status === "pending").length,
		failedCount: allPayments.filter((p) => p.status === "failed").length,
		avgPayment: completed.length > 0 ? completed.reduce((s, p) => s + Number(p.final_amount), 0) / completed.length : 0,
		totalDiscount: allPayments.reduce((sum, p) => sum + Number(p.discount), 0),
		refundedAmount: allPayments
			.filter((p) => p.status === "refunded")
			.reduce((sum, p) => sum + Number(p.final_amount), 0),
	};

	return (
		<div className="min-h-screen bg-background text-foreground">
			<AdminSidebar collapsed={false} onToggle={() => {}} adminEmail={adminEmail || undefined} />
			<main className="ml-[220px] min-h-screen">
				<div className="max-w-[1400px]">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
						<div>
							<div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-mono font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
								<FiCreditCard className="w-3.5 h-3.5" />
								Payment History
							</div>
							<h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-gradient">
								Payments
							</h1>
							<p className="text-muted-foreground text-sm mt-1">
								{filtered.length} of {allPayments.length} payment records
								{activeFilterCount > 0 ? ` (${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""} active)` : ""}
							</p>
						</div>

						<div className="flex items-center gap-2 flex-wrap">
							<Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
								<FiDownload className="w-3.5 h-3.5" />
								Export CSV
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
							Failed to load payments: {loadError}. Check your Supabase configuration.
						</div>
					)}

					{/* Stats Row */}
					<div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-4 gap-3 mb-6">
						{[
							{
								label: "Total Revenue",
								value: formatCurrency(stats.totalRevenue),
								color: "text-emerald-500",
								icon: <FaRupeeSign className="w-3.5 h-3.5" />,
								sub: `${stats.completedCount} completed`,
							},
							{
								label: "Average Payment",
								value: formatCurrency(stats.avgPayment),
								color: "text-indigo-500",
								icon: <FiTrendingUp className="w-4 h-4" />,
								sub: `${stats.totalPayments} total`,
							},
							{
								label: "Pending",
								value: String(stats.pendingCount),
								color: "text-amber-500",
								icon: <FiClock className="w-4 h-4" />,
								sub: "awaiting payment",
							},
							{
								label: "Failed / Refunded",
								value: `${stats.failedCount} / ${allPayments.filter((p) => p.status === "refunded").length}`,
								color: "text-red-500",
								icon: <FiXCircle className="w-4 h-4" />,
								sub: stats.refundedAmount > 0 ? formatCurrency(stats.refundedAmount) + " refunded" : "no refunds",
							},
						].map((stat) => (
							<div key={stat.label} className="p-4 rounded-xl border border-border bg-card dark:bg-card/60">
								<div className="flex items-center gap-2 mb-1.5">
									<div className="text-muted-foreground">{stat.icon}</div>
									<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
								</div>
								<p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
								<p className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</p>
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
											Search (customer, ref, plan, order ID)
										</label>
										<Input
											placeholder="Search payments..."
											value={filters.search}
											onChange={(e) => {
												setFilters((f) => ({ ...f, search: e.target.value }));
												setPage(1);
											}}
											className="h-9"
										/>
									</div>
									<div className="w-full sm:w-40">
										<label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
											Status
										</label>
										<select
											value={filters.status}
											onChange={(e) => {
												setFilters((f) => ({ ...f, status: e.target.value as FilterState["status"] }));
												setPage(1);
											}}
											className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
										>
											<option value="all">All Statuses</option>
											<option value="completed">Completed</option>
											<option value="pending">Pending</option>
											<option value="failed">Failed</option>
											<option value="cancelled">Cancelled</option>
											<option value="refunded">Refunded</option>
										</select>
									</div>
									<div className="w-full sm:w-40">
										<label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
											Payment Method
										</label>
										<select
											value={filters.method}
											onChange={(e) => {
												setFilters((f) => ({ ...f, method: e.target.value }));
												setPage(1);
											}}
											className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
										>
											<option value="all">All Methods</option>
											{paymentMethods.map((m) => (
												<option key={m} value={m}>{m}</option>
											))}
										</select>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											setFilters({ search: "", status: "all", method: "all" });
											setPage(1);
										}}
										className="text-xs h-9"
									>
										Clear
									</Button>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Table */}
					<div className="rounded-2xl border border-border bg-card dark:bg-card/60 overflow-hidden">
						{loading && allPayments.length === 0 ? (
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
													<span className="flex items-center">Date <SortIcon field="created_at" sortField={sortField} sortDir={sortDir} /></span>
												</th>
												<th
													className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
													onClick={() => handleSort("username")}
												>
													<span className="flex items-center">Customer <SortIcon field="username" sortField={sortField} sortDir={sortDir} /></span>
												</th>
												<th className="px-4 py-3 font-semibold">
													Payment Ref
												</th>
												<th className="px-4 py-3 font-semibold text-center">
													Method
												</th>
												<th
													className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors text-right"
													onClick={() => handleSort("final_amount")}
												>
													<span className="flex items-center justify-end">Amount <SortIcon field="final_amount" sortField={sortField} sortDir={sortDir} /></span>
												</th>
												<th
													className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors text-center"
													onClick={() => handleSort("status")}
												>
													<span className="flex items-center justify-center">Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} /></span>
												</th>
												<th className="px-4 py-3 font-semibold text-right">Actions</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-border/40">
											{paginated.length === 0 ? (
												<tr>
													<td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
														<div className="flex flex-col items-center gap-2">
															<FiCreditCard className="w-10 h-10 opacity-30" />
															<p className="text-sm font-medium">No payments found</p>
															<p className="text-xs">Try adjusting your filters</p>
														</div>
													</td>
												</tr>
											) : (
												paginated.map((payment) => {
													const statusCfg = STATUS_CONFIG[payment.status] || STATUS_CONFIG["pending"];
													const paymentStyle = getPaymentStyle(payment.payment_method);
													return (
														<tr key={payment.id} className="hover:bg-muted/10 transition-colors group">
															{/* Date */}
															<td className="px-4 py-3">
																<div className="min-w-[110px]">
																	<p className="text-xs font-medium text-foreground">
																		{formatDate(payment.created_at)}
																	</p>
																	<p className="text-[11px] text-muted-foreground font-mono">
																		{formatTime(payment.created_at)}
																	</p>
																</div>
															</td>

															{/* Customer */}
															<td className="px-4 py-3">
																<div className="flex items-center gap-2.5">
																	<div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-[11px] shrink-0">
																		{payment.username.charAt(0).toUpperCase()}
																	</div>
																	<div className="min-w-0">
																		<p className="text-xs font-medium text-foreground truncate max-w-[140px]">
																			{payment.username}
																		</p>
																		<p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
																			{payment.plan_name}
																		</p>
																	</div>
																</div>
															</td>

															{/* Payment Ref */}
															<td className="px-4 py-3">
																{payment.payment_ref ? (
																	<code className="text-[11px] font-mono text-muted-foreground truncate block max-w-[160px]" title={payment.payment_ref}>
																		{payment.payment_ref}
																	</code>
																) : (
																	<span className="text-[10px] text-muted-foreground">—</span>
																)}
															</td>

															{/* Method */}
															<td className="px-4 py-3 text-center">
																{payment.payment_method ? (
																	<span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${paymentStyle}`}>
																		{payment.payment_method}
																	</span>
																) : (
																	<span className="text-[10px] text-muted-foreground">—</span>
																)}
															</td>

															{/* Amount */}
															<td className="px-4 py-3 text-right">
																<p className="text-xs font-bold text-foreground font-mono">
																	{formatCurrency(payment.final_amount, payment.currency)}
																</p>
																{payment.discount > 0 && (
																	<p className="text-[10px] text-muted-foreground line-through">
																		{formatCurrency(payment.amount, payment.currency)}
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

															{/* Actions */}
															<td className="px-4 py-3">
																<div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
																	<button
																		onClick={() => setSelectedPayment(payment)}
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
					<PaymentDetailSheet
						payment={selectedPayment}
						onClose={() => setSelectedPayment(null)}
					/>
				</div>
			</main>
		</div>
	);
}
