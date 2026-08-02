import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "~/utils/supabase";
import {
	FiX,
	FiCheck,
	FiZap,
	FiShield,
	FiStar,
	FiAward,
	FiCreditCard,
	FiLoader,
	FiSmartphone,
	FiLock,
} from "react-icons/fi";
import { SiGooglepay, SiPhonepe, SiPaytm } from "react-icons/si";
import { FaRupeeSign } from "react-icons/fa6";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

export interface PlanOption {
	id: string;
	name: string;
	description?: string;
	multiplier: number;
	price: number;
	currency: string;
	durationDays: number;
	features?: string[];
	isPopular?: boolean;
	color?: string;
	isTokenPricing?: boolean;
	pricePer1mInput?: number;
	pricePer1mOutput?: number;
	minCredits?: number;
	badgeText?: string;
	secondaryPriceText?: string;
	buttonText?: string;
	buttonSubtext?: string;
	isDarkCard?: boolean;
	priceUsdt?: number;
}

interface PlanPurchaseModalProps {
	open: boolean;
	onClose: () => void;
	initialPlan?: PlanOption | null;
	onConfirm: (data: {
		plan: PlanOption;
		paymentMethod: PaymentMethod;
		transactionRef: string;
		keyName: string;
	}) => Promise<any>;
	onPaymentInitiated?: (orderId: string, gatewayOrderId: string, plan: PlanOption, keyName: string) => void;
}

/**
 * Supported payment methods.
 *
 * PAY0 is the integrated gateway that aggregates UPI / GPay / PhonePe /
 * Paytm / Cards behind a single hosted checkout. The other methods are
 * kept available for direct UPI / Card flows.
 */
type PaymentMethod =
	| "PAY0"
	| "UPI"
	| "GPay"
	| "PhonePe"
	| "Paytm"
	| "Card";

// PAYMENT_METHODS is now defined dynamically inside the PaymentForm component

const PLAN_COLORS = [
	"from-primary to-primary/80",
	"from-primary to-primary/80",
	"from-violet-500 to-purple-500",
	"from-primary to-primary/80",
	"from-primary to-primary/80",
	"from-emerald-500 to-teal-600",
	"from-chart-2 to-primary",
];

function getPlanIcon(index: number) {
	const icons = [
		<FiStar className="w-5 h-5" />,
		<FiZap className="w-5 h-5" />,
		<FiShield className="w-5 h-5" />,
		<FiAward className="w-5 h-5" />,
	];
	return icons[index % icons.length];
}

function getDurationLabel(days: number): string {
	if (days === 1) return "1 Day";
	if (days === 7) return "1 Week";
	if (days === 30) return "1 Month";
	if (days === 365) return "1 Year";
	if (days === 36500) return "Lifetime";
	if (days < 30) return `${days} Days`;
	if (days < 365) return `${Math.round(days / 30)} Months`;
	return `${Math.round(days / 365)} Years`;
}

function formatCurrency(n: number, currency = "INR"): string {
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency,
		minimumFractionDigits: 0,
	}).format(n);
}

/* ------------------------------------------------------------------ */
/* Modal */
/* ------------------------------------------------------------------ */

