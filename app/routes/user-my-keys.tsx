import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { type MetaFunction } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "~/utils/supabase";
import { useDashboardTheme } from "~/utils/theme";
import { DashboardSidebar } from "../components/dashboard/dashboard-sidebar";
import {
	FiKey,
	FiCopy,
	FiTrash2,
	FiPlus,
	FiRefreshCw,
	FiEye,
	FiEyeOff,
	FiShield,
	FiClock,
	FiActivity,
	FiAlertTriangle,
	FiZap,
	FiCheck,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import {
	PlanPurchaseModal,
	type PlanOption,
} from "~/components/ui/plan-purchase-modal";

export const meta: MetaFunction = () => [
	{ title: "My Keys | Opuszen" },
	{ name: "description", content: "Manage your OpusZen API keys." },
];

interface ApiKey {
	id: string;
	name: string;
	key_prefix: string;
	plan_name: string;
	is_active: boolean;
	total_requests: number;
	tokens_used: number;
	tokens_limit: number;
	created_at: string;
	last_used_at: string;
	expires_at: string;
	rate_limit_rpm: number;
}

interface PlanInfo {
	id: string;
	name: string;
	multiplier: number;
	price: number;
	currency: string;
	durationDays: number;
	isTokenPricing?: boolean;
	pricePer1mInput?: number;
	pricePer1mOutput?: number;
	minCredits?: number;
}

/* Plans fetched from the plans table, with a fallback */
const FALLBACK_PLANS: PlanOption[] = [
	{
		id: "trial",
		name: "Trial Plan",
		multiplier: 1,
		price: 0,
		currency: "INR",
		durationDays: 7,
		features: ["1x rate limit", "100K tokens/month", "Community support"],
	},
	{
		id: "pro-5x",
		name: "Pro Plan",
		description: "Best for growing projects",
		multiplier: 5,
		price: 1499,
		currency: "INR",
		durationDays: 30,
		features: [
			"5x rate limit",
			"5M tokens/month",
			"Priority support",
			"Advanced analytics",
		],
		isPopular: true,
	},
	{
		id: "pro-10x",
		name: "Pro Plan",
		description: "For heavy production workloads",
		multiplier: 10,
		price: 3499,
		currency: "INR",
		durationDays: 30,
		features: [
			"10x rate limit",
			"15M tokens/month",
			"Dedicated support",
			"Custom integrations",
		],
	},
	{
		id: "pro-20x",
		name: "Pro Plan",
		description: "Maximum throughput & scale",
		multiplier: 20,
		price: 7999,
		currency: "INR",
		durationDays: 30,
		features: [
			"20x rate limit",
			"50M tokens/month",
			"24/7 dedicated support",
			"SLA guarantee",
			"Custom rate limits",
		],
	},
];

export default function UserMyKeysRoute() {
	const { theme, toggleTheme } = useDashboardTheme();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const [user, setUser] = useState<any>(null);
	const [keys, setKeys] = useState<ApiKey[]>([]);
	const [loading, setLoading] = useState(true);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [revealed, setRevealed] = useState<Set<string>>(new Set());

	/* Plan purchase modal state */
	const [showPlanModal, setShowPlanModal] = useState(false);
	const [plans, setPlans] = useState<PlanOption[]>(FALLBACK_PLANS);
	const [plansLoading, setPlansLoading] = useState(false);
	const [gatewayName, setGatewayName] = useState("PAY0");
	const pendingOrderIdRef = useRef<string | null>(null);

	// Refs for values read inside the verification interval (avoids stale closures)
	const searchParamsRef = useRef(searchParams);
	searchParamsRef.current = searchParams;
	const setSearchParamsRef = useRef(setSearchParams);
	setSearchParamsRef.current = setSearchParams;

	// Guard to prevent double-finalization of the same payment
	const finalizedRef = useRef<Set<string>>(new Set());

	const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "success" | "failed">("idle");
	const [verificationMessage, setVerificationMessage] = useState("");

	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => setUser(data.user));
		fetchKeys();
		fetchPlans();
		fetchGatewaySettings();
	}, []);

	useEffect(() => {
		const paymentParam = searchParams.get("payment");
		const orderId = searchParams.get("orderId");
		const gatewayOrderId = searchParams.get("gatewayOrderId");

		if (paymentParam === "verify" && orderId) {
			setVerificationStatus("verifying");
			setVerificationMessage("Verifying your payment with the gateway. Please wait...");

			let pollCount = 0;
			const maxPolls = 120;

			// Idempotency guard: skip if this order was already finalized
			const orderKey = gatewayOrderId || orderId;
			if (finalizedRef.current.has(orderKey)) {
				return;
			}

			const interval = setInterval(async () => {
				pollCount++;
				if (pollCount > maxPolls) {
					clearInterval(interval);
					setVerificationStatus("failed");
					setVerificationMessage("Verification timed out. If you paid, please contact support with your Order ID: " + orderId);
					setSearchParamsRef.current({});
					return;
				}

				try {
					const formData = new FormData();
					formData.set("intent", "check_status");
					const sp = searchParamsRef.current;
					const oid = sp.get("orderId");
					const gid = sp.get("gatewayOrderId");
					const storedGatewayOrderId = sessionStorage.getItem(`gateway_order_${oid}`) || gid || "";

					formData.set("order_id", storedGatewayOrderId);

					const res = await fetch("/api/payment", {
						method: "POST",
						body: formData,
					});

					if (!res.ok) {
						clearInterval(interval);
						setVerificationStatus("failed");
						setVerificationMessage("Payment gateway returned an error (HTTP " + res.status + "). Please contact support with your Order ID: " + oid);
						sessionStorage.removeItem(`gateway_order_${oid}`);
						setTimeout(() => setSearchParamsRef.current({}), 5000);
						return;
					}

					const result = await res.json();

					if (result.status === false) {
						clearInterval(interval);
						setVerificationStatus("failed");
						setVerificationMessage(result.message || "Payment gateway rejected the request. Please contact support.");
						sessionStorage.removeItem(`gateway_order_${oid}`);
						setTimeout(() => setSearchParamsRef.current({}), 5000);
						return;
					}

					const txnStatus = result.result?.txnStatus?.toUpperCase() || "";
					const gwStatus = result.result?.status?.toUpperCase() || "";

					if (txnStatus === "SUCCESS" || gwStatus === "SUCCESS") {
						clearInterval(interval);
						setVerificationStatus("success");
						setVerificationMessage("Payment successful! Generating your API key...");

						// Mark as finalized to prevent duplicate keys on rapid re-renders
						finalizedRef.current.add(orderKey);

						const sp2 = searchParamsRef.current;
						const planId = sp2.get("planId") || "";
						const planName = sp2.get("planName") || "Plan";
						const duration = parseInt(sp2.get("duration") || "30");
						const multiplier = parseFloat(sp2.get("multiplier") || "1");
						const keyName = sp2.get("keyName") || "Purchased Key";
						const tokenPricing = sp2.get("tokenPricing") === "1";
						const pricePer1mInput = parseFloat(sp2.get("pricePer1mInput") || "0");
						const pricePer1mOutput = parseFloat(sp2.get("pricePer1mOutput") || "0");
						const minCredits = parseFloat(sp2.get("minCredits") || "0");
						const method = sp2.get("method") || "PAY0";

						await finalizePaidOrder({
							orderId: storedGatewayOrderId,
							plan: {
								id: planId,
								name: planName,
								durationDays: duration,
								multiplier: multiplier,
								isTokenPricing: tokenPricing,
								pricePer1mInput: pricePer1mInput,
								pricePer1mOutput: pricePer1mOutput,
								minCredits: minCredits,
							} as any,
							paymentMethod: method,
							txnRef: result.result?.utr || "",
							keyName: keyName,
							utr: result.result?.utr || "",
							date: result.result?.date || new Date().toISOString(),
							amount: result.result?.amount || "0",
						});

						sessionStorage.removeItem(`gateway_order_${oid}`);

						// Refresh keys list to show the newly created key
						await fetchKeys();

						setTimeout(() => {
							setVerificationStatus("idle");
							setSearchParamsRef.current({});
						}, 3000);

					} else if (txnStatus === "FAILED" || gwStatus === "FAILED") {
						clearInterval(interval);
						setVerificationStatus("failed");
						setVerificationMessage("Verification returned FAILED status. Please try again or contact support.");
						sessionStorage.removeItem(`gateway_order_${oid}`);
						setTimeout(() => {
							setSearchParamsRef.current({});
						}, 5000);
					}
				} catch (err) {
					console.error("Verification poll error:", err);
					setVerificationMessage("Network error during verification. Retrying...");
				}
			}, 4000);

			return () => clearInterval(interval);
		}
	}, [searchParams, setSearchParams]);

	async function fetchGatewaySettings() {
		try {
			const { data, error } = await supabase
				.from("payment_gateway_settings")
				.select("gateway_name")
				.eq("is_active", true)
				.maybeSingle();
			if (!error && data?.gateway_name) {
				setGatewayName(data.gateway_name);
			}
		} catch {
			// keep default
		}
	}

	async function fetchPlans() {
		setPlansLoading(true);
		try {
			const { data, error } = await supabase
				.from("plans")
				.select("*")
				.eq("is_active", true)
				.order("sort_order", { ascending: true });
			if (!error && data && data.length > 0) {
			const	mapped: PlanOption[] = data.map((p: any) => ({
					id: p.id,
					name: p.name,
					description: p.description ?? undefined,
					multiplier: p.multiplier ?? 1,
					price: p.price ?? 0,
					currency: p.currency ?? "INR",
					durationDays: p.duration_days ?? 30,
					features: p.features ?? undefined,
					isPopular: p.is_popular ?? false,
					color: p.color ?? undefined,
					isTokenPricing: (p.price_per_1m_input_tokens ?? 0) > 0 || (p.price_per_1m_output_tokens ?? 0) > 0,
					pricePer1mInput: p.price_per_1m_input_tokens ?? 0,
					pricePer1mOutput: p.price_per_1m_output_tokens ?? 0,
					minCredits: p.min_credits ?? 0,
				}));
				setPlans(mapped);
			}
		} catch {
			// keep fallback
		}
		setPlansLoading(false);
	}

	async function fetchKeys() {
		setLoading(true);
		try {
			const { data, error } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
			if (!error && data) setKeys(data as ApiKey[]);
		} catch { }
		setLoading(false);
	}

	function buildPlanLabel(plan: PlanOption): string {
		return plan.name || (plan.multiplier <= 1 ? "Trial Plan" : `Pro Plan (${plan.multiplier}x)`);
	}

	function buildPlanLabelFromMultiplier(multiplier: number): string {
		return multiplier <= 1 ? "Trial Plan" : `Pro Plan (${multiplier}x)`;
	}

	/* Handles the confirmed purchase - creates order and returns its ID */
	async function handlePlanPurchase(data: {
		plan: PlanOption;
		paymentMethod: string;
		transactionRef: string;
		keyName: string;
	}): Promise<{ id: string }> {
		const { data: sessionData } = await supabase.auth.getSession();
		const userId = sessionData.session?.user.id;

		if (!userId) {
			throw new Error("You must be logged in to purchase a plan");
		}

		// Create a pending order record so the admin can audit it
		const { data: orderRow, error } = await supabase
			.from("orders")
			.insert({
				user_id: userId,
				username: user?.email ?? "user",
				plan_name: buildPlanLabel(data.plan),
				amount: data.plan.price,
				currency: data.plan.currency,
				status: "pending",
				payment_method: data.paymentMethod,
				payment_ref: data.transactionRef || null,
				notes: `Plan purchase: ${data.plan.name} (${data.plan.multiplier}x) — awaiting PAY0 verification`,
			})
			.select("id")
			.single();

		if (error || !orderRow?.id) {
			throw new Error(error?.message || "Failed to create order");
		}

		return orderRow;
	}

	/* Process a successful payment return - finalize the API key */
	async function finalizePaidOrder(successData: {
		orderId: string;
		plan: PlanInfo;
		paymentMethod: string;
		txnRef: string;
		keyName: string;
		utr: string;
		date: string;
		amount: string;
	}) {
		const fullKey = `sk-ant-api03-${Math.random().toString(36).slice(2, 20)}`;
		const prefix = fullKey.slice(0, 16) + "...";
		const { data: sessionData } = await supabase.auth.getSession();
		const userId = sessionData.session?.user.id;

		// Update the order to "paid"
		if (userId) {
			await supabase
				.from("orders")
				.update({
					status: "paid",
					payment_ref: successData.utr || successData.txnRef || null,
					notes: `Order ${successData.orderId} — PAY0 confirmed${
						successData.utr ? ` (UTR ${successData.utr})` : ""
					}`,
				})
				.eq("user_id", userId)
				.eq("status", "pending");
		}

		// Create the API key with plan settings
		const plan = successData.plan;
		const { error } = await supabase.from("api_keys").insert({
			name: successData.keyName || "Default Key",
			key_prefix: prefix,
			full_key_hash: fullKey,
			plan_name: buildPlanLabelFromMultiplier(plan.multiplier),
			is_active: true,
			total_requests: 0,
			tokens_used: 0,
			tokens_limit:
				plan.multiplier >= 20
					? 50_000_000
					: plan.multiplier >= 10
						? 15_000_000
						: plan.multiplier >= 5
							? 5_000_000
							: 1_000_000,
			rate_limit_rpm:
				plan.multiplier >= 20
					? 240
					: plan.multiplier >= 10
						? 120
						: plan.multiplier >= 5
							? 60
							: 20,
			expires_at: new Date(
				Date.now() + plan.durationDays * 24 * 60 * 60 * 1000
			).toISOString(),
		});

		if (!error) {
			setCreatedKey(fullKey);
			fetchKeys();
		}
	}

	/* Handle payment redirect: /user/my-keys?payment=success|failed */
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const result = params.get("payment");
		if (result === "success") {
			const raw = sessionStorage.getItem("payment_last_success");
			if (raw) {
				try {
					const data = JSON.parse(raw);
					finalizePaidOrder(data);
					sessionStorage.removeItem("payment_last_success");
				} catch {}
			}
		}
	}, []);

	async function deleteKey(id: string) {
		try { await supabase.from("api_keys").delete().eq("id", id); setKeys((k) => k.filter((k) => k.id !== id)); } catch { }
	}
	function toggleActive(id: string, cur: boolean) {
		const prev = keys;
		const next = !cur;
		setKeys((k) => k.map((k) => (k.id === id ? { ...k, is_active: next } : k)));
		supabase.from("api_keys").update({ is_active: next }).eq("id", id)
			.then(({ error }) => {
				if (error) {
					setKeys(prev);
					alert("Failed to update key status. Please try again.");
				}
			});
	}
	const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };

	const activeCount = keys.filter((k) => k.is_active).length;
	const totalReqs = keys.reduce((s, k) => s + (k.total_requests || 0), 0);
	const expiringSoon = keys.filter((k) => { if (!k.expires_at) return false; const d = ((new Date(k.expires_at).getTime() - Date.now()) / 864e5); return d < 30 && d > 0; }).length;

	return (
		<div className="dashboard flex min-h-screen">
			{sidebarOpen && <div className="fixed inset-0 z-[55] dashboard-overlay backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />}
			<div className={`fixed top-0 left-0 z-[60] h-full md:hidden transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
				<DashboardSidebar collapsed={false} onToggle={() => setSidebarOpen(false)} userEmail={user?.email} theme={theme} onThemeToggle={toggleTheme} />
			</div>
			<div className="hidden md:block">
				<DashboardSidebar collapsed={false} onToggle={() => { }} userEmail={user?.email} theme={theme} onThemeToggle={toggleTheme} />
			</div>

			<main className="flex-1 min-h-screen md:ml-[240px]">
				<header className="sticky top-0 z-40 border-b border-[var(--dashboard-border)]" style={{ backgroundColor: `color-mix(in srgb, var(--dashboard-bg) 85%, transparent)`, WebkitBackdropFilter: 'saturate(180%) blur(8px)', backdropFilter: 'saturate(180%) blur(8px)' }}>
					<div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8 gap-2">
						<div className="flex items-center gap-3 min-w-0">
							<button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--dashboard-nav-hover)] text-[var(--dashboard-text-secondary)] transition-colors shrink-0" aria-label="Open menu">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
							</button>
							<div className="min-w-0">
								<h1 className="text-sm font-semibold text-[var(--dashboard-text)] truncate">My Keys</h1>
								<p className="text-[11px] text-[var(--dashboard-text-muted)] hidden sm:block">{keys.length} key{keys.length !== 1 ? "s" : ""} configured</p>
							</div>
						</div>
						<div className="flex items-center gap-2 shrink-0">
							<button onClick={fetchKeys} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] transition-all disabled:opacity-50">
								<FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
								<span className="hidden sm:inline">Refresh</span>
							</button>
							<button onClick={() => setShowPlanModal(true)} className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-all">
								<FiPlus className="w-3.5 h-3.5" /><span className="hidden sm:inline">New Key</span>
							</button>
						</div>
					</div>
				</header>

				<div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto w-full">
					{/* Stats */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
						<div className="dashboard-card p-4 rounded-2xl dashboard-card-hover transition-all">
							<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider">Total Keys</p>
							<p className="text-xl sm:text-2xl font-bold text-[var(--dashboard-text)] mt-1">{keys.length}</p>
						</div>
						<div className="dashboard-card p-4 rounded-2xl dashboard-card-hover transition-all">
							<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider">Active</p>
							<p className="text-xl sm:text-2xl font-bold text-emerald-500 mt-1">{activeCount}</p>
						</div>
						<div className="dashboard-card p-4 rounded-2xl dashboard-card-hover transition-all">
							<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider">Total Requests</p>
							<p className="text-xl sm:text-2xl font-bold text-indigo-500 mt-1">{totalReqs.toLocaleString()}</p>
						</div>
						<div className="dashboard-card p-4 rounded-2xl dashboard-card-hover transition-all">
							<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider">Expiring Soon</p>
							<p className="text-xl sm:text-2xl font-bold text-amber-500 mt-1">{expiringSoon}</p>
						</div>
					</div>

					{/* Keys list */}
					<div className="space-y-3">
						{keys.length === 0 && !loading && (
							<div className="text-center py-16 sm:py-20 dashboard-card rounded-2xl">
								<FiKey className="w-10 h-10 text-[var(--dashboard-text-muted)] mx-auto mb-3" />
								<p className="text-sm text-[var(--dashboard-text-secondary)] font-medium">No API keys yet</p>
								<p className="text-xs text-[var(--dashboard-text-muted)] mt-1">Create your first key to start using the API</p>
							</div>
						)}

						{keys.map((key) => {
							const isRevealed = revealed.has(key.id);
							const usagePct = Math.min(100, ((key.tokens_used || 0) / (key.tokens_limit || 1)) * 100);
							const daysLeft = key.expires_at ? Math.max(0, (new Date(key.expires_at).getTime() - Date.now()) / 864e5) : Infinity;
							return (
								<div key={key.id} className="dashboard-card p-4 sm:p-5 rounded-2xl dashboard-card-hover transition-all">
									<div className="flex items-start justify-between gap-4">
										<div className="flex items-start gap-3 min-w-0 flex-1">
											<span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${key.is_active ? "bg-emerald-500" : "bg-[var(--dashboard-text-muted)]"}`} />
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2 flex-wrap">
													<h3 className="text-sm font-semibold text-[var(--dashboard-text)] truncate">{key.name}</h3>
													<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${key.is_active ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-[var(--dashboard-nav-hover)] text-[var(--dashboard-text-muted)] border-[var(--dashboard-border)]"}`}>
														{key.is_active ? "Active" : "Inactive"}
													</span>
												</div>
												<div className="flex flex-wrap items-center gap-2 mt-1.5">
													<code className="text-[11px] font-mono text-[var(--dashboard-text-muted)] bg-[var(--dashboard-input-bg)] px-2 py-0.5 rounded">{isRevealed ? key.key_prefix.replace("...", "....") : key.key_prefix}</code>
													<button onClick={() => setRevealed((s) => { const n = new Set(s); n.has(key.id) ? n.delete(key.id) : n.add(key.id); return n; })} className="text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] transition-colors p-0.5" aria-label={isRevealed ? "Hide" : "Reveal"}>{isRevealed ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}</button>
													<button onClick={() => copy(key.key_prefix, key.id)} className="text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] transition-colors p-0.5" aria-label="Copy"><FiCopy className="w-3.5 h-3.5" /></button>
													{copiedId === key.id && <span className="text-[10px] text-emerald-500 font-medium">Copied!</span>}
												</div>
											</div>
										</div>
										<div className="flex items-center gap-0.5 shrink-0">
											<button onClick={() => toggleActive(key.id, key.is_active)} className={`p-2 rounded-lg transition-all cursor-pointer touch-manipulation ${key.is_active ? "text-[var(--dashboard-text-muted)] hover:text-amber-500 hover:bg-amber-500/5" : "text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/5"}`} title={key.is_active ? "Deactivate" : "Activate"}><FiShield className="w-4 h-4" /></button>
											<button onClick={() => deleteKey(key.id)} className="p-2 rounded-lg text-[var(--dashboard-text-muted)] hover:text-red-500 hover:bg-red-500/5 transition-all cursor-pointer touch-manipulation" title="Delete"><FiTrash2 className="w-4 h-4" /></button>
										</div>
									</div>
									<div className="mt-4">
										<div className="flex items-center justify-between mb-1.5">
											<span className="text-[11px] text-[var(--dashboard-text-muted)]">Token Usage</span>
											<span className="text-[11px] font-mono text-[var(--dashboard-text-secondary)]">{(key.tokens_used || 0).toLocaleString()} / {(key.tokens_limit || 0).toLocaleString()}</span>
										</div>
										<div className="w-full bg-[var(--dashboard-input-bg)] rounded-full h-1.5 sm:h-2 overflow-hidden">
											<div className={`h-full rounded-full transition-all ${usagePct > 80 ? "bg-rose-500" : usagePct > 50 ? "bg-amber-500" : "bg-indigo-500"}`} style={{ width: `${usagePct}%` }} />
										</div>
									</div>
									<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--dashboard-text-muted)]">
										<span className="flex items-center gap-1"><FiActivity className="w-3 h-3" />{(key.total_requests || 0).toLocaleString()} req</span>
										<span className="flex items-center gap-1"><FiClock className="w-3 h-3" />{daysLeft < 30 && daysLeft > 0 ? `${Math.ceil(daysLeft)}d left` : daysLeft <= 0 ? "Expired" : "No expiry"}</span>
										<span className="flex items-center gap-1"><FiShield className="w-3 h-3" />{key.rate_limit_rpm}/min</span>
										<span className="truncate">{key.plan_name}</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</main>

			{/* ─── Plan Purchase Modal ─── */}
			<PlanPurchaseModal
				open={showPlanModal}
				plans={plans}
				loading={plansLoading}
				onClose={() => setShowPlanModal(false)}
				onConfirm={handlePlanPurchase}
			/>

			{/* ─── Payment Verification Overlay Modal ─── */}
			{verificationStatus !== "idle" && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" role="dialog" aria-modal="true">
					<div className="dashboard-modal-bg dashboard-card relative w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[var(--dashboard-border)] text-center">
						<div className="flex flex-col items-center justify-center space-y-4">
							{verificationStatus === "verifying" && (
								<>
									<FiRefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
									<h2 className="text-lg font-bold text-[var(--dashboard-text)]">Verifying Payment</h2>
									<p className="text-xs text-[var(--dashboard-text-muted)] leading-relaxed">{verificationMessage}</p>
								</>
							)}
							{verificationStatus === "success" && (
								<>
									<div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
										<FiCheck className="w-8 h-8" />
									</div>
									<h2 className="text-lg font-bold text-[var(--dashboard-text)]">Payment Verified!</h2>
									<p className="text-xs text-[var(--dashboard-text-muted)] leading-relaxed">{verificationMessage}</p>
								</>
							)}
							{verificationStatus === "failed" && (
								<>
									<div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
										<FiAlertTriangle className="w-8 h-8" />
									</div>
									<h2 className="text-lg font-bold text-[var(--dashboard-text)]">Verification Failed</h2>
									<p className="text-xs text-[var(--dashboard-text-muted)] leading-relaxed">{verificationMessage}</p>
									<button onClick={() => { setVerificationStatus("idle"); setSearchParams({}); }} className="mt-4 px-4 py-2 bg-[var(--dashboard-border)] hover:bg-[var(--dashboard-nav-hover)] text-xs font-semibold rounded-xl text-[var(--dashboard-text)] transition-all">Close</button>
								</>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
