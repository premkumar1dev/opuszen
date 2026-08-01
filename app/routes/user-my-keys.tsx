import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, data } from "react-router";
import { type MetaFunction, type ActionFunctionArgs } from "react-router";

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
import { ContactAdminModal } from "~/components/ui/contact-admin-modal";

export const meta: MetaFunction = () => [
	{ title: "My Keys | OpusZen" },
	{ name: "description", content: "Manage your OpusZen API keys." },
];


interface ApiKey {
	id: string;
	name: string;
	api_key: string;
	plan_name: string;
	status: string;
	total_requests: number;
	tokens_used: number;
	tokens_limit: number;
	created_at: string;
	last_used: string;
	expires_at: string;
	rate_limit: number;
	allocated_credits: number;
	remaining_credits: number;
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

/** CSPRNG key generation — works in both browser and Node (18+) */
async function generateSecureClientKey(prefix: string, length: number): Promise<string> {
	const bytes = new Uint8Array(Math.ceil(length / 2));
	if (typeof crypto !== "undefined" && crypto.getRandomValues) {
		crypto.getRandomValues(bytes);
	} else {
		for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
	}
	return prefix + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, length);
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

function maskKey(key: string): string {
	if (key.length <= 6) return "****";
	const visible = Math.max(4, Math.ceil(key.length * 0.3));
	return `${key.slice(0, visible)}****`;
}

export default function UserMyKeysRoute() {
	const { theme, toggleTheme } = useDashboardTheme();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const [user, setUser] = useState<any>(null);

	const handleLogout = async () => {
		try {
			await supabase.auth.signOut();
			navigate("/auth/login");
		} catch (err) {
			console.error("Logout failed:", err);
		}
	};
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
	const [showContactAdminModal, setShowContactAdminModal] = useState(false);
	const [contactAdminPlan, setContactAdminPlan] = useState<PlanOption | null>(null);
	const [gatewayOrderId, setGatewayOrderId] = useState<string>("");
	const [initiatedKeyName, setInitiatedKeyName] = useState<string>("");
	const pendingOrderIdRef = useRef<string | null>(null);
	// Stores the DB UUID of the pending order so finalizePaidOrder can target it precisely
	const pendingOrderDbIdRef = useRef<string | null>(null);

	// Refs for values read inside the verification interval (avoids stale closures)
	const searchParamsRef = useRef(searchParams);
	searchParamsRef.current = searchParams;
	const setSearchParamsRef = useRef(setSearchParams);
	setSearchParamsRef.current = setSearchParams;
	const userRef = useRef<any>(null);
	userRef.current = user;

	// Guard to prevent double-finalization of the same payment
	const finalizedRef = useRef<Set<string>>(new Set());

	const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "success" | "failed">("idle");
	const [verificationMessage, setVerificationMessage] = useState("");

	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => {
			setUser(data.user);
		});
		fetchPlans();
		fetchGatewaySettings();
	}, []);

	useEffect(() => {
		if (user?.id) {
			fetchKeys();
		}
	}, [user?.id]);

	useEffect(() => {
		const paymentParam = searchParams.get("payment");
		const orderId = searchParams.get("orderId");
		const gatewayOrderId = searchParams.get("gatewayOrderId");

		if (paymentParam === "verify" && orderId) {
			const orderKey = gatewayOrderId || orderId;
			if (finalizedRef.current.has(orderKey)) {
				return;
			}

			const priceVal = parseFloat(searchParams.get("price") || "0");
			if (priceVal === 0) {
				// Instant activation for ₹0 / Free Trial plan
				finalizedRef.current.add(orderKey);
				setVerificationStatus("success");
				setVerificationMessage("Activating your trial plan & generating API key...");

				const sp2 = searchParamsRef.current;
				const planId = sp2.get("planId") || "";
				const planName = sp2.get("planName") || "Trial Plan";
				const duration = parseInt(sp2.get("duration") || "7");
				const multiplier = parseFloat(sp2.get("multiplier") || "1");
				const keyName = sp2.get("keyName") || "Trial Key";
				const tokenPricing = sp2.get("tokenPricing") === "1";
				const pricePer1mInput = parseFloat(sp2.get("pricePer1mInput") || "0");
				const pricePer1mOutput = parseFloat(sp2.get("pricePer1mOutput") || "0");
				const minCredits = parseFloat(sp2.get("minCredits") || "0");
				const method = sp2.get("method") || "FREE";

				const storedGatewayOrderId = sessionStorage.getItem(`gateway_order_${orderId}`) || gatewayOrderId || `ORD-FREE-${Date.now()}`;
				const currentUserId = userRef.current?.id;

				finalizePaidOrderWithFallback({
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
					txnRef: "FREE_TRIAL",
					keyName: keyName,
					utr: "FREE_TRIAL",
					date: new Date().toISOString(),
					amount: "0",
					userId: currentUserId || "",
				}).then(async (keyCreated) => {
					if (keyCreated) {
						await fetchKeys();
						setTimeout(() => {
							setVerificationStatus("idle");
							setSearchParamsRef.current({});
						}, 2500);
					} else {
						setVerificationStatus("failed");
						setVerificationMessage("Failed to generate API key. Please try again.");
						setTimeout(() => {
							setVerificationStatus("idle");
							setSearchParamsRef.current({});
						}, 5000);
					}
				});
				return;
			}

			setVerificationStatus("verifying");
			setVerificationMessage("Verifying your payment with the gateway. Please wait...");

			let pollCount = 0;
			const maxPolls = 120;

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

					const currentUserId = userRef.current?.id;

					formData.set("order_id", storedGatewayOrderId);

					const res = await fetch("/api/payment", {
						method: "POST",
						body: formData,
					});

					if (!res.ok) {
						clearInterval(interval);
						setVerificationStatus("failed");
						setVerificationMessage("Payment gateway returned an error (HTTP " + res.status + "). Please contact support with your Order ID: " + oid);
						if (oid) sessionStorage.removeItem(`gateway_order_${oid}`);
						setTimeout(() => setSearchParamsRef.current({}), 5000);
						return;
					}

					const result = await res.json();

					if (result.status === false) {
						clearInterval(interval);
						setVerificationStatus("failed");
						setVerificationMessage(result.message || "Payment gateway rejected the request. Please contact support.");
						if (oid) sessionStorage.removeItem(`gateway_order_${oid}`);
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

						const keyCreated = await finalizePaidOrderWithFallback({
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
							userId: currentUserId || "",
						});

						if (oid) sessionStorage.removeItem(`gateway_order_${oid}`);

						if (keyCreated) {
							// Refresh keys list to show the newly created key
							await fetchKeys();
							setTimeout(() => {
								setVerificationStatus("idle");
								setSearchParamsRef.current({});
							}, 3000);
						} else {
							// Payment succeeded but key generation failed
							clearInterval(interval);
							setVerificationStatus("failed");
							setVerificationMessage("Payment verified but key generation failed. Please contact support with your Order ID: " + (oid || orderId));
							if (oid) sessionStorage.removeItem(`gateway_order_${oid}`);
							setTimeout(() => {
								setVerificationStatus("idle");
								setSearchParamsRef.current({});
							}, 8000);
						}

					} else if (txnStatus === "FAILED" || gwStatus === "FAILED") {
						clearInterval(interval);
						setVerificationStatus("failed");
						setVerificationMessage("Verification returned FAILED status. Please try again or contact support.");
						if (oid) sessionStorage.removeItem(`gateway_order_${oid}`);
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
			const { data, error } = await supabase.from("user_api_keys").select("*").eq("user_id", user?.id).order("created_at", { ascending: false });
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
		// Use state user first (avoids redundant getSession call); fall back only if needed
		let userId = user?.id;
		if (!userId) {
			const { data: sessionData } = await supabase.auth.getSession();
			userId = sessionData.session?.user?.id;
		}
		if (!userId) throw new Error("You must be logged in to purchase a plan");

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

		// Store DB ID so finalizePaidOrder targets the correct record
		// Persist to sessionStorage as a fallback if the component re-mounts
		pendingOrderDbIdRef.current = orderRow.id;
		sessionStorage.setItem("pending_order_db_id", orderRow.id);
		return orderRow;
	}

	/* Process a successful payment return - finalize the API key */
	/* Returns true if a new key was created, false otherwise. */
	async function finalizePaidOrder(successData: {
		orderId: string;
		plan: PlanInfo;
		paymentMethod: string;
		txnRef: string;
		keyName: string;
		utr: string;
		date: string;
		amount: string;
		userId: string;
	}): Promise<boolean> {
		const fullKey = await generateSecureClientKey("sk_live_", 18);
		let userId = successData.userId || userRef.current?.id;
		if (!userId) {
			const { data: sessionData } = await supabase.auth.getSession();
			userId = sessionData.session?.user?.id;
		}

		if (!userId) {
			console.error("[finalizePaidOrder] No user ID provided — cannot create API key.");
			return false;
		}

		// ── Resolve the order: prefer the in-memory ref, fall back to sessionStorage ──
		let orderDbId = pendingOrderDbIdRef.current;
		if (!orderDbId) {
			// Component may have re-mounted — try to recover from sessionStorage
			const storedOrderId = sessionStorage.getItem("pending_order_db_id");
			if (storedOrderId) {
				orderDbId = storedOrderId;
				pendingOrderDbIdRef.current = orderDbId;
			}
		}
		if (!orderDbId) {
			console.warn("[finalizePaidOrder] No pending order ID found in ref or sessionStorage. Proceeding with key generation...");
		}

		// ── Check if already finalized (idempotency) ──
		if (orderDbId) {
			const { data: existingOrder } = await supabase
				.from("orders")
				.select("status")
				.eq("id", orderDbId)
				.single();

			if (existingOrder?.status === "completed") {
				console.log("[finalizePaidOrder] Order", orderDbId, "already completed — skipping key generation.");
				pendingOrderDbIdRef.current = null;
				sessionStorage.removeItem("pending_order_db_id");
				await fetchKeys();
				return true;
			}

			// ── Mark order as completed ──
			const { error: orderError } = await supabase
				.from("orders")
				.update({
					status: "completed",
					payment_ref: successData.utr || successData.txnRef || null,
					notes: `Order ${successData.orderId} — confirmed${
						successData.utr ? ` (UTR ${successData.utr})` : ""
					}`,
				})
				.eq("id", orderDbId)
				.eq("status", "pending");

			if (orderError) {
				console.warn("[finalizePaidOrder] Note on order update:", orderError.message);
			}
			pendingOrderDbIdRef.current = null;
			sessionStorage.removeItem("pending_order_db_id");
		}

		// ── Insert the new API key into user_api_keys ──
		const plan = successData.plan;
		const { error: keyError } = await supabase.from("user_api_keys").insert({
			user_id: userId,
			api_key: fullKey,
			name: successData.keyName || "Default Key",
			status: "active",
			allocated_credits: plan.isTokenPricing ? (plan.minCredits || 0) : 0,
			used_credits: 0,
			remaining_credits: plan.isTokenPricing ? (plan.minCredits || 0) : 0,
			expiry_date: new Date(
				Date.now() + plan.durationDays * 24 * 60 * 60 * 1000
			).toISOString(),
			rate_limit: plan.multiplier >= 20 ? 240 : plan.multiplier >= 10 ? 120 : plan.multiplier >= 5 ? 60 : 20,
			allowed_models: [],
			allowed_providers: [],
			total_requests: 0,
			success_requests: 0,
			failed_requests: 0,
			plan_name: buildPlanLabelFromMultiplier(plan.multiplier),
			pricing_type: plan.isTokenPricing ? "per_token" : "flat",
			price_per_1m_input_tokens: plan.pricePer1mInput || 0,
			price_per_1m_output_tokens: plan.pricePer1mOutput || 0,
			tokens_limit: plan.multiplier >= 20 ? 50_000_000 : plan.multiplier >= 10 ? 15_000_000 : plan.multiplier >= 5 ? 5_000_000 : 1_000_000,
		});

		if (keyError) {
			console.error("[finalizePaidOrder] Failed to insert API key:", keyError);
			return false;
		}

		// Verify the key was actually written
		const verify = await supabase.from("user_api_keys").select("id").eq("api_key", fullKey).maybeSingle();
		if (verify.error || !verify.data) {
			console.error("[finalizePaidOrder] Key insert verification failed:", verify.error);
			return false;
		}

		const keyId = verify.data.id;
		const allocated = plan.isTokenPricing ? (plan.minCredits || 0) : 0;
		await supabase.from("user_credit_history").insert({
			user_id: userId,
			user_api_key_id: keyId,
			action: "purchased",
			amount: allocated,
			balance_after: allocated,
			description: `Plan purchased: ${buildPlanLabelFromMultiplier(plan.multiplier)}`,
		});

		setCreatedKey(fullKey);
		await fetchKeys();
		return true;
	}

	/* Server-side fallback using service-role (bypasses RLS) */
	async function finalizePaidOrderServer(successData: {
		orderId: string;
		plan: PlanInfo;
		paymentMethod: string;
		txnRef: string;
		keyName: string;
		utr: string;
		date: string;
		amount: string;
		userId: string;
	}): Promise<boolean> {
		const plan = successData.plan;
		const fd = new FormData();
		fd.set("orderId", successData.orderId);
		fd.set("planId", plan.id);
		fd.set("planName", plan.name);
		fd.set("duration", String(plan.durationDays));
		fd.set("multiplier", String(plan.multiplier));
		fd.set("keyName", successData.keyName);
		fd.set("tokenPricing", plan.isTokenPricing ? "1" : "0");
		fd.set("pricePer1mInput", String(plan.pricePer1mInput || 0));
		fd.set("pricePer1mOutput", String(plan.pricePer1mOutput || 0));
		fd.set("minCredits", String(plan.minCredits || 0));
		fd.set("method", successData.paymentMethod);
		fd.set("txnRef", successData.txnRef);
		fd.set("utr", successData.utr);
		fd.set("amount", successData.amount);
		fd.set("userId", successData.userId);

		try {
			const res = await fetch("/api/finalize-key", { method: "POST", body: fd });
			const result = await res.json();
			if (result.success) {
				await fetchKeys();
				return true;
			}
			console.error("[finalizePaidOrderServer] Server returned failure:", result.error);
			return false;
		} catch (err) {
			console.error("[finalizePaidOrderServer] Network error:", err);
			return false;
		}
	}

	/* Tries client-side first (fast path), falls back to server action */
	async function finalizePaidOrderWithFallback(successData: {
		orderId: string;
		plan: PlanInfo;
		paymentMethod: string;
		txnRef: string;
		keyName: string;
		utr: string;
		date: string;
		amount: string;
		userId: string;
	}): Promise<boolean> {
		const clientResult = await finalizePaidOrder(successData);
		if (clientResult) return true;
		console.warn("[finalizePaidOrderWithFallback] Client-side insert failed, falling back to server action");
		return await finalizePaidOrderServer(successData);
	}

	// Payment success is handled entirely by the ?payment=verify polling effect above.
	// This previous ?payment=success handler (which read from sessionStorage key
	// "payment_last_success") was dead code — that key is never written.

	async function deleteKey(id: string) {
		try { await supabase.from("user_api_keys").delete().eq("id", id); setKeys((k) => k.filter((k) => k.id !== id)); } catch { }
	}
	function toggleActive(id: string, cur: boolean) {
		const prev = keys;
		const next = !cur;
		setKeys((k) => k.map((k) => (k.id === id ? { ...k, status: next ? "active" : "disabled" } : k)));
		supabase.from("user_api_keys").update({ status: next ? "active" : "disabled" }).eq("id", id)
			.then(({ error }) => {
				if (error) {
					setKeys(prev);
					alert("Failed to update key status. Please try again.");
				}
			});
	}
	const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };

	const activeCount = keys.filter((k) => k.status === "active").length;
	const totalReqs = keys.reduce((s, k) => s + (k.total_requests || 0), 0);
	const expiringSoon = keys.filter((k) => { if (!k.expires_at) return false; const d = ((new Date(k.expires_at).getTime() - Date.now()) / 864e5); return d < 30 && d > 0; }).length;

	return (
		<div className="dashboard flex min-h-screen">
			{sidebarOpen && <div className="fixed inset-0 z-[55] dashboard-overlay backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />}
			<div className={`fixed top-0 left-0 z-[60] h-full md:hidden transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
				<DashboardSidebar collapsed={false} onToggle={() => setSidebarOpen(false)} userEmail={user?.email} theme={theme} onThemeToggle={toggleTheme} onLogout={handleLogout} />
			</div>
			<div className="hidden md:block">
				<DashboardSidebar collapsed={false} onToggle={() => { }} userEmail={user?.email} theme={theme} onThemeToggle={toggleTheme} onLogout={handleLogout} />
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
							<button onClick={() => setShowPlanModal(true)} className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
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
							<p className="text-xl sm:text-2xl font-bold text-primary mt-1">{totalReqs.toLocaleString()}</p>
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
							const isActive = key.status === "active";
							const maskedKey = maskKey(key.api_key);
							const displayKey = isRevealed ? key.api_key : maskedKey;
							const usagePct = Math.min(100, ((key.tokens_used || 0) / (key.tokens_limit || 1)) * 100);
							const daysLeft = key.expires_at ? Math.max(0, (new Date(key.expires_at).getTime() - Date.now()) / 864e5) : Infinity;
							return (
								<div key={key.id} className="dashboard-card p-4 sm:p-5 rounded-2xl dashboard-card-hover transition-all">
									<div className="flex items-start justify-between gap-4">
										<div className="flex items-start gap-3 min-w-0 flex-1">
											<span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isActive ? "bg-emerald-500" : "bg-[var(--dashboard-text-muted)]"}`} />
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2 flex-wrap">
													<h3 className="text-sm font-semibold text-[var(--dashboard-text)] truncate">{key.name}</h3>
													<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${isActive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-[var(--dashboard-nav-hover)] text-[var(--dashboard-text-muted)] border-[var(--dashboard-border)]"}`}>
														{isActive ? "Active" : "Inactive"}
													</span>
												</div>
												<div className="flex flex-wrap items-center gap-2 mt-1.5">
													<code className="text-[11px] font-mono text-[var(--dashboard-text-muted)] bg-[var(--dashboard-input-bg)] px-2 py-0.5 rounded">{displayKey}</code>
													<button onClick={() => setRevealed((s) => { const n = new Set(s); n.has(key.id) ? n.delete(key.id) : n.add(key.id); return n; })} className="text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] transition-colors p-0.5" aria-label={isRevealed ? "Hide" : "Reveal"}>{isRevealed ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}</button>
													<button onClick={() => copy(key.api_key, key.id)} className="text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] transition-colors p-0.5" aria-label="Copy"><FiCopy className="w-3.5 h-3.5" /></button>
													{copiedId === key.id && <span className="text-[10px] text-emerald-500 font-medium">Copied!</span>}
												</div>
											</div>
										</div>
										<div className="flex items-center gap-0.5 shrink-0">
											<button onClick={() => toggleActive(key.id, isActive)} className={`p-2 rounded-lg transition-all cursor-pointer touch-manipulation ${isActive ? "text-[var(--dashboard-text-muted)] hover:text-amber-500 hover:bg-amber-500/5" : "text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/5"}`} title={isActive ? "Deactivate" : "Activate"}><FiShield className="w-4 h-4" /></button>
											<button onClick={() => deleteKey(key.id)} className="p-2 rounded-lg text-[var(--dashboard-text-muted)] hover:text-red-500 hover:bg-red-500/5 transition-all cursor-pointer touch-manipulation" title="Delete"><FiTrash2 className="w-4 h-4" /></button>
										</div>
									</div>
									<div className="mt-4">
										<div className="flex items-center justify-between mb-1.5">
											<span className="text-[11px] text-[var(--dashboard-text-muted)]">Token Usage</span>
											<span className="text-[11px] font-mono text-[var(--dashboard-text-secondary)]">{(key.tokens_used || 0).toLocaleString()} / {(key.tokens_limit || 0).toLocaleString()}</span>
										</div>
										<div className="w-full bg-[var(--dashboard-input-bg)] rounded-full h-1.5 sm:h-2 overflow-hidden">
											<div className={`h-full rounded-full transition-all ${usagePct > 80 ? "bg-rose-500" : usagePct > 50 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${usagePct}%` }} />
										</div>
									</div>
									<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--dashboard-text-muted)]">
										<span className="flex items-center gap-1"><FiActivity className="w-3 h-3" />{(key.total_requests || 0).toLocaleString()} req</span>
										<span className="flex items-center gap-1"><FiClock className="w-3 h-3" />{daysLeft < 30 && daysLeft > 0 ? `${Math.ceil(daysLeft)}d left` : daysLeft <= 0 ? "Expired" : "No expiry"}</span>
										<span className="flex items-center gap-1"><FiShield className="w-3 h-3" />{key.rate_limit}/min</span>
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
				onClose={() => setShowPlanModal(false)}
				onConfirm={handlePlanPurchase}
				onPaymentInitiated={(orderId, gOrderId, plan, kName) => {
					setContactAdminPlan(plan);
					setGatewayOrderId(gOrderId);
					setInitiatedKeyName(kName);
					setShowContactAdminModal(true);
				}}
			/>

			{/* ─── Contact Admin Popup Modal ─── */}
			<ContactAdminModal
				open={showContactAdminModal}
				onClose={() => setShowContactAdminModal(false)}
				plan={contactAdminPlan}
				gatewayOrderId={gatewayOrderId}
				keyName={initiatedKeyName}
			/>

			{/* ─── Payment Verification Overlay Modal ─── */}
			{verificationStatus !== "idle" && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" role="dialog" aria-modal="true">
					<div className="dashboard-modal-bg dashboard-card relative w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[var(--dashboard-border)] text-center">
						<div className="flex flex-col items-center justify-center space-y-4">
							{verificationStatus === "verifying" && (
								<>
									<FiRefreshCw className="w-12 h-12 text-primary animate-spin" />
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
