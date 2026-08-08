import { useState, useEffect } from "react";
import { type MetaFunction, type LoaderFunctionArgs, useLoaderData, useSearchParams, redirect } from "react-router";
import { Layout } from "../components/Layout";
import { supabase } from "~/utils/supabase";
import { Check, Zap, IndianRupee, MessageCircle } from "lucide-react";
import {
	GooglePayIcon,
	PhonePeIcon,
	PaytmIcon,
	WhatsAppIcon,
	CreditCardIcon,
} from "~/components/ui/brand-icons";
import { PlanPurchaseModal, type PlanOption } from "~/components/ui/plan-purchase-modal";
import { ContactAdminModal, getContactAdminWhatsAppUrl } from "~/components/ui/contact-admin-modal";
import { PlanPurchaseOptionModal } from "~/components/ui/plan-purchase-option-modal";
import { PhoneRequiredModal } from "~/components/ui/phone-required-modal";
import { extractMobile } from "~/utils/payment-sdk";

const ADMIN_WHATSAPP_NUMBER = "918098830937";

export const meta: MetaFunction = () => [
	{ title: "Pricing | OpusZen" },
	{
		name: "description",
		content: "OpusZen API plans — transparent pricing with no hidden fees. Rent a plan and get your API key in seconds.",
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	const srv = await import("~/utils/supabase.server");

	const { data, error } = await srv.supabaseServer
		.from("plans")
		.select("*")
		.eq("is_active", true)
		.order("sort_order", { ascending: true });

	if (error) {
		console.error("Failed to fetch plans:", error);
	}

	const plans: PlanOption[] = (data || []).map((p: any) => ({
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

	return { plans };
}

function formatPrice(price: number, currency: string): string {
	if (currency === "INR") {
		return `₹${price.toLocaleString("en-IN")}`;
	}
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency || "USD",
		minimumFractionDigits: 0,
	}).format(price);
}

function getDurationLabel(days: number): string {
	if (days === 1) return "1 day";
	if (days === 7) return "1 week";
	if (days === 30) return "month";
	if (days === 365) return "year";
	return `${days} days`;
}

export function getWhatsAppPlanUrl(plan: PlanOption): string {
	const priceStr = plan.priceUsdt ? `$${plan.priceUsdt} USDT` : formatPrice(plan.price, plan.currency);
	const durationStr = getDurationLabel(plan.durationDays);

	const lines: string[] = [
		`*OPUSZEN API — PLAN ORDER REQUEST*`,
		``,
		`Hi Admin! I want to subscribe to *${plan.name}*.`,
		``,
		`• *Plan:* ${plan.name}`,
		`• *Price:* ${priceStr} / ${durationStr}`,
		`• *Speed Multiplier:* ${plan.multiplier}x Rate Limit`,
	];

	if (plan.secondaryPriceText) {
		lines.push(`• *Equivalent:* ${plan.secondaryPriceText}`);
	}

	if (plan.features && plan.features.length > 0) {
		lines.push(``, `*Included Features:*`);
		plan.features.forEach((feat) => {
			lines.push(`  ✓ ${feat}`);
		});
	}

	lines.push(
		``,
		`Please assist me with instant key delivery after payment!`,
		`Thank you!`
	);

	const text = lines.join("\n");
	return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export default function PricingPage() {
	const { plans } = useLoaderData() as { plans: PlanOption[] };
	const [searchParams] = useSearchParams();
	const [showPlanModal, setShowPlanModal] = useState(false);
	const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null);
	const [showOptionModal, setShowOptionModal] = useState(false);
	const [showContactAdminModal, setShowContactAdminModal] = useState(false);
	const [contactAdminPlan, setContactAdminPlan] = useState<PlanOption | null>(null);
	const [gatewayOrderId, setGatewayOrderId] = useState<string>("");
	const [keyName, setKeyName] = useState<string>("");
	const [showPhoneModal, setShowPhoneModal] = useState(false);
	const [pendingOnlinePlan, setPendingOnlinePlan] = useState<PlanOption | null>(null);

	// After gateway redirects back to pricing page with payment=verify,
	// immediately show ContactAdminModal with payment details embedded
	useEffect(() => {
		const paymentParam = searchParams.get("payment");
		const gwOrderId = searchParams.get("gatewayOrderId");

		if (paymentParam !== "verify" || !gwOrderId) return;

		// Small delay so the pricing page renders first
		const timer = setTimeout(() => {
			const planId = searchParams.get("planId") || "";
			const planName = searchParams.get("planName") || "Plan";
			const multiplier = parseFloat(searchParams.get("multiplier") || "1");
			const price = parseFloat(searchParams.get("price") || "0");
			const currency = searchParams.get("currency") || "INR";
			const duration = parseInt(searchParams.get("duration") || "30");

			const verifiedPlan: PlanOption = {
				id: planId,
				name: planName,
				multiplier,
				price,
				currency,
				durationDays: duration,
			};

			setContactAdminPlan(verifiedPlan);
			setGatewayOrderId(gwOrderId);
			setKeyName("");
			setShowContactAdminModal(true);

			// Clean URL
			window.history.replaceState({}, "", window.location.pathname);
		}, 500);

		return () => clearTimeout(timer);
	}, [searchParams]);

	const handlePlanSelect = (plan: PlanOption) => {
		setSelectedPlan(plan);
		setShowOptionModal(true);
	};

	return (
		<Layout>
			<div className="bg-[var(--color-pricing-bg)] dark:bg-[var(--color-pricing-bg-dark)] text-[var(--color-pricing-text)] dark:text-[var(--color-pricing-text-dark)] min-h-screen py-12 px-4 transition-colors">
				<div className="max-w-6xl mx-auto">
					


					{/* Plans Grid */}
					{plans.length === 0 ? (
						<div className="text-center py-20 bg-[var(--color-pricing-card)] dark:bg-[var(--color-pricing-card-dark)] rounded-3xl border border-[var(--color-pricing-border)]">
							<Zap className="w-12 h-12 text-[#EA580C] mx-auto mb-4" />
							<p className="text-[#78716C] text-lg font-medium">
								No subscription plans available right now. Please check back soon.
							</p>
						</div>
					) : (
						<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 items-stretch">
							{plans.map((plan) => {
								const durationLabel = getDurationLabel(plan.durationDays);
								const isDark = plan.isDarkCard;
								const features = plan.features || [];
								const displayPrice = plan.priceUsdt ? `$${plan.priceUsdt}` : formatPrice(plan.price, plan.currency);
								const currencyLabel = plan.priceUsdt ? "USDT" : plan.currency;

								return (
									<div
										key={plan.id}
										className={`rounded-3xl p-7 relative transition-all duration-200 flex flex-col justify-between ${
											isDark
												? "bg-[#0F0E0D] border-2 border-[#262320] text-[#F5F2EB] shadow-2xl ring-1 ring-orange-500/20"
												: "bg-[#FDFCFB] border border-[#E7E2D8] text-[#1C1917] shadow-sm hover:shadow-md"
										}`}
									>
										<div>
											{/* Badge Pill */}
											{plan.badgeText && (
												<div
													className={`absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[11px] font-extrabold tracking-wider uppercase ${
														isDark
															? "bg-[#EA580C] text-white shadow-sm"
															: "bg-[#FFF4ED] text-[#EA580C] border border-[#FFD9C4]"
													}`}
												>
													{plan.badgeText}
												</div>
											)}

											{/* Plan Name */}
											<h3 className={`text-xl font-extrabold mb-2.5 ${isDark ? "text-white" : "text-[#1C1917]"}`}>
												{plan.name}
											</h3>

											{/* Description */}
											{plan.description && (
												<p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-[#A8A29E]" : "text-[#78716C]"}`}>
													{plan.description}
												</p>
											)}

											{/* Price Block */}
											<div className="mb-2 flex items-baseline gap-1.5 flex-wrap">
												<span className={`text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-[#1C1917]"}`}>
													{displayPrice}
												</span>
												<span className={`text-xs font-semibold uppercase ${isDark ? "text-[#A8A29E]" : "text-[#78716C]"}`}>
													{currencyLabel} / {durationLabel}
												</span>
											</div>

											{/* Secondary Tagline */}
											{plan.secondaryPriceText && (
												<div className={`text-[12px] font-semibold mb-6 ${isDark ? "text-[#8C827A]" : "text-[#8C827A]"}`}>
													{plan.secondaryPriceText}
												</div>
											)}

											{/* CTA Button */}
											<div className="mt-4 mb-2">
												<button
													type="button"
													onClick={() => handlePlanSelect(plan)}
													className={`w-full py-3.5 px-4 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
														isDark
															? "bg-[#EA580C] hover:bg-[#D94E0A] text-white shadow-lg shadow-orange-600/25 active:scale-[0.99]"
															: "bg-[#F4F0E8] hover:bg-[#EBE5DA] text-[#1C1917] border border-[#E2DDD3] active:scale-[0.99]"
													}`}
												>
													<span>{plan.buttonText || "Get this plan →"}</span>
												</button>

												<p className={`text-[11px] text-center mt-2 font-medium ${isDark ? "text-[#78716C]" : "text-[#A8A29E]"}`}>
													{plan.buttonSubtext || "Instant key delivery after payment"}
												</p>
											</div>

											{/* Divider */}
											<hr className={`my-6 border-t ${isDark ? "border-[#262320]" : "border-[#E8E3D9]"}`} />

											{/* Includes Section */}
											<div>
												<p className={`text-[11px] font-black uppercase tracking-widest mb-4 ${isDark ? "text-[#A8A29E]" : "text-[#78716C]"}`}>
													INCLUDES
												</p>
												<ul className="space-y-3">
													{features.map((feature, i) => (
														<li
															key={i}
															className={`flex items-start gap-2.5 text-xs font-medium ${
																isDark ? "text-[#D6D3D1]" : "text-[#44403C]"
															}`}
														>
															<Check className="w-4 h-4 text-[#EA580C] mt-0.5 shrink-0 stroke-[2.5]" />
															<span>{feature}</span>
														</li>
													))}
												</ul>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}

					{/* Footer INR & Admin Contact Info Note */}
					<div className="text-center py-4 px-6 rounded-2xl bg-[#F4EFEC] dark:bg-[#1A1918] border border-[#E8E3D9] dark:border-[#2B2724] max-w-3xl mx-auto">
						<p className="text-xs text-[#78716C] dark:text-[#A8A29E] font-medium flex items-center justify-center gap-1.5 flex-wrap">
							<CreditCardIcon className="w-3.5 h-3.5 shrink-0" /> Paid in INR (UPI / GPay / PhonePe / Cards).
							<span>Pay online directly or</span>
							<a
								href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Admin! I want to subscribe to an OpusZen API plan.")}`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-[#EA580C] hover:underline font-bold inline-flex items-center gap-1"
							>
								<WhatsAppIcon className="w-3.5 h-3.5 shrink-0" /> Contact Admin on WhatsApp
							</a>
							<span>for instant key delivery.</span>
						</p>
					</div>

					{/* Plan Purchase Option Chooser Modal */}
					<PlanPurchaseOptionModal
						open={showOptionModal}
						onClose={() => setShowOptionModal(false)}
						plan={selectedPlan}
						onPayOnline={async (plan) => {
							setShowOptionModal(false);
							setSelectedPlan(plan);

							// Generate order ID
							const ts = Date.now().toString(36).toUpperCase();
							const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
							const gatewayOrderId = `ORD-${ts}-${rand}`;

							// Store gateway order ID mapping
							sessionStorage.setItem(`gateway_order_${gatewayOrderId}`, gatewayOrderId);

							// Get user session for mobile
							const { data: sessionData } = await supabase.auth.getSession();
							const user = sessionData.session?.user;
							const customerMobile = extractMobile(user);

							if (!customerMobile) {
								setPendingOnlinePlan(plan);
								setShowPhoneModal(true);
								return;
							}

							// Gateway redirects back to orders page after payment
							const redirectUrl = `${window.location.origin}/orders?payment=verify&orderId=${encodeURIComponent(gatewayOrderId)}&gatewayOrderId=${encodeURIComponent(gatewayOrderId)}&planId=${plan.id}&planName=${encodeURIComponent(plan.name)}&multiplier=${plan.multiplier}&price=${plan.price}&currency=${plan.currency}&duration=${plan.durationDays}&method=PAY0&tokenPricing=${plan.isTokenPricing ? "1" : "0"}&pricePer1mInput=${plan.pricePer1mInput || 0}&pricePer1mOutput=${plan.pricePer1mOutput || 0}&minCredits=${plan.minCredits || 0}`;

							// Create order in gateway
							const formData = new FormData();
							formData.set("intent", "create_order");
							formData.set("customer_mobile", customerMobile);
							formData.set("amount", String(plan.price));
							formData.set("order_id", gatewayOrderId);
							formData.set("redirect_url", redirectUrl);
							formData.set("remark1", plan.name);
							formData.set("remark2", plan.multiplier > 1 ? `Pro Plan (${plan.multiplier}x)` : "Trial Plan");

							try {
								const res = await fetch("/api/payment", {
									method: "POST",
									body: formData,
								});
								const response = await res.json();

								if (response.status === false) {
									alert(response.message || "Failed to create payment order");
									return;
								}

								const checkoutUrl =
									response.result?.payment_url ||
									response.result?.checkoutUrl ||
									response.result?.paymentUrl ||
									response.result?.payment_link;

								if (!checkoutUrl) {
									alert("No payment URL received from gateway");
									return;
								}

								// Create pending order in DB
								try {
									const { data: sessionData2 } = await supabase.auth.getSession();
									const u = sessionData2.session?.user;
									if (u?.id) {
										const { data: orderRow } = await supabase
											.from("orders")
											.insert({
												user_id: u.id,
												username: u.email ?? "user",
												plan_name: `${plan.name} (${plan.multiplier}x)`,
												amount: plan.price,
												currency: plan.currency,
												status: "pending",
												payment_method: "PAY0",
												payment_ref: gatewayOrderId,
												notes: `Pricing page purchase: ${plan.name}`,
											})
											.select("id")
											.single();

										if (orderRow?.id) {
											sessionStorage.setItem("pending_order_db_id", orderRow.id);
										}
									}
								} catch (e) {
									console.error("Error creating pending order:", e);
								}

								// Open gateway checkout in new tab
								window.open(checkoutUrl, "_blank", "noopener,noreferrer");

								// Show ContactAdminModal with plan info
								setContactAdminPlan(plan);
								setGatewayOrderId(gatewayOrderId);
								setKeyName("");
								setShowContactAdminModal(true);
							} catch (err) {
								console.error("Payment initiation failed:", err);
								alert("Failed to initiate payment. Please try again.");
							}
						}}
						onContactAdmin={(plan) => {
							setSelectedPlan(plan);
							setContactAdminPlan(plan);
							const whatsappUrl = getWhatsAppPlanUrl(plan);
							window.open(whatsappUrl, "_blank", "noopener,noreferrer");
							setShowContactAdminModal(true);
						}}
					/>

					{/* Plan Purchase Modal */}
					<PlanPurchaseModal
						open={showPlanModal}
						onClose={() => setShowPlanModal(false)}
						initialPlan={selectedPlan}
						onConfirm={async (data) => {
							let orderId: string | undefined;

							try {
								const { data: sessionData } = await supabase.auth.getSession();
								const user = sessionData.session?.user;
								if (user?.id) {
									const { data: orderRow } = await supabase
										.from("orders")
										.insert({
											user_id: user.id,
											username: user.email ?? "user",
											plan_name: `${data.plan.name} (${data.plan.multiplier}x)`,
											amount: data.plan.price,
											currency: data.plan.currency,
											status: "pending",
											payment_method: data.paymentMethod,
											payment_ref: data.transactionRef || null,
											notes: `Pricing page purchase: ${data.plan.name}`,
										})
										.select("id")
										.single();

									if (orderRow?.id) {
										orderId = orderRow.id;
										sessionStorage.setItem("pending_order_db_id", orderRow.id);
									}
								}
							} catch (e) {
								console.error("Error creating pending order:", e);
							}

							if (!orderId) {
								orderId = typeof crypto !== "undefined" && crypto.randomUUID
									? crypto.randomUUID()
									: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
							}

							return { id: orderId };
						}}
						onPaymentInitiated={(orderId, gOrderId, plan, kName) => {
							setSelectedPlan(plan);
							setContactAdminPlan(plan);
							setGatewayOrderId(gOrderId);
							setKeyName(kName);
							setShowContactAdminModal(true);
						}}
					/>

					{/* Contact Admin Modal */}
					<ContactAdminModal
						open={showContactAdminModal}
						onClose={() => setShowContactAdminModal(false)}
						plan={contactAdminPlan || selectedPlan}
						gatewayOrderId={gatewayOrderId}
						keyName={keyName}
					/>

					{/* Phone Number Required Modal */}
					<PhoneRequiredModal
						open={showPhoneModal}
						onClose={() => setShowPhoneModal(false)}
						onSuccess={() => {
							setShowPhoneModal(false);
							if (pendingOnlinePlan) {
								setShowOptionModal(true);
							}
						}}
					/>
				</div>
			</div>
		</Layout>
	);
}
