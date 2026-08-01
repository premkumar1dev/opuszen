import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiZap, FiShield, FiExternalLink, FiCheckCircle, FiClock } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import type { PlanOption } from "./plan-purchase-modal";

const ADMIN_WHATSAPP_NUMBER = "918098830937";

export interface ContactAdminModalProps {
	open: boolean;
	onClose: () => void;
	plan?: PlanOption | null;
	gatewayOrderId?: string;
	keyName?: string;
}

export function getContactAdminWhatsAppUrl(plan?: PlanOption | null, gatewayOrderId?: string, keyName?: string): string {
	if (!plan) {
		return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(
			"Hi Admin! I just initiated payment via Online Gateway for an OpusZen API plan. Please assist me with instant key delivery!"
		)}`;
	}
	const priceStr = plan.priceUsdt ? `$${plan.priceUsdt} USDT` : `₹${plan.price.toLocaleString("en-IN")}`;
	const lines = [
		`*OPUSZEN API — GATEWAY PAYMENT VERIFICATION*`,
		``,
		`Hi Admin! I have paid / initiated payment via Online Gateway for *${plan.name}*.`,
		``,
		`• *Plan:* ${plan.name}`,
		`• *Price:* ${priceStr}`,
		`• *Rate Limit:* ${plan.multiplier}x Speed`,
		keyName ? `• *Key Name:* ${keyName}` : null,
		gatewayOrderId ? `• *Order Reference:* ${gatewayOrderId}` : null,
		``,
		`Please verify my payment and deliver my API key instantly. Thank you!`
	].filter(Boolean) as string[];

	return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function ContactAdminModal({
	open,
	onClose,
	plan,
	gatewayOrderId,
	keyName,
}: ContactAdminModalProps) {
	if (!open) return null;

	const whatsappUrl = getContactAdminWhatsAppUrl(plan, gatewayOrderId, keyName);

	return (
		<AnimatePresence>
			<div
				className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6"
				role="dialog"
				aria-modal="true"
			>
				{/* Background backdrop */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
					className="absolute inset-0 bg-black/75 backdrop-blur-md"
					onClick={onClose}
				/>

				{/* Modal Container */}
				<motion.div
					initial={{ opacity: 0, scale: 0.94, y: 16 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.94, y: 16 }}
					transition={{ duration: 0.25, ease: "easeOut" }}
					className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#262320] bg-[#121110] text-[#F5F2EB] shadow-2xl"
				>
					{/* Decorative background glow */}
					<div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
					<div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

					{/* Header */}
					<div className="flex items-start justify-between gap-4 p-6 border-b border-[#262320]">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
								<FaWhatsapp className="w-5 h-5" />
							</div>
							<div>
								<div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-bold text-[#EA580C] uppercase tracking-wider mb-1">
									<FiZap className="w-3 h-3" /> Gateway Payment
								</div>
								<h2 className="text-lg font-extrabold text-white">
									Contact Admin for Key Delivery
								</h2>
							</div>
						</div>
						<button
							onClick={onClose}
							type="button"
							className="p-2 rounded-xl text-[#A8A29E] hover:text-white hover:bg-[#1F1D1B] transition-colors cursor-pointer"
							aria-label="Close modal"
						>
							<FiX className="w-4 h-4" />
						</button>
					</div>

					{/* Body */}
					<div className="p-6 space-y-5">
						{/* Notice card */}
						<div className="p-4 rounded-2xl bg-[#1A1918] border border-[#2B2724] space-y-2">
							<div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
								<FiCheckCircle className="w-4 h-4 shrink-0" />
								<span>Gateway Payment Window Opened</span>
							</div>
							<p className="text-xs text-[#A8A29E] leading-relaxed">
								After completing your payment on the gateway page, please send a message to Admin on WhatsApp to get your API key delivered and activated immediately!
							</p>
						</div>

						{/* Plan details pill if available */}
						{plan && (
							<div className="p-4 rounded-2xl bg-[#171615] border border-[#292522] flex items-center justify-between gap-4">
								<div>
									<span className="text-[10px] font-bold text-[#78716C] uppercase tracking-wider block mb-0.5">
										Selected Plan
									</span>
									<h4 className="text-sm font-extrabold text-white flex items-center gap-2">
										{plan.name}
										{plan.multiplier > 1 && (
											<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-[#EA580C] border border-orange-500/30">
												{plan.multiplier}x Speed
											</span>
										)}
									</h4>
									{keyName && (
										<p className="text-xs text-[#A8A29E] mt-0.5">
											Key Name: <span className="text-white font-medium">{keyName}</span>
										</p>
									)}
								</div>
								<div className="text-right shrink-0">
									<span className="text-base font-black text-white block">
										{plan.priceUsdt ? `$${plan.priceUsdt}` : `₹${plan.price.toLocaleString("en-IN")}`}
									</span>
									<span className="text-[10px] text-[#78716C]">
										{plan.currency}
									</span>
								</div>
							</div>
						)}

						{/* Direct WhatsApp CTA Button */}
						<div className="space-y-2.5">
							<a
								href={whatsappUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="w-full py-4 px-5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.99] cursor-pointer"
							>
								<FaWhatsapp className="w-5 h-5" />
								<span>Contact Admin on WhatsApp</span>
								<FiExternalLink className="w-4 h-4 ml-auto opacity-80" />
							</a>

							<div className="p-3 rounded-xl bg-[#181716] border border-[#242220] flex items-center justify-between text-xs text-[#A8A29E]">
								<div className="flex items-center gap-2">
									<FiShield className="w-4 h-4 text-[#EA580C]" />
									<span>Admin WhatsApp:</span>
								</div>
								<a
									href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER}`}
									target="_blank"
									rel="noopener noreferrer"
									className="font-mono font-bold text-white hover:text-[#EA580C] transition-colors"
								>
									+91 80988 30937
								</a>
							</div>
						</div>

						{/* Instant delivery note */}
						<div className="flex items-center justify-center gap-1.5 text-[11px] text-[#78716C]">
							<FiClock className="w-3.5 h-3.5 text-orange-500" />
							<span>Instant response & key activation within minutes</span>
						</div>
					</div>

					{/* Footer */}
					<div className="p-4 sm:p-5 border-t border-[#262320] bg-[#0F0E0D] flex items-center justify-end">
						<button
							onClick={onClose}
							type="button"
							className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#2B2724] bg-[#181716] hover:bg-[#22201E] text-xs font-bold text-white transition-all cursor-pointer"
						>
							Close
						</button>
					</div>
				</motion.div>
			</div>
		</AnimatePresence>
	);
}
