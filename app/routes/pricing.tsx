import { useState } from "react";
import { type MetaFunction, type LoaderFunctionArgs, useLoaderData } from "react-router";
import { Layout } from "../components/Layout";
import { supabase } from "~/utils/supabase";
import {
	FiCheck,
	FiZap,
	FiShield,
	FiActivity,
	FiStar,
	FiArrowRight,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { PlanPurchaseModal, type PlanOption } from "~/components/ui/plan-purchase-modal";

const ADMIN_WHATSAPP_NUMBER = "918098830937";

export const meta: MetaFunction = () => [
	{ title: "Pricing | OpusZen" },
	{
		name: "description",
		content: "OpusZen API plans — transparent pricing with no hidden fees. Rent a plan and get your API key in seconds.",
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	const { data, error } = await supabase
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

function getPlanLabel(plan: PlanOption): string {
	return plan.name || (plan.multiplier <= 1 ? "Trial Plan" : `Pro Plan (${plan.multiplier}x)`);
}

export function getWhatsAppPlanUrl(plan: PlanOption): string {
	const planLabel = getPlanLabel(plan);
	const priceStr = formatPrice(plan.price, plan.currency);
	const durationStr = plan.durationDays === 1 ? "1 day" : `${plan.durationDays} days`;

	const lines: string[] = [
		`*OPUSZEN API — GET STARTED REQUEST*`,
		``,
		`Hi Admin! I am ready to get started with *OpusZen API*.`,
		``,
		`• *Plan Selected:* ${planLabel}`,
		`• *Price:* ${priceStr} / ${durationStr}`,
		`• *Speed Multiplier:* ${plan.multiplier}x Rate Limit`,
	];

	if (plan.isTokenPricing) {
		const priceInput = plan.pricePer1mInput ?? 0;
		const priceOutput = plan.pricePer1mOutput ?? 0;
		const minCredits = plan.minCredits ?? 0;

		if (priceInput > 0) {
			lines.push(`• *Input Token Rate:* ${formatPrice(priceInput, plan.currency)}/1M tokens`);
		}
		if (priceOutput > 0) {
			lines.push(`• *Output Token Rate:* ${formatPrice(priceOutput, plan.currency)}/1M tokens`);
		}
		if (minCredits > 0) {
			lines.push(`• *Minimum Credits:* ${formatPrice(minCredits, plan.currency)}`);
		}
	}

	if (plan.features && plan.features.length > 0) {
		lines.push(``, `*Included Features:*`);
		plan.features.forEach((feat) => {
			lines.push(`  ✓ ${feat}`);
		});
	}

	lines.push(
		``,
		`Please assist me with activating this plan and getting my API Key!`,
		``,
		`Thank you!`
	);

	const text = lines.join("\n");
	return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function getCardStyle(plan: PlanOption): { cardClass: string; badge: React.ReactNode } {
	const isPopular = plan.multiplier >= 5 && plan.multiplier < 20;
	const isEnterprise = plan.multiplier >= 20;

	if (isPopular) {
		return {
			cardClass: "border-primary/30 bg-primary/5 shadow-md",
			badge: (
				<div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1">
					<FiStar className="w-3 h-3" />
					Most Popular
				</div>
			),
		};
	}
	if (isEnterprise) {
		return {
			cardClass: "border-amber-500/30 bg-amber-500/5",
			badge: (
				<div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-white text-xs font-semibold flex items-center gap-1">
					<FiActivity className="w-3 h-3" />
					Enterprise
				</div>
			),
		};
	}
	return { cardClass: "border-border bg-card", badge: null };
}

function getBtnClass(plan: PlanOption): string {
	const isPopular = plan.multiplier >= 5 && plan.multiplier < 20;
	const isEnterprise = plan.multiplier >= 20;

	if (isPopular) return "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20";
	if (isEnterprise) return "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20";
	return "bg-emerald-600/90 text-white hover:bg-emerald-600 border border-emerald-500/30";
}

function TokenPricingInfo({ plan }: { plan: PlanOption }) {
	const parts: string[] = [];
	const priceInput = plan.pricePer1mInput ?? 0;
	const priceOutput = plan.pricePer1mOutput ?? 0;
	const minCredits = plan.minCredits ?? 0;

	if (priceInput > 0) parts.push(`${formatPrice(priceInput, plan.currency)}/1M input tokens`);
	if (priceOutput > 0) parts.push(`${formatPrice(priceOutput, plan.currency)}/1M output tokens`);

	return (
		<>
			{parts.length > 0 && (
				<li className="flex items-start gap-2 text-sm text-muted-foreground pt-1 border-t border-border mt-3">
					<FiZap className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
					<span>{parts.join(" · ")}</span>
				</li>
			)}
			{(priceInput > 0 || priceOutput > 0) && (
				<li className="flex items-start gap-2 text-sm text-muted-foreground">
					<FiShield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
					<span>{minCredits > 0 ? `${formatPrice(minCredits, plan.currency)} min. credit` : "Pay as you go"}</span>
				</li>
			)}
		</>
	);
}

export default function PricingPage() {
	const { plans } = useLoaderData() as { plans: PlanOption[] };
	const [showPlanModal, setShowPlanModal] = useState(false);
	const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null);

	const handlePlanSelect = (plan: PlanOption) => {
		const whatsappUrl = getWhatsAppPlanUrl(plan);
		window.open(whatsappUrl, "_blank", "noopener,noreferrer");
	};

	return (
		<Layout>
			<div className="max-w-6xl mx-auto py-16 px-4">
				{/* Heading */}
				<div className="text-center mb-16">
					<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
						<FiZap className="w-3.5 h-3.5" />
						Simple, Transparent Pricing
					</div>
					<h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
						Rent a Plan
					</h1>
					<p className="text-muted-foreground text-lg max-w-2xl mx-auto">
						Pick a plan that fits your needs. No hidden fees, no surprises. Click Get Started to contact Admin on WhatsApp instantly.
					</p>
				</div>

				{/* Plans Grid */}
				{plans.length === 0 ? (
					<div className="text-center py-20">
						<FiZap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-muted-foreground text-lg">
							No plans available right now. Please check back soon.
						</p>
					</div>
				) : (
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
						{plans.map((plan) => {
							const label = getPlanLabel(plan);
							const { cardClass, badge } = getCardStyle(plan);
							const features = plan.features || [];
							const durationLabel = plan.durationDays === 1 ? "day" : `${plan.durationDays} days`;

							return (
								<div
									key={plan.id}
									className={`rounded-2xl border p-6 relative transition-all hover:shadow-lg flex flex-col justify-between ${cardClass}`}
								>
									<div>
										{badge}

										{/* Plan Header */}
										<div className="mb-4">
											<h3 className="text-lg font-semibold text-foreground mb-1">
												{label}
											</h3>
											{plan.description && (
												<p className="text-sm text-muted-foreground">
													{plan.description}
												</p>
											)}
										</div>

										{/* Price */}
										<div className="mb-6">
											<span className="text-3xl font-bold text-foreground">
												{formatPrice(plan.price, plan.currency)}
											</span>
											<span className="text-sm text-muted-foreground font-normal">
												/ {durationLabel}
											</span>
										</div>

										{/* Features */}
										<ul className="space-y-3 mb-8">
											{features.map((feature, i) => (
												<li
													key={i}
													className="flex items-start gap-2 text-sm text-muted-foreground"
												>
													<FiCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
													{feature}
												</li>
											))}

											{(plan.isTokenPricing || (plan.minCredits ?? 0) > 0) && (
												<TokenPricingInfo plan={plan} />
											)}

											{plan.multiplier > 1 && (
												<li className="flex items-start gap-2 text-sm text-muted-foreground">
													<FiActivity className="w-4 h-4 text-primary mt-0.5 shrink-0" />
													<span>{plan.multiplier}x rate limit multiplier</span>
												</li>
											)}
										</ul>
									</div>

									{/* CTA Buttons */}
									<div>
										<button
											type="button"
											onClick={() => handlePlanSelect(plan)}
											className={`flex items-center justify-center gap-2.5 w-full px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md cursor-pointer ${getBtnClass(plan)}`}
										>
											<FaWhatsapp className="w-4 h-4 text-white shrink-0" />
											<span>Get Started</span>
											<FiArrowRight className="w-4 h-4 ml-auto opacity-80" />
										</button>

										<button
											type="button"
											onClick={() => {
												setSelectedPlan(plan);
												setShowPlanModal(true);
											}}
											className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-2.5 font-medium transition-colors cursor-pointer py-1"
										>
											or Pay Online directly →
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* Footer note */}
				<p className="text-center text-sm text-muted-foreground">
					Need a custom plan?{" "}
					<a
						href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Admin! I need a custom enterprise plan for OpusZen.")}`}
						target="_blank"
						rel="noopener noreferrer"
						className="text-emerald-500 hover:text-emerald-400 font-medium inline-flex items-center gap-1"
					>
						<FaWhatsapp className="w-3.5 h-3.5 inline" /> Contact us on WhatsApp
					</a>{" "}
					for enterprise pricing.
				</p>

				{/* Plan Purchase Modal */}
				<PlanPurchaseModal
					open={showPlanModal}
					onClose={() => setShowPlanModal(false)}
					onConfirm={async (data) => {
						setShowPlanModal(false);
						return data;
					}}
				/>
			</div>
		</Layout>
	);
}