export function PlanPurchaseModal({
	open,
	onClose,
	initialPlan,
	onConfirm,
	onPaymentInitiated,
}: PlanPurchaseModalProps) {
	const [plans, setPlans] = useState<PlanOption[]>([]);
	const [plansLoading, setPlansLoading] = useState(false);
	const [plansError, setPlansError] = useState<string | null>(null);
	const [gatewayName, setGatewayName] = useState("PAY0");
	const [selectedPlanId, setSelectedPlanId] = useState<string>("");
	const [selectedMethod, setSelectedMethod] =
		useState<PaymentMethod>("PAY0");
	const [txnRef, setTxnRef] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [step, setStep] = useState<"select" | "pay">("select");
	const [keyName, setKeyName] = useState("");

	/* ── Fetch plans from API when modal opens ── */
	useEffect(() => {
		if (!open) return;
		let cancelled = false;

		async function fetchPlans() {
			setPlansLoading(true);
			setPlansError(null);
			try {
				const { data, error } = await supabase
					.from("plans")
					.select("*")
					.eq("is_active", true)
					.order("sort_order", { ascending: true });

				if (error) throw error;
				if (!cancelled) {
					const mapped: PlanOption[] = (data ?? []).map((p: any) => ({
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
						badgeText: p.badge_text ?? undefined,
						secondaryPriceText: p.secondary_price_text ?? undefined,
						buttonText: p.button_text ?? undefined,
						buttonSubtext: p.button_subtext ?? undefined,
						isDarkCard: p.is_dark_card ?? false,
						priceUsdt: p.price_usdt ?? 0,
					}));
					const selectedPlanExists = initialPlan
						? mapped.some((plan) => plan.id === initialPlan.id)
						: false;
					const availablePlans = initialPlan && !selectedPlanExists
						? [initialPlan, ...mapped]
						: mapped;
					setPlans(availablePlans);
					if (initialPlan) {
						setSelectedPlanId(initialPlan.id);
					} else if (availablePlans.length > 0) {
						setSelectedPlanId(availablePlans[0].id);
					}
				}
			} catch (err: any) {
				if (!cancelled) setPlansError(err.message ?? "Failed to load plans");
			} finally {
				if (!cancelled) setPlansLoading(false);
			}
		}

		fetchPlans();
		return () => { cancelled = true; };
	}, [open, initialPlan]);

	/* ── Fetch gateway name ── */
	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		supabase
			.from("payment_gateway_settings")
			.select("gateway_name")
			.eq("is_active", true)
			.maybeSingle()
			.then(({ data }) => {
				if (!cancelled && data?.gateway_name) setGatewayName(data.gateway_name);
			});
		return () => { cancelled = true; };
	}, [open]);

	/* ── Reset form state on open ── */
	useEffect(() => {
		if (open) {
			setSelectedMethod("PAY0");
			setTxnRef("");
			setKeyName("");
			setStep("select");
		}
	}, [open]);

	const selectedPlan =
		plans.find((p) => p.id === selectedPlanId) ?? plans[0];

	if (!open || !selectedPlan) return null;

	const handleProceedToPay = () => setStep("pay");
	const handleBack = () => setStep("select");

	const handleGoToPayment = async () => {
		setSubmitting(true);
		const checkoutWindow = selectedPlan.price > 0 ? window.open("", "_blank") : null;
		if (checkoutWindow) {
			checkoutWindow.opener = null;
			checkoutWindow.document.title = "Opening checkout...";
			checkoutWindow.document.body.innerHTML = "Opening secure checkout...";
		}
		console.log("[PlanPurchaseModal] Starting handleGoToPayment...");
		try {
			// 1. Create the pending order record in the database
			console.log("[PlanPurchaseModal] Calling onConfirm...");
			const orderRow = await onConfirm({
				plan: selectedPlan,
				paymentMethod: selectedMethod,
				transactionRef: txnRef.trim(),
				keyName: keyName.trim(),
			});
			console.log("[PlanPurchaseModal] onConfirm resolved. orderRow:", orderRow);

			const orderId = orderRow?.id;
			if (!orderId) {
				throw new Error("Failed to initialize order ID");
			}

			// 2. Extract user phone/mobile
			console.log("[PlanPurchaseModal] Fetching supabase session...");
			const { data: sessionData } = await supabase.auth.getSession();
			console.log("[PlanPurchaseModal] Session retrieved.");
			const user = sessionData.session?.user;
			const customerMobile = user ? (user.phone || "0000000000").replace(/\D/g, "").slice(-10) : "0000000000";

			// 3. Build ORD-xxx gateway order ID
			const ts = Date.now().toString(36).toUpperCase();
			const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
			const gatewayOrderId = `ORD-${ts}-${rand}`;

			// 4. Build callback redirect params
			const returnParams = new URLSearchParams({
				payment: "verify",
				orderId: orderId,
				gatewayOrderId: gatewayOrderId,
				planId: selectedPlan.id,
				planName: selectedPlan.name,
				multiplier: String(selectedPlan.multiplier),
				price: String(selectedPlan.price),
				currency: selectedPlan.currency,
				duration: String(selectedPlan.durationDays),
				method: selectedMethod,
				keyName: keyName.trim(),
				tokenPricing: selectedPlan.isTokenPricing ? "1" : "0",
				pricePer1mInput: String(selectedPlan.pricePer1mInput || 0),
				pricePer1mOutput: String(selectedPlan.pricePer1mOutput || 0),
				minCredits: String(selectedPlan.minCredits || 0),
			});
			const redirectUrl = `${window.location.origin}/user/my-keys?${returnParams.toString()}`;

			// Direct instant activation for ₹0 / Free Trial plan (bypasses payment gateway API)
			if (selectedPlan.price === 0) {
				sessionStorage.setItem(`gateway_order_${orderId}`, gatewayOrderId);
				if (onPaymentInitiated) {
					onPaymentInitiated(orderId, gatewayOrderId, selectedPlan, keyName.trim());
				}
				onClose();
				window.location.href = redirectUrl;
				return;
			}

			// 5. Invoke gateway order creation API for paid plans
			const formData = new FormData();
			formData.set("intent", "create_order");
			formData.set("customer_mobile", customerMobile);
			formData.set("amount", String(selectedPlan.price));
			formData.set("order_id", gatewayOrderId);
			formData.set("redirect_url", redirectUrl);
			formData.set("remark1", selectedPlan.name);
			formData.set("remark2", selectedPlan.multiplier > 1 ? `Pro Plan (${selectedPlan.multiplier}x)` : "Trial Plan");

			console.log("[PlanPurchaseModal] Fetching /api/payment proxy action...");
			const res = await fetch("/api/payment", {
				method: "POST",
				body: formData,
			});
			console.log("[PlanPurchaseModal] Fetch received status:", res.status);
			const response = await res.json();
			console.log("[PlanPurchaseModal] Fetch parsed response JSON:", response);

			if (response.status === false) {
				throw new Error(response.message || "Failed to create payment order");
			}

			// Store gateway order ID mapping for validation
			sessionStorage.setItem(`gateway_order_${orderId}`, gatewayOrderId);

			// Update the order with the gateway order ID so finalize-key can find it later
			await supabase
				.from("orders")
				.update({ payment_ref: gatewayOrderId })
				.eq("id", orderId);

			const checkoutUrl = response.result?.payment_url || response.result?.checkoutUrl || response.result?.paymentUrl || response.result?.payment_link;
			if (!checkoutUrl) {
				throw new Error("No payment URL received from gateway");
			}

			// Open checkout URL using the pre-opened window (opened in user-gesture context above)
			if (checkoutWindow) {
				checkoutWindow.location.href = checkoutUrl;
			} else {
				// Fallback: direct navigation in current tab
				window.location.href = checkoutUrl;
			}

			if (onPaymentInitiated) {
				onPaymentInitiated(orderId, gatewayOrderId, selectedPlan, keyName.trim());
			}
			onClose();
		} catch (err) {
			if (checkoutWindow && !checkoutWindow.closed) {
				checkoutWindow.close();
			}
			console.error("[plan-purchase] payment failed:", err);
			alert(err instanceof Error ? err.message : "Failed to initiate payment. Please try again.");
			setSubmitting(false);
		}
	};

	return createPortal(
		<AnimatePresence>
			<div
				className="dashboard dark fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4"
				role="dialog"
				aria-modal="true"
			>
				{/* Overlay */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
					className="absolute inset-0 bg-black/70 backdrop-blur-sm"
					onClick={onClose}
				/>

				{/* Card */}
				<motion.div
					initial={{ opacity: 0, scale: 0.96, y: 12 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.96, y: 12 }}
					transition={{ duration: 0.25, ease: "easeOut" }}
					className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-[var(--dashboard-border)] shadow-2xl dashboard-modal-bg"
				>
					{/* Header */}
					<div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-[var(--dashboard-border)] shrink-0">
						<div className="min-w-0">
							<div className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-mono font-semibold text-primary dark:text-primary uppercase tracking-wider">
								<FiZap className="w-3 h-3" />
								Upgrade Plan
							</div>
							<h2 className="text-lg sm:text-xl font-bold text-[var(--dashboard-text)] truncate">
								{step === "select" ? "Rent a Plan" : "Complete Payment"}
							</h2>
							<p className="text-xs text-[var(--dashboard-text-muted)] mt-0.5">
								{step === "select"
									? "Rent an API key plan — pick a rate and duration."
									: `Pay ${formatCurrency(
										selectedPlan.price,
										selectedPlan.currency
									)} via your preferred method.`}
							</p>
						</div>
						<button
							onClick={onClose}
							className="p-2 rounded-lg text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] transition-all cursor-pointer shrink-0"
							aria-label="Close"
							type="button"
						>
							<FiX className="w-4 h-4" />
						</button>
					</div>

					{/* Body */}
					<div className="overflow-y-auto flex-1 p-5 sm:p-6 custom-scrollbar">
						{plansLoading && plans.length === 0 ? (
							<div className="flex items-center justify-center py-16">
								<FiLoader className="w-7 h-7 animate-spin text-[var(--dashboard-text-muted)]" />
							</div>
						) : step === "select" ? (
							<PlanGrid
								plans={plans}
								selectedId={selectedPlanId}
								onSelect={setSelectedPlanId}
							/>
						) : (
							<PaymentForm
								plan={selectedPlan}
								method={selectedMethod}
								onMethodChange={setSelectedMethod}
								txnRef={txnRef}
								onTxnRefChange={setTxnRef}
								keyName={keyName}
								onKeyNameChange={setKeyName}
								gatewayName={gatewayName}
							/>
						)}
					</div>

					{/* Footer */}
					<div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-t border-[var(--dashboard-border)] bg-[var(--dashboard-card)] shrink-0">
						<button
							onClick={step === "select" ? onClose : handleBack}
							disabled={submitting}
							type="button"
							className="px-4 py-2.5 rounded-xl border border-[var(--dashboard-border)] text-sm font-medium text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] transition-all cursor-pointer touch-manipulation disabled:opacity-50"
						>
							{step === "select" ? "Cancel" : "← Back"}
						</button>

						{step === "select" ? (
							<button
								onClick={handleProceedToPay}
								disabled={!selectedPlan || plansLoading}
								type="button"
								className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all cursor-pointer touch-manipulation disabled:opacity-50 inline-flex items-center gap-2"
							>
								Continue with Pay
								<span className="hidden sm:inline">→</span>
							</button>
						) : (
							<button
								onClick={handleGoToPayment}
								disabled={!keyName.trim() || (selectedMethod !== "PAY0" && !txnRef.trim()) || submitting}
								type="button"
								className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all cursor-pointer touch-manipulation disabled:opacity-40 inline-flex items-center gap-2"
							>
								{submitting ? (
									<>
										<FiLoader className="w-4 h-4 animate-spin" />
										Opening Payment…
									</>
								) : (
									<>
										<FiCheck className="w-4 h-4" />
										Pay via {gatewayName || "Pay"}
									</>
								)}
							</button>
						)}
					</div>
				</motion.div>
			</div>
		</AnimatePresence>,
		document.body
	);
}

