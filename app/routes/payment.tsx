import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData } from "react-router";
import { supabase } from "~/utils/supabase";
import {
	FiLoader,
	FiCheck,
	FiX,
	FiArrowLeft,
	FiShield,
	FiAlertCircle,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import {
	paymentSDK,
	getPaymentUrl,
	buildUserToken,
	extractMobile,
	type CreateOrderResponse,
	type CheckOrderResponse,
} from "~/utils/payment-sdk.client";

export const meta: MetaFunction = () => [
	{ title: "Payment | OpusZen" },
];

/* ─── Loader ─────────────────────────────────────────────── */

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	return {
		planId: url.searchParams.get("planId") || "",
		planName: url.searchParams.get("planName") || "",
		multiplier: parseFloat(url.searchParams.get("multiplier") || "1"),
		price: parseFloat(url.searchParams.get("price") || "0"),
		currency: url.searchParams.get("currency") || "INR",
		durationDays: parseInt(url.searchParams.get("duration") || "30"),
		paymentMethod: url.searchParams.get("method") || "PAY0",
		txnRef: url.searchParams.get("txnRef") || "",
		keyName: url.searchParams.get("keyName") || "",
		isTokenPricing: url.searchParams.get("tokenPricing") === "1",
		pricePer1mInput: parseFloat(url.searchParams.get("pricePer1mInput") || "0"),
		pricePer1mOutput: parseFloat(url.searchParams.get("pricePer1mOutput") || "0"),
		minCredits: parseFloat(url.searchParams.get("minCredits") || "0"),
	};
}

/* ─── Types ─────────────────────────────────────────────── */

interface LoaderData {
	planId: string;
	planName: string;
	multiplier: number;
	price: number;
	currency: string;
	durationDays: number;
	paymentMethod: string;
	txnRef: string;
	keyName: string;
	isTokenPricing: boolean;
	pricePer1mInput: number;
	pricePer1mOutput: number;
	minCredits: number;
}

interface PlanInfo {
	id: string;
	name: string;
	multiplier: number;
	price: number;
	currency: string;
	durationDays: number;
	isTokenPricing: boolean;
	pricePer1mInput: number;
	pricePer1mOutput: number;
	minCredits: number;
}

interface OrderData {
	orderId: string;
	userToken: string;
	[key: string]: string | number | boolean;
}

/* ─── Helpers ───────────────────────────────────────────── */

function formatCurrency(n: number, currency = "INR"): string {
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency,
		minimumFractionDigits: 0,
	}).format(n);
}

function generateOrderId(): string {
	const ts = Date.now().toString(36).toUpperCase();
	const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
	return `ORD-${ts}-${rand}`;
}

function buildLabelFromMultiplier(mult: number): string {
	if (mult <= 1) return "Trial Plan";
	return `Pro Plan (${mult}x)`;
}

const SESSION_KEY_ORDER = "payment_order_data";

/* ─── Component ─────────────────────────────────────────── */

