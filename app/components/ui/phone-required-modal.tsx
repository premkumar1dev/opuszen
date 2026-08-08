import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
	Smartphone,
	X,
	Check,
	Shield,
	AlertCircle,
	Loader,
} from "lucide-react";
import { supabase } from "~/utils/supabase";

export interface PhoneRequiredModalProps {
	open: boolean;
	onClose: () => void;
	onSuccess?: (phone: string) => void;
	title?: string;
	description?: string;
}

export function PhoneRequiredModal({
	open,
	onClose,
	onSuccess,
	title = "Phone Number Required",
	description = "Please add a valid 10-digit mobile number to your account before purchasing. This is required by the payment gateway to issue your API key order.",
}: PhoneRequiredModalProps) {
	const [mounted, setMounted] = useState(false);
	const [phone, setPhone] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (open) {
			setError(null);
			// Fetch existing user phone if available
			supabase.auth.getUser().then(({ data }) => {
				const u = data?.user;
				const existing = u?.user_metadata?.phone || u?.phone || "";
				if (existing) {
					setPhone(existing.replace(/\D/g, "").slice(-10));
				} else {
					setPhone("");
				}
			});
		}
	}, [open]);

	if (!mounted) return null;

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		const cleanDigits = phone.replace(/\D/g, "");
		
		if (cleanDigits.length < 10) {
			setError("Please enter a valid 10-digit mobile number.");
			return;
		}

		setSaving(true);
		setError(null);

		try {
			// Update Supabase user_metadata with the phone number
			const { error: updateErr } = await supabase.auth.updateUser({
				data: { phone: cleanDigits }
			});

			if (updateErr) {
				throw updateErr;
			}

			setSaving(false);
			if (onSuccess) {
				onSuccess(cleanDigits);
			}
			onClose();
		} catch (err: any) {
			console.error("[PhoneRequiredModal] Failed to update phone:", err);
			setError(err?.message || "Failed to update phone number. Please try again.");
			setSaving(false);
		}
	};

	return createPortal(
		<AnimatePresence>
			{open && (
				<div className="fixed inset-0 z-modal flex items-center justify-center p-4">
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="absolute inset-0 bg-black/70 backdrop-blur-md"
					/>

					{/* Modal Container */}
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 10 }}
						transition={{ type: "spring", duration: 0.3 }}
						className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--dashboard-border,#262626)] bg-[#121212] p-6 shadow-2xl"
					>
						{/* Close button */}
						<button
							onClick={onClose}
							className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
						>
							<X className="w-5 h-5" />
						</button>

						{/* Header */}
						<div className="flex items-center gap-3.5 mb-3">
							<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
								<Smartphone className="h-6 w-6" />
							</div>
							<div>
								<h3 className="text-lg font-bold text-white">{title}</h3>
								<div className="flex items-center gap-1 text-xs text-orange-400 font-medium">
									<Shield className="w-3.5 h-3.5" /> Required for payment processing
								</div>
							</div>
						</div>

						{/* Description */}
						<p className="text-sm text-neutral-300 mb-5 leading-relaxed">
							{description}
						</p>

						{/* Form */}
						<form onSubmit={handleSave} className="space-y-4">
							<div>
								<label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
									Mobile Number (10 Digits)
								</label>
								<div className="relative flex items-center">
									<span className="absolute left-3.5 text-sm font-semibold text-neutral-400">
										+91
									</span>
									<input
										type="tel"
										maxLength={10}
										value={phone}
										onChange={(e) => {
											setPhone(e.target.value.replace(/\D/g, ""));
											setError(null);
										}}
										placeholder="9876543210"
										autoFocus
										className="w-full rounded-xl border border-neutral-800 bg-neutral-900/80 py-3 pl-14 pr-4 text-sm text-white placeholder-neutral-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors font-mono tracking-wider"
									/>
								</div>
								{error && (
									<div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
										<AlertCircle className="w-3.5 h-3.5 shrink-0" />
										<span>{error}</span>
									</div>
								)}
							</div>

							{/* Actions */}
							<div className="flex items-center justify-end gap-3 pt-2">
								<button
									type="button"
									onClick={onClose}
									disabled={saving}
									className="rounded-xl border border-neutral-800 px-4 py-2.5 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={saving || phone.replace(/\D/g, "").length < 10}
									className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20"
								>
									{saving ? (
										<>
											<Loader className="w-4 h-4 animate-spin" />
											Saving...
										</>
									) : (
										<>
											<Check className="w-4 h-4" />
											Save & Continue
										</>
									)}
								</button>
							</div>
						</form>
					</motion.div>
				</div>
			)}
		</AnimatePresence>,
		document.body
	);
}
