import { useState, useEffect } from "react";
import { type MetaFunction, data, type ActionFunctionArgs, useNavigate } from "react-router";
import { DashboardSidebar } from "../components/dashboard/dashboard-sidebar";
import {
	Users,
	Copy,
	Share2,
	Gift,
	Link2,
	Mail,
} from "lucide-react";
import { supabase } from "~/utils/supabase";
import { supabaseServer } from "~/utils/supabase.server";
import { useDashboardTheme } from "~/utils/theme";

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
	{ title: "Refer & Earn | OpusZen" },
	{ name: "description", content: "Refer friends and earn rewards with OpusZen." },
];

const REWARD = 10;

// Server-side session validation helper
async function getCurrentUser(request: Request) {
	const cookieHeader = request.headers.get("Cookie") || "";
	const accessTokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
	if (!accessTokenMatch) return null;
	const { data, error } = await supabaseServer.auth.getUser(accessTokenMatch[1]);
	if (error || !data.user) return null;
	return data.user;
}

// Server action: submit a referral scoped to the authenticated user
export async function action({ request }: ActionFunctionArgs) {
	const user = await getCurrentUser(request);
	if (!user) return data({ error: "Unauthorized" }, { status: 401 });

	const formData = await request.formData();
	const intent = formData.get("intent");

	if (intent === "submitReferral") {
		const referredEmail = formData.get("referredEmail");
		if (!referredEmail || typeof referredEmail !== "string" || !referredEmail.trim()) {
			return data({ error: "Referral email is required" }, { status: 400 });
		}
		const { error } = await supabaseServer.from("referrals").insert({
			referrer_id: user.id,
			referred_email: referredEmail.trim(),
			status: "pending",
			reward_amount: REWARD,
			reward_status: "pending",
		});
		if (error) return data({ error: error.message }, { status: 500 });
		return data({ success: true, message: "Referral submitted successfully." });
	}

	return data({ error: "Unknown intent" }, { status: 400 });
}