export default function PaymentPage() {
	const navigate = useNavigate();
	const data = useLoaderData<LoaderData>();

	const [orderStatus, setOrderStatus] = useState<{
		status: "loading" | "processing" | "success" | "failed" | "cancelled";
		message: string;
		utr?: string;
		txnDate?: string;
	}>({ status: "loading", message: "Authenticating..." });

	const [iframeUrl, setIframeUrl] = useState<string | null>(null);
	const [pollCount, setPollCount] = useState(0);
	const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
	const [userReady, setUserReady] = useState(false);

	const plan = useMemo<PlanInfo>(() => ({
		id: data.planId || "trial",
		name: data.planName || "Trial Plan",
		multiplier: data.multiplier || 1,
		price: data.price || 0,
		currency: data.currency || "INR",
		durationDays: data.durationDays || 7,
	}), [
		data.planId,
		data.planName,
		data.multiplier,
		data.price,
		data.currency,
		data.durationDays,
	]);

	const paymentMethod = data.paymentMethod || "PAY0";
	const txnRef = data.txnRef || "";
	const keyName = data.keyName || "";

	/* ── Authenticate user and get token ── */
	useEffect(() => {
		let cancelled = false;

		(async () => {
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession();

				if (!session?.user) {
					if (!cancelled) {
						setOrderStatus({
							status: "failed",
							message: "Please log in to continue with payment.",
						});
					}
					return;
				}

				const user = session.user;
				const userToken = buildUserToken(user.id);
				const customerMobile = extractMobile(user as any);

				sessionStorage.setItem("payment_user_token", userToken);
				sessionStorage.setItem("payment_user_mobile", customerMobile);
				sessionStorage.setItem("payment_user_id", user.id);

				if (!cancelled) setUserReady(true);
			} catch (err) {
				if (!cancelled) {
					setOrderStatus({
						status: "failed",
						message: "Authentication failed. Please try again.",
					});
				}
			}
		})();

		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	/* ── Create order via SDK ── */
	useEffect(() => {
		if (!userReady || orderStatus.status !== "loading") return;

		let cancelled = false;

		(async () => {
			try {
				const userToken = sessionStorage.getItem("payment_user_token") || "";
				const customerMobile =
					sessionStorage.getItem("payment_user_mobile") || "0000000000";
				const orderId = generateOrderId();

				setCurrentOrderId(orderId);

				const response: CreateOrderResponse = await paymentSDK.createOrder(
					{
						customer_mobile: customerMobile,
						user_token: userToken,
						amount: String(plan.price),
						order_id: orderId,
						redirect_url: window.location.href,
						remark1: plan.name,
						remark2: buildLabelFromMultiplier(plan.multiplier),
					}
				);

				if (cancelled) return;

				const checkoutUrl = getPaymentUrl(response);

				if (!checkoutUrl) {
					throw new Error(
						response.message || "No payment URL received from gateway"
					);
				}

				setIframeUrl(checkoutUrl);
				setOrderStatus({
					status: "processing",
					message: "Complete your payment in the secure window",
				});

				/* Persist for polling */
				const orderData: OrderData = {
					orderId,
					userToken,
					planId: plan.id,
					planName: plan.name,
					multiplier: plan.multiplier,
					price: plan.price,
					currency: plan.currency,
					durationDays: plan.durationDays,
					paymentMethod,
					txnRef,
					keyName,
				};
				sessionStorage.setItem(SESSION_KEY_ORDER, JSON.stringify(orderData));
			} catch (err: any) {
				if (cancelled) return;
				setOrderStatus({
					status: "failed",
					message: err.message || "Failed to create payment order",
				});
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [userReady, orderStatus.status, plan, paymentMethod, txnRef, keyName]);

	/* ── Poll order status ── */
	useEffect(() => {
		if (orderStatus.status !== "processing") return;

		const raw = sessionStorage.getItem(SESSION_KEY_ORDER);
		if (!raw) return;

		const orderData: OrderData = JSON.parse(raw);

		const interval = setInterval(async () => {
			setPollCount((c) => c + 1);
			try {
				const result = (await paymentSDK.checkOrderStatus({
					user_token: orderData.userToken,
					order_id: orderData.orderId,
				})) as CheckOrderResponse;

				const txnStatus =
					result.result?.txnStatus?.toUpperCase() || "";
				const gwStatus =
					result.result?.status?.toUpperCase() || "";

				if (txnStatus === "SUCCESS" || gwStatus === "SUCCESS") {
					clearInterval(interval);
					setOrderStatus({
						status: "success",
						message: "Payment successful! Creating your key...",
						utr: result.result?.utr,
						txnDate: result.result?.date,
					});

					sessionStorage.setItem(
						"payment_last_success",
						JSON.stringify({
							orderId: orderData.orderId,
							plan: {
								id: orderData.planId,
								name: orderData.planName,
								multiplier: orderData.multiplier,
								price: orderData.price,
								currency: orderData.currency,
								durationDays: orderData.durationDays,
							},
							paymentMethod: orderData.paymentMethod,
							txnRef: orderData.txnRef,
							keyName: orderData.keyName,
							utr: result.result?.utr,
							date: result.result?.date,
							amount: result.result?.amount,
						})
					);

					setTimeout(() => {
						navigate("/user/my-keys?payment=success", {
							replace: true,
						});
					}, 2000);
				} else if (txnStatus === "FAILED" || gwStatus === "FAILED") {
					clearInterval(interval);
					setOrderStatus({
						status: "failed",
						message:
							"Payment failed. Please try again or contact support.",
					});
					setTimeout(() => {
						navigate("/user/my-keys?payment=failed", {
							replace: true,
						});
					}, 3000);
				} else if (txnStatus === "PENDING" || gwStatus === "PENDING") {
					setOrderStatus({
						status: "processing",
						message: "Payment pending. Waiting for confirmation...",
					});
				}
			} catch (err) {
				console.error("[payment] poll error:", err);
			}
		}, 4000);

		return () => clearInterval(interval);
	}, [orderStatus.status, navigate]);

	/* ── Status config ── */
	const statusConfig: Record<
		string,
		{
			icon: any;
			color: string;
			bg: string;
			border: string;
			animate?: boolean;
		}
	> = {
		loading: {
			icon: FiLoader,
			color: "text-indigo-500",
			bg: "bg-indigo-500/10",
			border: "border-indigo-500/20",
			animate: true,
		},
		processing: {
			icon: FiShield,
			color: "text-amber-500",
			bg: "bg-amber-500/10",
			border: "border-amber-500/20",
			animate: true,
		},
		success: {
			icon: FiCheck,
			color: "text-emerald-500",
			bg: "bg-emerald-500/10",
			border: "border-emerald-500/20",
		},
		failed: {
			icon: FiX,
			color: "text-red-500",
			bg: "bg-red-500/10",
			border: "border-red-500/20",
		},
		cancelled: {
			icon: FiAlertCircle,
			color: "text-zinc-500",
			bg: "bg-zinc-500/10",
			border: "border-zinc-500/20",
		},
	};

	const cfg = statusConfig[orderStatus.status] || statusConfig.loading;
	const StatusIcon = cfg.icon;

	return (
		<div className="dashboard flex min-h-screen">
			{/* Back button */}
			<div className="fixed top-4 left-4 z-50">
				<button
					onClick={() => navigate("/user/my-keys")}
					className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] border border-[var(--dashboard-border)] transition-all cursor-pointer"
				>
					<FiArrowLeft className="w-3.5 h-3.5" />
					Back to Keys
				</button>
			</div>

			<main className="flex-1 min-h-screen flex items-center justify-center p-4">
				<div className="w-full max-w-lg">
					{/* Status banner */}
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						className={`p-4 rounded-2xl border mb-4 ${cfg.bg} ${cfg.border}`}
					>
						<div className="flex items-center gap-3">
							<div className={`p-2 rounded-xl ${cfg.bg} ${cfg.color}`}>
								<StatusIcon
									className={`w-5 h-5 ${cfg.animate ? "animate-spin" : ""}`}
								/>
							</div>
							<div>
								<p className={`text-sm font-bold ${cfg.color}`}>
									{orderStatus.status === "loading"
										? "Authenticating..."
										: orderStatus.status === "processing"
											? "Payment In Progress"
											: orderStatus.status === "success"
												? "Payment Successful"
												: orderStatus.status === "failed"
													? "Payment Failed"
													: "Payment Cancelled"}
								</p>
								<p className="text-xs text-[var(--dashboard-text-muted)]">
									{orderStatus.message}
								</p>
							</div>
						</div>
					</motion.div>

					{/* Order summary */}
					<div className="dashboard-card p-5 rounded-2xl border border-[var(--dashboard-border)] mb-4">
						<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider mb-3">
							Order Summary
						</p>
						<div className="space-y-2">
							<div className="flex justify-between text-xs">
								<span className="text-[var(--dashboard-text-muted)]">Plan</span>
								<span className="text-[var(--dashboard-text)] font-medium">
									{plan.name}
								</span>
							</div>
							<div className="flex justify-between text-xs">
								<span className="text-[var(--dashboard-text-muted)]">Multiplier</span>
								<span className="text-indigo-500 font-bold font-mono">
									{plan.multiplier}x
								</span>
							</div>
							<div className="flex justify-between text-xs">
								<span className="text-[var(--dashboard-text-muted)]">Duration</span>
								<span className="text-[var(--dashboard-text)]">
									{plan.durationDays} days
								</span>
							</div>
							<div className="flex justify-between text-xs">
								<span className="text-[var(--dashboard-text-muted)]">Method</span>
								<span className="text-[var(--dashboard-text)]">
									{paymentMethod === "PAY0" ? "PAY0 (All Methods)" : paymentMethod}
								</span>
							</div>
							{txnRef && (
								<div className="flex justify-between text-xs">
									<span className="text-[var(--dashboard-text-muted)]">UTR / Ref</span>
									<span className="text-[var(--dashboard-text)] font-mono truncate max-w-[200px]">
										{txnRef}
									</span>
								</div>
							)}
							{orderStatus.utr && (
								<div className="flex justify-between text-xs">
									<span className="text-[var(--dashboard-text-muted)]">Gateway UTR</span>
									<span className="text-emerald-500 font-mono">
										{orderStatus.utr}
									</span>
								</div>
							)}
							{orderStatus.txnDate && (
								<div className="flex justify-between text-xs">
									<span className="text-[var(--dashboard-text-muted)]">Transaction Date</span>
									<span className="text-[var(--dashboard-text)]">
										{orderStatus.txnDate}
									</span>
								</div>
							)}
							<div className="pt-2 mt-2 border-t border-[var(--dashboard-border)] flex justify-between text-sm">
								<span className="font-semibold text-[var(--dashboard-text)]">Amount</span>
								<span className="font-bold text-[var(--dashboard-text)] font-mono">
									{formatCurrency(plan.price, plan.currency)}
								</span>
							</div>
						</div>
					</div>

					{/* Payment iframe */}
					<AnimatePresence>
						{iframeUrl && orderStatus.status === "processing" && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								className="rounded-2xl border border-[var(--dashboard-border)] overflow-hidden bg-[var(--dashboard-card)]"
							>
								<div className="flex items-center justify-between p-3 border-b border-[var(--dashboard-border)] bg-[var(--dashboard-input-bg)]">
									<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider">
										Secure Payment Gateway — PAY0
									</p>
									<span className="flex items-center gap-1 text-[10px] text-emerald-500">
										<FiShield className="w-3 h-3" />
										Encrypted
									</span>
								</div>
								<iframe
									src={iframeUrl}
									title="PAY0 Payment Gateway"
									className="w-full h-[420px] border-0"
									allow="payment *"
									sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
								/>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Polling indicator */}
					{orderStatus.status === "processing" && (
						<div className="text-center mt-4">
							<p className="text-[11px] text-[var(--dashboard-text-muted)]">
								Waiting for payment confirmation...
								<span className="ml-1 text-indigo-500">
									(poll #{pollCount})
								</span>
							</p>
						</div>
					)}

					{/* Action buttons */}
					{orderStatus.status === "success" && (
						<div className="space-y-2 mt-4">
							<button
								onClick={() =>
									navigate("/user/my-keys", {
										replace: true,
									})
								}
								className="w-full py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-all cursor-pointer"
							>
								Go to My Keys
							</button>
						</div>
					)}

					{(orderStatus.status === "failed" ||
						orderStatus.status === "cancelled") && (
						<div className="space-y-2 mt-4">
							<button
								onClick={() =>
									navigate("/user/my-keys", {
										replace: true,
									})
								}
								className="w-full py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-all cursor-pointer"
							>
								Try Again
							</button>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
