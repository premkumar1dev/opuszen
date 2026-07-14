import { useState, useEffect } from "react";
import { type MetaFunction } from "react-router";
import { DashboardSidebar } from "../components/dashboard/dashboard-sidebar";
import {
	FiUsers,
	FiCopy,
	FiShare2,
	FiGift,
	FiTrendingUp,
	FiClock,
	FiCheck,
	FiExternalLink,
	FiMail,
	FiLink,
} from "react-icons/fi";
import { supabase } from "~/utils/supabase";

interface Referral {
	id: string;
	referred_email: string;
	status: "pending" | "signed_up" | "completed";
	reward_amount: number;
	reward_status: "pending" | "paid" | "expired";
	created_at: string;
	completed_at: string | null;
}

export const meta: MetaFunction = () => [
	{ title: "Refer & Earn | Opuszen" },
	{ name: "description", content: "Refer friends and earn rewards with OpusZen." },
];

export default function UserReferEarnRoute() {
	const [user, setUser] = useState<any>(null);
	const [referrals, setReferrals] = useState<Referral[]>([]);
	const [loading, setLoading] = useState(true);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const [referralCode, setReferralCode] = useState("");

	const REFERRAL_REWARD = 10; // $10 per referral
	const REWARD_RATE = 0.15; // 15% of referred user's first payment

	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => {
			setUser(data.user);
			if (data.user?.id) {
				setReferralCode(`OPUS-${data.user.id.slice(0, 8).toUpperCase()}`);
			}
		});
		fetchReferrals();
	}, []);

	async function fetchReferrals() {
		setLoading(true);
		try {
			const { data, error } = await supabase
				.from("referrals")
				.select("*")
				.order("created_at", { ascending: false });
			if (!error && data) setReferrals(data as Referral[]);
		} catch {}
		setLoading(false);
	}

	const totalEarned = referrals
		.filter((r) => r.reward_status === "paid")
		.reduce((s, r) => s + r.reward_amount, 0);

	const pendingEarned = referrals
		.filter((r) => r.reward_status === "pending")
		.reduce((s, r) => s + r.reward_amount, 0);

	const referralLink = `${window.location.origin}/auth/signup?ref=${referralCode}`;

	const copyLink = () => {
		navigator.clipboard.writeText(referralLink);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const shareViaEmail = () => {
		window.location.href = `mailto:?subject=Try OpusZen - Get $10 Free Credits&body=Hey!%20Use%20my%20referral%20link%20to%20get%20started%20with%20OpusZen%20API%20gateway:%20${encodeURIComponent(referralLink)}`;
	};

	return (
		<div className="min-h-screen bg-[#09090b] flex">
			{/* Mobile sidebar overlay */}
			{sidebarOpen && (
				<div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
			)}
			{/* Mobile sidebar */}
			<div
				className={`fixed top-0 left-0 z-[60] h-full md:hidden transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
			>
				<DashboardSidebar
					collapsed={false}
					onToggle={() => setSidebarOpen(false)}
					userEmail={user?.email}
				/>
			</div>

			{/* Desktop sidebar */}
			<div className="hidden md:block shrink-0">
				<DashboardSidebar
					collapsed={false}
					onToggle={() => {}}
					userEmail={user?.email}
				/>
			</div>

			<main className="flex-1 min-h-screen">
				<header className="sticky top-0 z-40 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.06]">
					<div className="flex items-center justify-between h-14 px-4 sm:px-8">
						<div className="flex items-center gap-3">
							<button
							onClick={() => setSidebarOpen(true)}
							className="md:hidden p-2 -ml-2 rounded-lg hover:bg-white/[0.06] text-zinc-400 transition-colors"
							aria-label="Open menu"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
								<path d="M4 6h16M4 12h16M4 18h16" />
							</svg>
						</button>
							<div>
								<h1 className="text-sm font-semibold text-white">Refer & Earn</h1>
								<p className="text-[11px] text-zinc-500 hidden sm:block">
									Earn rewards for every referral
								</p>
							</div>
						</div>
					</div>
				</header>

				<div className="p-4 sm:p-8 max-w-[1000px]">
					{/* Hero banner */}
					<div className="p-6 sm:p-8 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent mb-8">
						<div className="flex items-start gap-4">
							<div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 shrink-0">
								<FiGift className="w-6 h-6 text-indigo-400" />
							</div>
							<div className="flex-1 min-w-0">
								<h2 className="text-xl font-bold text-white mb-1">Share OpusZen, Earn Rewards</h2>
								<p className="text-sm text-zinc-400">
									Refer friends to OpusZen and earn <strong className="text-indigo-400">${REFERRAL_REWARD}</strong> in
									credits for each friend who signs up and makes their first payment.
								</p>
							</div>
						</div>
					</div>

					{/* Stats */}
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
						<div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
							<p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Total Referrals</p>
							<p className="text-3xl font-bold text-white mt-1">{referrals.length}</p>
						</div>
						<div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
							<p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Signed Up</p>
							<p className="text-3xl font-bold text-indigo-400 mt-1">
								{referrals.filter((r) => r.status !== "pending").length}
							</p>
						</div>
						<div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
							<p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Earned</p>
							<p className="text-3xl font-bold text-emerald-400 mt-1">${totalEarned.toFixed(2)}</p>
						</div>
						<div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
							<p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Pending</p>
							<p className="text-3xl font-bold text-amber-400 mt-1">${pendingEarned.toFixed(2)}</p>
						</div>
					</div>

					{/* How it works */}
					<div className="p-6 rounded-2xl border border-white/[0.06] bg-[#0c0c0f] mb-8">
						<h3 className="text-sm font-semibold text-white mb-4">How It Works</h3>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							{[
								{ icon: FiLink, title: "Share Link", desc: "Send your unique referral link to friends" },
								{ icon: FiUsers, title: "Friend Signs Up", desc: "They create an account using your link" },
								{ icon: FiGift, title: "You Earn", desc: `Get $${REFERRAL_REWARD} credit when they pay` },
							].map((step, i) => (
								<div key={i} className="flex items-start gap-3">
									<div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 shrink-0">
										<step.icon className="w-4 h-4 text-indigo-400" />
									</div>
									<div>
										<p className="text-xs font-semibold text-white">{step.title}</p>
										<p className="text-[11px] text-zinc-500 mt-0.5">{step.desc}</p>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Referral link */}
					<div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0f] mb-8">
						<h3 className="text-sm font-semibold text-white mb-3">Your Referral Link</h3>
						<div className="flex items-center gap-2">
							<div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
								<FiLink className="w-4 h-4 text-zinc-500 shrink-0" />
								<code className="text-xs font-mono text-zinc-400 truncate">{referralLink}</code>
							</div>
							<button
								onClick={copyLink}
								className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 transition-all cursor-pointer shrink-0"
							>
								<FiCopy className="w-3.5 h-3.5" />
								{copied ? "Copied!" : "Copy"}
							</button>
							<button
								onClick={shareViaEmail}
								className="p-2.5 rounded-xl border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer shrink-0"
								title="Share via email"
							>
								<FiMail className="w-4 h-4" />
							</button>
							<button
								onClick={async () => {
									if (navigator.share) {
										await navigator.share({ title: "OpusZen API Gateway", url: referralLink });
									}
								}}
								className="p-2.5 rounded-xl border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer shrink-0"
								title="Share"
							>
								<FiShare2 className="w-4 h-4" />
							</button>
						</div>
					</div>

					{/* Referrals list */}
					<div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0f] overflow-hidden">
						<div className="px-5 py-4 border-b border-white/[0.06]">
							<h3 className="text-sm font-semibold text-white">Referral History</h3>
							<p className="text-[11px] text-zinc-500 mt-0.5">{referrals.length} referral{referrals.length !== 1 ? "s" : ""}</p>
						</div>
						{loading ? (
							<div className="flex items-center justify-center py-12">
								<FiClock className="w-6 h-6 animate-spin text-zinc-600" />
							</div>
						) : referrals.length === 0 ? (
							<div className="text-center py-16">
								<FiUsers className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
								<p className="text-sm text-zinc-400 font-medium">No referrals yet</p>
								<p className="text-xs text-zinc-600 mt-1">Share your link to start earning!</p>
							</div>
						) : (
							<div className="divide-y divide-white/[0.04]">
								{referrals.map((ref) => (
									<div key={ref.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-all">
										<div className="flex items-center gap-3 min-w-0">
											<div
												className={`w-2 h-2 rounded-full shrink-0 ${
													ref.reward_status === "paid"
														? "bg-emerald-500"
														: ref.reward_status === "pending"
															? "bg-amber-500 animate-pulse"
															: "bg-zinc-600"
												}`}
											/>
											<div className="min-w-0">
												<p className="text-xs font-medium text-zinc-200 truncate">
													{ref.referred_email || "Pending signup"}
												</p>
												<p className="text-[10px] text-zinc-600">
													{new Date(ref.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-3 shrink-0">
											<span
												className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
													ref.reward_status === "paid"
														? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
														: ref.reward_status === "pending"
															? "bg-amber-500/10 text-amber-400 border-amber-500/20"
															: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
												}`}
											>
												{ref.reward_status === "paid"
													? `+$${ref.reward_amount.toFixed(2)}`
													: ref.reward_status === "pending"
														? "Pending"
														: "Expired"}
											</span>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
