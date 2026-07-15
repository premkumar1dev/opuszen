import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
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
	const [user, setUser] = useState<any>(null);
	const [keys, setKeys] = useState<ApiKey[]>([]);
	const [loading, setLoading] = useState(true);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [showCreate, setShowCreate] = useState(false);
	const [newName, setNewName] = useState("");
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [revealed, setRevealed] = useState<Set<string>>(new Set());

	/* Plan purchase modal state */
	const [showPlanModal, setShowPlanModal] = useState(false);
	const [plans, setPlans] = useState<PlanOption[]>(FALLBACK_PLANS);
	const [plansLoading, setPlansLoading] = useState(false);

	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => setUser(data.user));
		fetchKeys();
		fetchPlans();
	}, []);

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
		if (plan.multiplier === 1) return "Trial Plan";
		return `Pro Plan (${plan.multiplier}x)`;
	}

	function buildPlanLabelFromMultiplier(multiplier: number): string {
		if (multiplier <= 1) return "Trial Plan";
		return `Pro Plan (${multiplier}x)`;
	}

	/* Handles the confirmed purchase - navigates to payment page with full plan context */
	async function handlePlanPurchase(data: {
		plan: PlanOption;
		paymentMethod: string;
		transactionRef: string;
	}) {
		const { data: sessionData } = await supabase.auth.getSession();
		const userId = sessionData.session?.user.id;

		// Create a pending order record so the admin can audit it
		if (userId) {
			await supabase.from("orders").insert({
				user_id: userId,
				username: user?.email ?? "user",
				plan_name: buildPlanLabel(data.plan),
				amount: data.plan.price,
				currency: data.plan.currency,
				status: "pending",
				payment_method: data.paymentMethod,
				payment_ref: data.transactionRef || null,
				notes: `Plan purchase: ${data.plan.name} (${data.plan.multiplier}x) — awaiting PAY0 verification`,
			});
		}

		// Close the modal — the payment page is opened by PlanPurchaseModal
		setShowPlanModal(false);
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

	/* Direct free/trial key creation (no plan modal needed) */
	async function createTrialKey() {
		if (!newName.trim()) return;
		const fullKey = `sk-ant-api03-${Math.random().toString(36).slice(2, 20)}`;
		const prefix = fullKey.slice(0, 16) + "...";
		try {
			const { error } = await supabase.from("api_keys").insert({
				name: newName, key_prefix: prefix, full_key_hash: fullKey, plan_name: "Trial Plan",
				is_active: true, total_requests: 0, tokens_used: 0,
				tokens_limit: 100_000,
				rate_limit_rpm: 20, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
			});
			if (!error) { setCreatedKey(fullKey); setNewName(""); fetchKeys(); }
		} catch { }
	}

	async function deleteKey(id: string) {
		try { await supabase.from("api_keys").delete().eq("id", id); setKeys((k) => k.filter((k) => k.id !== id)); } catch { }
	}
	function toggleActive(id: string, cur: boolean) {
		setKeys((k) => k.map((k) => (k.id === id ? { ...k, is_active: !cur } : k)));
		supabase.from("api_keys").update({ is_active: !cur }).eq("id", id).then();
	}
	const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };

	const activeCount = keys.filter((k) => k.is_active).length;
	const totalReqs = keys.reduce((s, k) => s + (k.total_requests || 0), 0);
	const expiringSoon = keys.filter((k) => { if (!k.expires_at) return false; const d = (new Date(k.expires_at).getTime() - Date.now()) / 864e5; return d < 30 && d > 0; }).length;

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

			{/* ─── Legacy Create Modal (kept for quick trial keys) ─── */}
			{showCreate && (
				<div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
					<div className="absolute inset-0 dashboard-overlay backdrop-blur-sm" onClick={() => { setShowCreate(false); setCreatedKey(null); }} />
					<div className="dashboard-modal-bg dashboard-card relative w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl border border-[var(--dashboard-border)] max-h-[90vh] sm:max-h-[85vh] overflow-y-auto">
						<h2 className="text-base sm:text-lg font-bold text-[var(--dashboard-text)] mb-1">Create New API Key</h2>
						<p className="text-xs text-[var(--dashboard-text-muted)] mb-5">Generate a new key to authenticate API requests.</p>

						{createdKey ? (
							<div className="space-y-4">
								<div className="p-3 sm:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
									<p className="text-xs font-semibold text-emerald-500 mb-2">Your new key (save it now!)</p>
									<div className="flex items-center gap-2">
										<code className="text-[10px] sm:text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-black/20 px-2 sm:px-3 py-2 rounded-lg flex-1 break-all select-all">{createdKey}</code>
										<button onClick={() => copy(createdKey, "new")} className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-all cursor-pointer shrink-0" aria-label="Copy key"><FiCopy className="w-4 h-4" /></button>
									</div>
								</div>
								<p className="text-[11px] text-amber-500 flex items-center gap-1.5"><FiAlertTriangle className="w-3 h-3 shrink-0" />We cannot show this key again. Copy it somewhere safe.</p>
								<button onClick={() => { setShowCreate(false); setCreatedKey(null); }} className="w-full py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-all cursor-pointer touch-manipulation">Done</button>
							</div>
						) : (
							<div className="space-y-4">
								<div>
									<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-1.5">Key Name</label>
									<input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Production, Dev..." className="dashboard-input w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition-all" onKeyDown={(e) => e.key === "Enter" && createTrialKey()} autoFocus />
								</div>
								<p className="text-[11px] text-[var(--dashboard-text-muted)] flex items-start gap-1.5">
									<FiZap className="w-3 h-3 shrink-0 mt-0.5" />
									This creates a trial key with limited quota. For paid plans, use the
									<button onClick={() => { setShowCreate(false); setShowPlanModal(true); }} className="text-indigo-500 hover:underline cursor-pointer"> plan modal</button>.
								</p>
								<div className="flex gap-2 pt-2">
									<button onClick={() => { setShowCreate(false); setCreatedKey(null); }} className="flex-1 py-2.5 rounded-xl border border-[var(--dashboard-border)] text-sm font-medium text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] transition-all cursor-pointer touch-manipulation">Cancel</button>
									<button onClick={createTrialKey} disabled={!newName.trim()} className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-all disabled:opacity-40 cursor-pointer touch-manipulation">Create Trial Key</button>
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
