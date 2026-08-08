import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, CreditCard, ArrowRight, Shield } from "lucide-react";
import { WhatsAppIcon } from "./brand-icons";
import type { PlanOption } from "./plan-purchase-modal";

export interface PlanPurchaseOptionModalProps {
	open: boolean;
	onClose: () => void;
	plan: PlanOption | null;
	onPayOnline: (plan: PlanOption) => void;
	onContactAdmin: (plan: PlanOption) => void;
}

export function PlanPurchaseOptionModal({
	open,
	onClose,
	plan,
	onPayOnline,
	onContactAdmin,
}: PlanPurchaseOptionModalProps) {
	if (!open || !plan) {
		return null;
	}

	const priceStr = plan.priceUsdt ? `$${plan.priceUsdt} USDT` : `₹${plan.price.toLocaleString("en-IN")}`;

	return createPortal(
		<AnimatePresence>
			<div
				className="fixed inset-0 z-modal flex items-center justify-center p-4 sm:p-6"
				role="dialog"
				aria-modal="true"
			>
				{/* Overlay */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
					className="absolute inset-0 bg-black/80 backdrop-blur-md"
					onClick={onClose}
				/>

				{/* Modal Container */}
				<motion.div
					initial={{ opacity: 0, scale: 0.95, y: 14 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.95, y: 14 }}
					transition={{ duration: 0.25, ease: "easeOut" }}
					className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#262320] bg-[#121110] text-[#F5F2EB] shadow-2xl z-10"
				>
					{/* Glow accents */}
					<div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
					<div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

					{/* Header */}
					<div className="flex items-start justify-between gap-4 p-6 border-b border-[#262320]">
						<div>
							<div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-bold text-[#EA580C] uppercase tracking-wider mb-1.5">
								<Zap className="w-3 h-3" /> Select Payment Option
							</div>
							<h2 className="text-xl font-black text-white">
								Subscribe to {plan.name}
							</h2>
							<p className="text-xs text-[#A8A29E] mt-0.5">
								Choose how you would like to pay for your API plan.
							</p>
						</div>
						<button
							onClick={onClose}
							type="button"
							className="p-2 rounded-xl text-[#A8A29E] hover:text-white hover:bg-[#1F1D1B] transition-colors cursor-pointer"
							aria-label="Close"
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					{/* Plan Summary Card */}
					<div className="p-6 space-y-4">
						<div className="p-4 rounded-2xl bg-[#171615] border border-[#292522] flex items-center justify-between gap-4">
							<div>
								<span className="text-[10px] font-bold text-[#78716C] uppercase tracking-wider block mb-0.5">
									Selected Plan
								</span>
								<h4 className="text-base font-extrabold text-white flex items-center gap-2">
									{plan.name}
									{plan.multiplier > 1 && (
										<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-[#EA580C] border border-orange-500/30">
											{plan.multiplier}x Speed
										</span>
									)}
								</h4>
							</div>
							<div className="text-right">
								<span className="text-lg font-black text-white block">
									{priceStr}
								</span>
								<span className="text-[10px] text-[#78716C]">
									{plan.currency} / {plan.durationDays} days
								</span>
							</div>
						</div>

						{/* Option 1: Pay Online via Gateway */}
						<button
							type="button"
							onClick={() => {
								onClose();
								onPayOnline(plan);
							}}
							className="w-full p-4 rounded-2xl border-2 border-orange-500/30 hover:border-orange-500 bg-gradient-to-br from-[#1E1915] to-[#171513] text-left transition-all duration-200 group cursor-pointer shadow-lg hover:shadow-orange-500/10 flex items-start gap-4"
						>
							<div className="w-11 h-11 rounded-xl bg-[#EA580C] flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-600/30">
								<CreditCard className="w-5 h-5" />
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center justify-between gap-2">
									<h3 className="text-sm font-extrabold text-white group-hover:text-[#EA580C] transition-colors">
										Pay with Online Gateway
									</h3>
									<span className="text-[9px] font-bold px-2 py-0.5 rounded bg-orange-500/15 text-[#EA580C] border border-orange-500/20 uppercase tracking-wider">
										Instant
									</span>
								</div>
								<p className="text-xs text-[#A8A29E] mt-1 leading-relaxed">
									Pay securely with UPI, GPay, PhonePe, Paytm, or Credit/Debit Card. Automatic key generation.
								</p>
							</div>
							<ArrowRight className="w-5 h-5 text-[#EA580C] shrink-0 mt-3 group-hover:translate-x-1 transition-transform" />
						</button>

						{/* Option 2: Contact Admin on WhatsApp */}
						<button
							type="button"
							onClick={() => {
								onClose();
								onContactAdmin(plan);
							}}
							className="w-full p-4 rounded-2xl border border-[#2B2724] hover:border-[#25D366]/50 bg-[#161514] hover:bg-[#1A1917] text-left transition-all duration-200 group cursor-pointer flex items-start gap-4"
						>
							<div className="w-11 h-11 rounded-xl bg-[#25D366] flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-900/30">
								<WhatsAppIcon className="w-5 h-5" />
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center justify-between gap-2">
									<h3 className="text-sm font-extrabold text-white group-hover:text-[#25D366] transition-colors">
										Contact Admin on WhatsApp
									</h3>
									<span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
										Direct Support
									</span>
								</div>
								<p className="text-xs text-[#A8A29E] mt-1 leading-relaxed">
									Chat directly with our Admin on WhatsApp for custom key setup, instant delivery & assistance.
								</p>
							</div>
							<ArrowRight className="w-5 h-5 text-[#25D366] shrink-0 mt-3 group-hover:translate-x-1 transition-transform" />
						</button>
					</div>

					{/* Footer */}
					<div className="p-4 sm:p-5 border-t border-[#262320] bg-[#0F0E0D] flex items-center justify-between text-xs text-[#78716C]">
						<div className="flex items-center gap-1.5">
							<Shield className="w-3.5 h-3.5 text-[#EA580C]" />
							<span>256-bit SSL Secure Checkout</span>
						</div>
						<button
							onClick={onClose}
							type="button"
							className="px-4 py-2 rounded-xl bg-[#1A1918] border border-[#2B2724] hover:bg-[#22201E] font-bold text-white transition-all cursor-pointer"
						>
							Cancel
						</button>
					</div>
				</motion.div>
			</div>
		</AnimatePresence>,
		document.body
	);
}
