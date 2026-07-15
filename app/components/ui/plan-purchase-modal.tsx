import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
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
}

interface PlanPurchaseModalProps {
 open: boolean;
 plans: PlanOption[];
 defaultPlanId?: string;
 loading?: boolean;
 userName?: string;
 onClose: () => void;
 onConfirm: (data: {
 plan: PlanOption;
 paymentMethod: PaymentMethod;
 transactionRef: string;
 }) => Promise<void> | void;
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

const PAYMENT_METHODS: {
 id: PaymentMethod;
 label: string;
 description: string;
 icon: React.ReactNode;
 color: string;
 recommended?: boolean;
}[] = [
 {
 id: "PAY0",
 label: "PAY0",
 description: "All methods — UPI, GPay, PhonePe, Paytm, Cards",
 icon: <FiZap className="w-5 h-5" />,
 color: "from-indigo-500 to-violet-600",
 recommended: true,
 },
 {
 id: "UPI",
 label: "UPI",
 description: "Pay using any UPI ID",
 icon: <FiSmartphone className="w-5 h-5" />,
 color: "from-orange-500 to-orange-600",
 },
 {
 id: "GPay",
 label: "Google Pay",
 description: "Pay via Google Pay UPI",
 icon: <SiGooglepay className="w-5 h-5" />,
 color: "from-blue-500 to-blue-600",
 },
 {
 id: "PhonePe",
 label: "PhonePe",
 description: "Pay via PhonePe wallet",
 icon: <SiPhonepe className="w-5 h-5" />,
 color: "from-purple-500 to-violet-600",
 },
 {
 id: "Paytm",
 label: "Paytm",
 description: "Pay via Paytm wallet",
 icon: <SiPaytm className="w-5 h-5" />,
 color: "from-sky-500 to-cyan-600",
 },
 {
 id: "Card",
 label: "Credit / Debit Card",
 description: "Visa, Mastercard, RuPay",
 icon: <FiCreditCard className="w-5 h-5" />,
 color: "from-emerald-500 to-teal-600",
 },
];

const PLAN_COLORS = [
 "from-indigo-500 to-violet-600",
 "from-violet-500 to-fuchsia-600",
 "from-fuchsia-500 to-pink-600",
 "from-pink-500 to-rose-600",
 "from-cyan-500 to-blue-600",
 "from-emerald-500 to-teal-600",
 "from-amber-500 to-orange-600",
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
 plans,
 defaultPlanId,
 loading,
 userName,
 onClose,
 onConfirm,
}: PlanPurchaseModalProps) {
 const [selectedPlanId, setSelectedPlanId] = useState<string>(
 defaultPlanId ?? plans[0]?.id ?? ""
 );
 const [selectedMethod, setSelectedMethod] =
 useState<PaymentMethod>("PAY0");
 const [txnRef, setTxnRef] = useState("");
 const [submitting, setSubmitting] = useState(false);
 const [step, setStep] = useState<"select" | "pay">("select");

 const navigate = useNavigate();

 useEffect(() => {
 if (open) {
 setSelectedPlanId(defaultPlanId ?? plans[0]?.id ?? "");
 setSelectedMethod("PAY0");
 setTxnRef("");
 setStep("select");
 }
 }, [open, defaultPlanId, plans]);

 const selectedPlan =
 plans.find((p) => p.id === selectedPlanId) ?? plans[0];

 if (!open || !selectedPlan) return null;

 const handleProceedToPay = () => setStep("pay");
 const handleBack = () => setStep("select");

 const handleGoToPayment = () => {
 const params = new URLSearchParams({
 planId: selectedPlan.id,
 planName: selectedPlan.name,
 multiplier: String(selectedPlan.multiplier),
 price: String(selectedPlan.price),
 currency: selectedPlan.currency,
 duration: String(selectedPlan.durationDays),
 method: selectedMethod,
 txnRef: txnRef.trim(),
 keyName: userName || "",
 });
 onClose();
 navigate(`/user/payment?${params.toString()}`);
 };

 return (
 <AnimatePresence>
 <div
 className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4"
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
 className="relative w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl border border-[var(--dashboard-border)] shadow-2xl dashboard-modal-bg"
 >
 {/* Header */}
 <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-[var(--dashboard-border)]">
 <div className="min-w-0">
 <div className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-mono font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
 <FiZap className="w-3 h-3" />
 Upgrade Plan
 </div>
 <h2 className="text-lg sm:text-xl font-bold text-[var(--dashboard-text)] truncate">
 {step === "select" ? "Choose a Plan" : "Complete Payment"}
 </h2>
 <p className="text-xs text-[var(--dashboard-text-muted)] mt-0.5">
 {step === "select"
 ? "Select a plan and rate multiplier for your API key."
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
 <div className="overflow-y-auto max-h-[calc(92vh-160px)] p-5 sm:p-6">
 {loading ? (
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
 />
 )}
 </div>

 {/* Footer */}
 <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-t border-[var(--dashboard-border)] bg-[var(--dashboard-card)]">
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
 onClick={handleGoToPayment}
 disabled={!selectedPlan || loading}
 type="button"
 className="px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-all cursor-pointer touch-manipulation disabled:opacity-50 inline-flex items-center gap-2"
 >
 Continue with PAY0
 <span className="hidden sm:inline">→</span>
 </button>
 ) : (
 <button
 onClick={handleGoToPayment}
 disabled={!txnRef.trim() || submitting}
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
 Pay via {selectedMethod}
 </>
 )}
 </button>
 )}
 </div>
 </motion.div>
 </div>
 </AnimatePresence>
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
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {plans.map((plan, index) => {
 const isSelected = selectedId === plan.id;
 const color = plan.color ?? PLAN_COLORS[index % PLAN_COLORS.length];

 return (
 <button
 key={plan.id}
 type="button"
 onClick={() => onSelect(plan.id)}
 className={`group relative text-left rounded-2xl border-2 overflow-hidden transition-all cursor-pointer ${
 isSelected
 ? "border-indigo-500 shadow-lg shadow-indigo-500/20 scale-[1.01]"
 : "border-[var(--dashboard-border)] hover:border-[var(--dashboard-text-muted)]/40"
 }`}
 >
 {/* Header strip */}
 <div
 className={`relative p-4 bg-gradient-to-br ${color} overflow-hidden`}
 >
 <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-bl-full" />
 <div className="flex items-start justify-between relative z-10">
 <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
 {getPlanIcon(index)}
 </div>
 <div className="flex items-center gap-1.5">
 {plan.multiplier !== 1 && (
 <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/25 text-white">
 {plan.multiplier}x
 </span>
 )}
 {plan.isPopular && (
 <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/90 text-amber-950 uppercase">
 Popular
 </span>
 )}
 {plan.isTokenPricing && (
 <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/25 text-amber-100 uppercase">
 Token
 </span>
 )}
 </div>
 </div>
 <h3 className="mt-3 text-base font-bold text-white truncate">
 {plan.name}
 </h3>
 {plan.description && (
 <p className="text-white/80 text-[11px] mt-0.5 line-clamp-1">
 {plan.description}
 </p>
 )}
 </div>

 {/* Body */}
 <div className="p-4 bg-[var(--dashboard-card)]">
 <div className="flex items-end justify-between mb-3">
 <div>
 {plan.isTokenPricing && plan.minCredits && plan.minCredits > 0 ? (
 <>
 <span className="text-xl font-bold text-[var(--dashboard-text)]">
 {formatCurrency(plan.minCredits, plan.currency)}
 </span>
 <span className="text-[11px] text-[var(--dashboard-text-muted)] ml-1">
 min credit purchase
 </span>
 </>
 ) : (
 <>
 <span className="text-xl font-bold text-[var(--dashboard-text)]">
 {formatCurrency(plan.price, plan.currency)}
 </span>
 <span className="text-[11px] text-[var(--dashboard-text-muted)] ml-1">
 / {getDurationLabel(plan.durationDays)}
 </span>
 </>
 )}
 </div>
 <div
 className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
 isSelected
 ? "border-indigo-500 bg-indigo-500"
 : "border-[var(--dashboard-border)]"
 }`}
 >
 {isSelected && <FiCheck className="w-3 h-3 text-white" />}
 </div>
 </div>

 {/* Token pricing badge */}
 {plan.isTokenPricing && (
 <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 mb-3">
 <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1.5">
 Per-Token Pricing
 </p>
 <div className="space-y-1">
 {plan.pricePer1mInput && plan.pricePer1mInput > 0 && (
 <div className="flex justify-between text-[11px]">
 <span className="text-[var(--dashboard-text-secondary)]">Input tokens</span>
 <span className="text-[var(--dashboard-text)] font-mono">
 {plan.currency} {plan.pricePer1mInput.toFixed(4)}/1M
 </span>
 </div>
 )}
 {plan.pricePer1mOutput && plan.pricePer1mOutput > 0 && (
 <div className="flex justify-between text-[11px]">
 <span className="text-[var(--dashboard-text-secondary)]">Output tokens</span>
 <span className="text-[var(--dashboard-text)] font-mono">
 {plan.currency} {plan.pricePer1mOutput.toFixed(4)}/1M
 </span>
 </div>
 )}
 </div>
 <p className="text-[9px] text-[var(--dashboard-text-muted)] mt-1">
 You are charged only for tokens you use
 </p>
 </div>
 )}

 {plan.features && plan.features.length > 0 && (
 <ul className="space-y-1.5">
 {plan.features.slice(0, 3).map((f, i) => (
 <li
 key={i}
 className="flex items-start gap-1.5 text-[11px] text-[var(--dashboard-text-secondary)]"
 >
 <FiCheck className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
 <span className="line-clamp-1">{f}</span>
 </li>
 ))}
 {plan.features.length > 3 && (
 <li className="text-[10px] text-[var(--dashboard-text-muted)] pl-4">
 +{plan.features.length - 3} more
 </li>
 )}
 </ul>
 )}
 </div>
 </button>
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
}: {
 plan: PlanOption;
 method: PaymentMethod;
 onMethodChange: (m: PaymentMethod) => void;
 txnRef: string;
 onTxnRefChange: (v: string) => void;
}) {
 return (
 <div className="space-y-5">
 {/* Order summary */}
 <div className="p-4 rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-input-bg)]">
 <div className="flex items-center justify-between mb-2">
 <span className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider">
 Order Summary
 </span>
 {plan.multiplier !== 1 && (
 <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
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

 {/* Payment method */}
 <div>
 <label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-2 uppercase tracking-wider">
 Payment Method <span className="text-red-500 normal-case">*</span>
 </label>

 {/* PAY0 integrated banner */}
 <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10 border border-indigo-500/20">
 <div className="flex items-center gap-2">
 <FiZap className="w-4 h-4 text-indigo-500 shrink-0" />
 <p className="text-[11px] text-[var(--dashboard-text-secondary)] leading-relaxed">
 <strong className="text-[var(--dashboard-text)]">
 PAY0
 </strong>{" "}
 aggregates every Indian payment method into a single secure
 checkout — recommended for fastest confirmation.
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {PAYMENT_METHODS.map((m) => {
 const isSelected = method === m.id;
 return (
 <button
 key={m.id}
 type="button"
 onClick={() => onMethodChange(m.id)}
 className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
 isSelected
 ? "border-indigo-500 bg-indigo-500/5"
 : "border-[var(--dashboard-border)] hover:border-[var(--dashboard-text-muted)]/40"
 }`}
 >
 {m.recommended && (
 <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-md bg-indigo-500 text-[8px] font-bold text-white uppercase tracking-wider">
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
 ? "border-indigo-500 bg-indigo-500"
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

 {/* Transaction reference */}
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
 method === "PAY0"
 ? "e.g. PAY0-REF-XXXXXXXX (auto-filled after payment)"
 : method === "UPI" ||
 method === "GPay" ||
 method === "PhonePe" ||
 method === "Paytm"
 ? "e.g. 123456789012 (12-digit UTR)"
 : "e.g. Transaction ID from payment receipt"
 }
 className="dashboard-input w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
 />

 <div className="mt-2 flex items-start gap-1.5 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
 <FiLock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
 <p className="text-[10px] text-[var(--dashboard-text-secondary)] leading-relaxed">
 {method === "PAY0" ? (
 <>
 Complete the payment of{" "}
 <strong className="text-[var(--dashboard-text)]">
 {formatCurrency(plan.price, plan.currency)}
 </strong>{" "}
 on the secure PAY0 gateway. The transaction reference will be
 auto-detected and verified.
 </>
 ) : (
 <>
 Complete the payment of{" "}
 <strong className="text-[var(--dashboard-text)]">
 {formatCurrency(plan.price, plan.currency)}
 </strong>{" "}
 to the account details shared by support, then paste the
 transaction reference here for verification.
 </>
 )}
 </p>
 </div>
 </div>
 </div>
 );
}