/* ------------------------------------------------------------------ */
/* Plan Grid (step 1) */
/* ------------------------------------------------------------------ */

function PlanGrid({
	plans,
	selectedId,
	onSelect,
}: {
	plans: PlanOption[];
	selectedId: string;
	onSelect: (id: string) => void;
}) {
	if (plans.length === 0) {
		return (
			<div className="text-center py-12">
				<FiZap className="w-10 h-10 text-[var(--dashboard-text-muted)]/40 mx-auto mb-2" />
				<p className="text-sm text-[var(--dashboard-text-secondary)]">
					No plans available right now.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{plans.map((plan, index) => {
				const isSelected = selectedId === plan.id;
				const color = plan.color ?? PLAN_COLORS[index % PLAN_COLORS.length];

				return (
					<div
						key={plan.id}
						className={`rounded-xl border-2 overflow-hidden transition-all duration-200 ${
							isSelected
								? "border-primary bg-primary/5 shadow-md"
								: "border-[var(--dashboard-border)] hover:border-[var(--dashboard-text-muted)]/40 bg-[var(--dashboard-card)]"
						}`}
					>
						<button
							type="button"
							onClick={() => onSelect(plan.id)}
							className="w-full p-4 flex items-center justify-between gap-4 cursor-pointer text-left focus:outline-none"
						>
							{/* Left section: Icon + Title */}
							<div className="flex items-center gap-3.5 min-w-0">
								<div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shrink-0 shadow-sm`}>
									{getPlanIcon(index)}
								</div>
								<div className="min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<h3 className="text-sm font-bold text-[var(--dashboard-text)] truncate">
											{plan.name}
										</h3>
										{plan.multiplier !== 1 && (
											<span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
												{plan.multiplier}x Rate
											</span>
										)}
										{plan.isPopular && (
											<span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
												Popular
											</span>
										)}
										{plan.isTokenPricing && (
											<span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
												Token Billing
											</span>
										)}
									</div>
									{plan.description && (
										<p className="text-[11px] text-[var(--dashboard-text-muted)] mt-1 line-clamp-1">
											{plan.description}
										</p>
									)}
								</div>
							</div>

							{/* Right section: Price & Radio */}
							<div className="flex items-center gap-4 shrink-0 text-right">
								<div>
									{plan.isTokenPricing && plan.minCredits && plan.minCredits > 0 ? (
										<>
											<div className="text-sm font-bold text-[var(--dashboard-text)]">
												{formatCurrency(plan.minCredits, plan.currency)}
											</div>
											<div className="text-[9px] text-[var(--dashboard-text-muted)] mt-0.5">
												min credits
											</div>
										</>
									) : (
										<>
											<div className="text-sm font-bold text-[var(--dashboard-text)]">
												{formatCurrency(plan.price, plan.currency)}
											</div>
											<div className="text-[9px] text-[var(--dashboard-text-muted)] mt-0.5">
												/ {getDurationLabel(plan.durationDays)}
											</div>
										</>
									)}
								</div>
								<div
									className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
										isSelected
											? "border-primary bg-primary"
											: "border-[var(--dashboard-border)]"
									}`}
								>
									{isSelected && <FiCheck className="w-3 h-3 text-white" />}
								</div>
							</div>
						</button>

						{/* Expanded Section (only if selected and has extra details) */}
						{isSelected && (plan.isTokenPricing || (plan.features && plan.features.length > 0)) && (
							<div className="px-4 pb-4 pt-1 border-t border-[var(--dashboard-border)]/50 bg-[var(--dashboard-card)]/50">
								{/* Token pricing details */}
								{plan.isTokenPricing && (
									<div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 mb-3">
										<p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
											Token Rates
										</p>
										<div className="grid grid-cols-2 gap-3 text-[11px]">
											{plan.pricePer1mInput && plan.pricePer1mInput > 0 ? (
												<div>
													<span className="text-[var(--dashboard-text-secondary)]">Input:</span>
													<span className="text-[var(--dashboard-text)] font-mono font-semibold ml-1">
														{plan.currency} {plan.pricePer1mInput.toFixed(4)}/1M
													</span>
												</div>
											) : null}
											{plan.pricePer1mOutput && plan.pricePer1mOutput > 0 ? (
												<div>
													<span className="text-[var(--dashboard-text-secondary)]">Output:</span>
													<span className="text-[var(--dashboard-text)] font-mono font-semibold ml-1">
														{plan.currency} {plan.pricePer1mOutput.toFixed(4)}/1M
													</span>
												</div>
											) : null}
										</div>
										<p className="text-[9px] text-[var(--dashboard-text-muted)] mt-2">
											Charged dynamically per token. Unused credits remain in your balance.
										</p>
									</div>
								)}

								{/* Features list */}
								{plan.features && plan.features.length > 0 && (
									<div>
										<p className="text-[9px] font-bold text-[var(--dashboard-text-muted)] uppercase tracking-wider mb-2">
											What's Included
										</p>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
											{plan.features.map((f, i) => (
												<div
													key={i}
													className="flex items-center gap-1.5 text-[11px] text-[var(--dashboard-text-secondary)]"
												>
													<FiCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
													<span className="truncate">{f}</span>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Payment Form (step 2) */
/* ------------------------------------------------------------------ */

function PaymentForm({
	plan,
	method,
	onMethodChange,
	txnRef,
	onTxnRefChange,
	keyName,
	onKeyNameChange,
	gatewayName,
}: {
	plan: PlanOption;
	method: PaymentMethod;
	onMethodChange: (m: PaymentMethod) => void;
	txnRef: string;
	onTxnRefChange: (v: string) => void;
	keyName: string;
	onKeyNameChange: (v: string) => void;
	gatewayName?: string;
}) {
	const PAYMENT_METHODS = [
		{
			id: "PAY0" as const,
			label: gatewayName || "PAY0",
			description: "All methods — UPI, GPay, PhonePe, Paytm, Cards",
			icon: <FiZap className="w-5 h-5" />,
			color: "from-primary to-amber-500",
			recommended: true,
		},
	];
	return (
		<div className="space-y-5">
			{/* Order summary */}
			<div className="p-4 rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-input-bg)]">
				<div className="flex items-center justify-between mb-2">
					<span className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider">
						Order Summary
					</span>
					{plan.multiplier !== 1 && (
						<span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
							{plan.multiplier}x Rate
						</span>
					)}
				</div>
				<div className="flex items-end justify-between">
					<div>
						<p className="text-sm font-bold text-[var(--dashboard-text)]">
							{plan.name}
						</p>
						<p className="text-[11px] text-[var(--dashboard-text-muted)] mt-0.5">
							{getDurationLabel(plan.durationDays)}
						</p>
					</div>
					<div className="text-right">
						<p className="text-xl font-bold text-[var(--dashboard-text)] flex items-center gap-1">
							<FaRupeeSign className="w-3.5 h-3.5" />
							{plan.price.toLocaleString("en-IN")}
						</p>
						<p className="text-[10px] text-[var(--dashboard-text-muted)]">
							{plan.currency}
						</p>
					</div>
				</div>
			</div>

			{/* Key name */}
			<div>
				<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-2 uppercase tracking-wider">
					Key Name <span className="text-red-500 normal-case">*</span>
				</label>
				<input
					type="text"
					value={keyName}
					onChange={(e) => onKeyNameChange(e.target.value)}
					placeholder="e.g. Production, Dev, Testing..."
					maxLength={50}
					className="dashboard-input w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-all"
				/>
			</div>

			{/* Payment method */}
			<div>
				<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-2 uppercase tracking-wider">
					Payment Method <span className="text-red-500 normal-case">*</span>
				</label>

				{/* Integrated gateway banner */}
				<div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 via-amber-500/10 to-primary/10 border border-primary/20">
					<div className="flex items-center gap-2">
						<FiZap className="w-4 h-4 text-primary shrink-0" />
						<p className="text-[11px] text-[var(--dashboard-text-secondary)] leading-relaxed">
							<strong className="text-[var(--dashboard-text)]">
								{gatewayName || "PAY0"}
							</strong>{" "}
							aggregates every Indian payment method into a single secure
							checkout — recommended for fastest confirmation.
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-2">
					{PAYMENT_METHODS.map((m) => {
						const isSelected = method === m.id;
						return (
							<button
								key={m.id}
								type="button"
								onClick={() => onMethodChange(m.id)}
								className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
									isSelected
										? "border-primary bg-primary/5"
										: "border-[var(--dashboard-border)] hover:border-[var(--dashboard-text-muted)]/40"
								}`}
							>
								{m.recommended && (
									<span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-md bg-primary text-[8px] font-bold text-white uppercase tracking-wider">
										Recommended
									</span>
								)}
								<div
									className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center text-white shrink-0`}
								>
									{m.icon}
								</div>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-semibold text-[var(--dashboard-text)] truncate">
										{m.label}
									</p>
									<p className="text-[10px] text-[var(--dashboard-text-muted)] truncate">
										{m.description}
									</p>
								</div>
								<div
									className={`w-4 h-4 rounded-full border-2 shrink-0 ${
										isSelected
											? "border-primary bg-primary"
											: "border-[var(--dashboard-border)]"
									}`}
								>
									{isSelected && (
										<div className="w-full h-full flex items-center justify-center">
											<div className="w-1.5 h-1.5 rounded-full bg-white" />
										</div>
									)}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Transaction reference or gateway redirect message */}
			{method === "PAY0" ? (
				<div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-2.5">
					<FiLock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
					<div>
						<p className="text-xs font-semibold text-[var(--dashboard-text)]">
							Automatic Verification
						</p>
						<p className="text-[11px] text-[var(--dashboard-text-secondary)] leading-relaxed mt-1">
							Complete the payment of{" "}
							<strong className="text-[var(--dashboard-text)]">
								{formatCurrency(plan.price, plan.currency)}
							</strong>{" "}
							on the secure gateway page. Your transaction reference will be auto-detected and verified dynamically.
						</p>
					</div>
				</div>
			) : (
				<div>
					<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-2 uppercase tracking-wider">
						Transaction Reference / UTR{" "}
						<span className="text-red-500 normal-case">*</span>
					</label>
					<input
						type="text"
						value={txnRef}
						onChange={(e) => onTxnRefChange(e.target.value)}
						placeholder={
							method === "UPI" ||
							 method === "GPay" ||
							 method === "PhonePe" ||
							 method === "Paytm"
								? "e.g. 123456789012 (12-digit UTR)"
								: "e.g. Transaction ID from payment receipt"
						}
						className="dashboard-input w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-all font-mono"
					/>

					<div className="mt-2 flex items-start gap-1.5 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
						<FiLock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
						<p className="text-[10px] text-[var(--dashboard-text-secondary)] leading-relaxed">
							Complete the payment of{" "}
							<strong className="text-[var(--dashboard-text)]">
								{formatCurrency(plan.price, plan.currency)}
							</strong>{" "}
							to the account details shared by support, then paste the
							transaction reference here for verification.
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