export default function UserReferEarnRoute() {
	const { theme, toggleTheme } = useDashboardTheme();
	const navigate = useNavigate();
	const [user, setUser] = useState<any>(null);

	const handleLogout = async () => {
		try {
			await supabase.auth.signOut();
			navigate("/auth/login");
		} catch (err) {
			console.error("Logout failed:", err);
		}
	};
	const [referrals, setReferrals] = useState<Referral[]>([]);
	const [loading, setLoading] = useState(true);
	const [copied, setCopied] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [code, setCode] = useState("");

	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => {
			setUser(data.user);
			if (data.user?.id) setCode(`OPUS-${data.user.id.slice(0, 8).toUpperCase()}`);
		});
		fetchRefs();
	}, []);

	async function fetchRefs() {
		setLoading(true);
		try {
			const { data } = await supabase.from("referrals").select("*").order("created_at", { ascending: false });
			if (data) setReferrals(data as Referral[]);
		} catch { }
		setLoading(false);
	}

	const totalEarned = referrals.filter((r) => r.reward_status === "paid").reduce((s, r) => s + r.reward_amount, 0);
	const pendingEarned = referrals.filter((r) => r.reward_status === "pending").reduce((s, r) => s + r.reward_amount, 0);
	const [link, setLink] = useState("");
	useEffect(() => {
		if (typeof window !== "undefined") {
			setLink(`${window.location.origin}/auth/signup?ref=${code}`);
		}
	}, [code]);

	const copyLink = () => { if (link) { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } };

	return (
		<div className="dashboard flex min-h-screen">
			{sidebarOpen && <div className="fixed inset-0 z-dropdown dashboard-overlay backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />}
			<div className={`fixed top-0 left-0 z-dropdown h-full md:hidden transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
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
								<h1 className="text-sm font-semibold text-[var(--dashboard-text)] truncate">Refer & Earn</h1>
								<p className="text-[11px] text-[var(--dashboard-text-muted)] hidden sm:block">Earn rewards for every referral</p>
							</div>
						</div>
					</div>
				</header>

				<div className="p-4 sm:p-6 lg:p-8 max-w-[1000px] mx-auto w-full">
					{/* Hero */}
					<div className="p-4 sm:p-6 lg:p-8 rounded-2xl border border-[var(--dashboard-border)] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent mb-6 sm:mb-8">
						<div className="flex items-start gap-3 sm:gap-4">
							<div className="p-2.5 sm:p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
								<Gift className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
							</div>
							<div className="min-w-0">
								<h2 className="text-base sm:text-xl font-bold text-[var(--dashboard-text)] mb-1">Share OpusZen, Earn Rewards</h2>
								<p className="text-xs sm:text-sm text-[var(--dashboard-text-secondary)]">Refer friends to OpusZen and earn <strong className="text-primary">${REWARD}</strong> in credits for each friend who signs up and makes their first payment.</p>
							</div>
						</div>
					</div>

					{/* Stats */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
						<div className="dashboard-card p-3 sm:p-5 rounded-2xl dashboard-card-hover transition-all">
							<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider">Total Referrals</p>
							<p className="text-xl sm:text-3xl font-bold text-[var(--dashboard-text)] mt-1">{referrals.length}</p>
						</div>
						<div className="dashboard-card p-3 sm:p-5 rounded-2xl dashboard-card-hover transition-all">
							<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider">Earned</p>
							<p className="text-xl sm:text-3xl font-bold text-emerald-500 mt-1">${totalEarned.toFixed(2)}</p>
						</div>
						<div className="dashboard-card p-3 sm:p-5 rounded-2xl dashboard-card-hover transition-all">
							<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider">Pending</p>
							<p className="text-xl sm:text-3xl font-bold text-amber-500 mt-1">${pendingEarned.toFixed(2)}</p>
						</div>
						<div className="dashboard-card p-3 sm:p-5 rounded-2xl dashboard-card-hover transition-all">
							<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider">Reward per ref</p>
							<p className="text-xl sm:text-3xl font-bold text-primary mt-1">${REWARD}</p>
						</div>
					</div>

					{/* How it works */}
					<div className="dashboard-card p-4 sm:p-6 rounded-2xl mb-6 sm:mb-8">
						<h3 className="text-sm font-semibold text-[var(--dashboard-text)] mb-4">How It Works</h3>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							{[
								{ icon: Link2, title: "Share Link", desc: "Send your unique referral link to friends" },
								{ icon: Users, title: "Friend Signs Up", desc: "They create an account using your link" },
								{ icon: Gift, title: "You Earn", desc: `Get $${REWARD} credit when they pay` },
							].map((step, i) => (
								<div key={i} className="flex items-start gap-3">
									<div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
										<step.icon className="w-4 h-4 text-primary" />
									</div>
									<div>
										<p className="text-xs font-semibold text-[var(--dashboard-text)]">{step.title}</p>
										<p className="text-[11px] text-[var(--dashboard-text-muted)] mt-0.5">{step.desc}</p>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Referral link */}
					<div className="dashboard-card p-4 sm:p-5 rounded-2xl mb-6 sm:mb-8">
						<h3 className="text-sm font-semibold text-[var(--dashboard-text)] mb-3">Your Referral Link</h3>
						<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
							<div className="flex-1 flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-[var(--dashboard-input-bg)] border border-[var(--dashboard-border)] min-w-0">
								<Link2 className="w-4 h-4 text-[var(--dashboard-text-muted)] shrink-0" />
								<code className="text-[10px] sm:text-xs font-mono text-[var(--dashboard-text-secondary)] truncate">{link}</code>
							</div>
							<div className="flex items-center gap-2 shrink-0">
								<button onClick={copyLink} className="flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer touch-manipulation">
									<Copy className="w-3.5 h-3.5" />
									{copied ? "Copied!" : "Copy"}
								</button>
								<button onClick={() => window.location.href = `mailto:?subject=Try OpusZen - Get $${REWARD} Free Credits&body=Hey! Use my referral link: ${encodeURIComponent(link)}`} className="hidden sm:flex p-2.5 rounded-xl border border-[var(--dashboard-border)] text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] transition-all cursor-pointer shrink-0 touch-manipulation" title="Share via email" aria-label="Share via email"><Mail className="w-4 h-4" /></button>
							</div>
						</div>
					</div>

					{/* Referrals list */}
					<div className="dashboard-card rounded-2xl overflow-hidden">
						<div className="px-4 sm:px-5 py-4 border-b border-[var(--dashboard-border)]">
							<h3 className="text-sm font-semibold text-[var(--dashboard-text)]">Referral History</h3>
							<p className="text-[11px] text-[var(--dashboard-text-muted)] mt-0.5">{referrals.length} referral{referrals.length !== 1 ? "s" : ""}</p>
						</div>
						{loading ? (
							<div className="flex items-center justify-center py-12"><Users className="w-6 h-6 animate-spin text-[var(--dashboard-text-muted)]" /></div>
						) : referrals.length === 0 ? (
							<div className="text-center py-12 sm:py-16 px-4">
								<Users className="w-10 h-10 text-[var(--dashboard-text-muted)] mx-auto mb-3" />
								<p className="text-sm text-[var(--dashboard-text-secondary)] font-medium">No referrals yet</p>
								<p className="text-xs text-[var(--dashboard-text-muted)] mt-1">Share your link to start earning!</p>
							</div>
						) : (
							<div className="divide-y divide-[var(--dashboard-border)]">
								{referrals.map((ref) => (
									<div key={ref.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-[var(--dashboard-nav-hover)] transition-all">
										<div className="flex items-center gap-3 min-w-0 flex-1">
											<span className={`w-2 h-2 rounded-full shrink-0 ${ref.reward_status === "paid" ? "bg-emerald-500" : ref.reward_status === "pending" ? "bg-amber-500 animate-pulse" : "bg-[var(--dashboard-text-muted)]"}`} />
											<div className="min-w-0">
												<p className="text-xs font-medium text-[var(--dashboard-text-secondary)] truncate">{ref.referred_email || "Pending signup"}</p>
												<p className="text-[10px] text-[var(--dashboard-text-muted)]">{new Date(ref.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
											</div>
										</div>
										<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${ref.reward_status === "paid" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : ref.reward_status === "pending" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-[var(--dashboard-nav-hover)] text-[var(--dashboard-text-muted)] border-[var(--dashboard-border)]"}`}>
											{ref.reward_status === "paid" ? `+$${ref.reward_amount.toFixed(2)}` : ref.reward_status === "pending" ? "Pending" : "Expired"}
										</span>
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
