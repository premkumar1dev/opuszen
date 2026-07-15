import { useState, useEffect } from "react";
import { type MetaFunction } from "react-router";
import { DashboardSidebar } from "../components/dashboard/dashboard-sidebar";
import {
	FiUser,
	FiLock,
	FiBell,
	FiShield,
	FiEye,
	FiEyeOff,
	FiTrash2,
	FiSave,
	FiAlertTriangle,
} from "react-icons/fi";
import { supabase } from "~/utils/supabase";
import { useDashboardTheme } from "~/utils/theme";

export const meta: MetaFunction = () => [
	{ title: "Account Settings | Opuszen" },
	{ name: "description", content: "Manage your OpusZen account settings." },
];

export default function UserAccountRoute() {
	const { theme, toggleTheme } = useDashboardTheme();
	const [user, setUser] = useState<any>(null);
	const [profile, setProfile] = useState({ full_name: "", company: "", website: "", phone: "" });
	const [currentPw, setCurrentPw] = useState("");
	const [newPw, setNewPw] = useState("");
	const [saving, setSaving] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [showPw, setShowPw] = useState(false);
	const [showDelete, setShowDelete] = useState(false);
	const [notifications, setNotifications] = useState({ email: true, billing: true, security: true, marketing: false });

	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => {
			const u = data.user;
			setUser(u);
			setProfile({
				full_name: u?.user_metadata?.full_name || "",
				company: u?.user_metadata?.company || "",
				website: u?.user_metadata?.website || "",
				phone: u?.user_metadata?.phone || "",
			});
		});
	}, []);

	async function saveProfile() {
		setSaving(true);
		try {
			await supabase.auth.updateUser({ data: { full_name: profile.full_name, company: profile.company, website: profile.website, phone: profile.phone } });
		} catch { }
		setSaving(false);
	}

	async function changePassword() {
		if (!currentPw || !newPw) return;
		try {
			await supabase.auth.updateUser({ password: newPw });
			setCurrentPw(""); setNewPw("");
		} catch { }
	}

	async function deleteAccount() {
		try { await supabase.auth.admin.deleteUser(user.id); } catch { }
	}

	const toggleNotif = (key: keyof typeof notifications) => {
		setNotifications((n) => ({ ...n, [key]: !n[key] }));
	};

	return (
		<div className="dashboard flex min-h-screen">
			{sidebarOpen && <div className="fixed inset-0 z-[55] dashboard-overlay backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />}
			<div className={`fixed top-0 left-0 z-[60] h-full md:hidden transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
				<DashboardSidebar collapsed={false} onToggle={() => setSidebarOpen(false)} userEmail={user?.email} theme={theme} onThemeToggle={toggleTheme} />
			</div>
			<div className="hidden md:block">
				<DashboardSidebar collapsed={false} onToggle={() => { }} userEmail={user?.email} theme={theme} onThemeToggle={toggleTheme} />
			</div>

			<main className="flex-1 min-h-screen md:ml-[240px]">
				<header className="sticky top-0 z-40 border-b border-[var(--dashboard-border)]" style={{ backgroundColor: `color-mix(in srgb, var(--dashboard-bg) 85%, transparent)`, WebkitBackdropFilter: 'saturate(180%) blur(8px)', backdropFilter: 'saturate(180%) blur(8px)' }}>
					<div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8 gap-2">
						<div className="flex items-center gap-3 min-w-0">
							<button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--dashboard-nav-hover)] text-[var(--dashboard-text-secondary)] transition-colors shrink-0" aria-label="Open menu">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
							</button>
							<div className="min-w-0 flex-1">
								<h1 className="text-sm font-semibold text-[var(--dashboard-text)] truncate">Account Settings</h1>
								<p className="text-[11px] text-[var(--dashboard-text-muted)] hidden sm:block">Manage your profile and preferences</p>
							</div>
						</div>
					</div>
				</header>

				<div className="p-4 sm:p-6 lg:p-8 max-w-[800px] mx-auto w-full">
					{/* Profile */}
					<div className="dashboard-card p-5 sm:p-6 rounded-2xl mb-4 sm:mb-6">
						<div className="flex items-center gap-3 mb-6">
							<div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20"><FiUser className="w-4 h-4 text-indigo-500" /></div>
							<div>
								<h2 className="text-sm font-bold text-[var(--dashboard-text)]">Profile Information</h2>
								<p className="text-[11px] text-[var(--dashboard-text-muted)]">Your personal details</p>
							</div>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-1.5">Full Name</label>
								<input type="text" value={profile.full_name} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} className="dashboard-input w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition-all" />
							</div>
							<div>
								<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-1.5">Email</label>
								<input type="email" value={user?.email || ""} disabled className="dashboard-input w-full px-3 py-2.5 rounded-xl text-sm opacity-60 cursor-not-allowed" />
							</div>
							<div>
								<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-1.5">Company</label>
								<input type="text" value={profile.company} onChange={(e) => setProfile((p) => ({ ...p, company: e.target.value }))} className="dashboard-input w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition-all" />
							</div>
							<div>
								<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-1.5">Website</label>
								<input type="text" value={profile.website} onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))} className="dashboard-input w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition-all" />
							</div>
						</div>
						<div className="mt-6 flex justify-end">
							<button onClick={saveProfile} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-all disabled:opacity-40 cursor-pointer">
								<FiSave className="w-3.5 h-3.5" />{saving ? "Saving..." : "Save Profile"}
							</button>
						</div>
					</div>

					{/* Password */}
					<div className="dashboard-card p-5 sm:p-6 rounded-2xl mb-4 sm:mb-6">
						<div className="flex items-center gap-3 mb-6">
							<div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20"><FiLock className="w-4 h-4 text-violet-500" /></div>
							<div>
								<h2 className="text-sm font-bold text-[var(--dashboard-text)]">Change Password</h2>
								<p className="text-[11px] text-[var(--dashboard-text-muted)]">Update your account password</p>
							</div>
						</div>
						<div className="space-y-4 max-w-md">
							<div>
								<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-1.5">Current Password</label>
								<div className="relative">
									<input type={showPw ? "text" : "password"} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="dashboard-input w-full px-3 py-2.5 pr-10 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition-all" />
									<button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] p-1 touch-manipulation" aria-label={showPw ? "Hide" : "Show"}><FiEye className="w-4 h-4" /></button>
								</div>
							</div>
							<div>
								<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-1.5">New Password</label>
								<input type={showPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)} className="dashboard-input w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition-all" />
							</div>
							<button onClick={changePassword} disabled={!currentPw || !newPw} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition-all disabled:opacity-40 cursor-pointer">
								<FiShield className="w-3.5 h-3.5" /> Update Password
							</button>
						</div>
					</div>

					{/* Notifications */}
					<div className="dashboard-card p-5 sm:p-6 rounded-2xl mb-4 sm:mb-6">
						<div className="flex items-center gap-3 mb-6">
							<div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20"><FiBell className="w-4 h-4 text-emerald-500" /></div>
							<div>
								<h2 className="text-sm font-bold text-[var(--dashboard-text)]">Notifications</h2>
								<p className="text-[11px] text-[var(--dashboard-text-muted)]">Manage your notification preferences</p>
							</div>
						</div>
						<div className="space-y-3">
							{[
								{ key: "email" as const, label: "Email Notifications", desc: "Receive updates and newsletters" },
								{ key: "billing" as const, label: "Billing Alerts", desc: "Payment confirmations and invoices" },
								{ key: "security" as const, label: "Security Alerts", desc: "Login attempts and security updates" },
								{ key: "marketing" as const, label: "Marketing", desc: "Promotions and product updates" },
							].map((item) => (
								<div key={item.key} className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-0 py-3 border-b border-[var(--dashboard-border)] last:border-0">
									<div className="min-w-0 flex-1 pr-2">
										<p className="text-sm font-medium text-[var(--dashboard-text)]">{item.label}</p>
										<p className="text-[11px] text-[var(--dashboard-text-muted)]">{item.desc}</p>
									</div>
									<button onClick={() => toggleNotif(item.key)} className={`relative w-11 h-6 rounded-full transition-all cursor-pointer ${notifications[item.key] ? "bg-indigo-500" : "bg-[var(--dashboard-nav-hover)] border border-[var(--dashboard-border)]"}`}>
										<span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications[item.key] ? "translate-x-5" : "translate-x-0"}`} />
									</button>
								</div>
							))}
						</div>
					</div>

					{/* Danger zone */}
					<div className="dashboard-card p-5 sm:p-6 rounded-2xl border-red-500/20">
						<div className="flex items-center gap-3 mb-4">
							<div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20"><FiTrash2 className="w-4 h-4 text-red-500" /></div>
							<div>
								<h2 className="text-sm font-bold text-red-500">Danger Zone</h2>
								<p className="text-[11px] text-[var(--dashboard-text-muted)]">Irreversible actions</p>
							</div>
						</div>
						{!showDelete ? (
							<button onClick={() => setShowDelete(true)} className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-500 text-xs font-semibold hover:bg-red-500/5 transition-all cursor-pointer touch-manipulation">Delete Account</button>
						) : (
							<div className="space-y-3">
								<p className="text-xs text-[var(--dashboard-text-secondary)]">This will permanently delete your account and all data. This action cannot be undone.</p>
								<div className="flex gap-2">
									<button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--dashboard-border)] text-xs font-medium text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] transition-all cursor-pointer touch-manipulation">Cancel</button>
									<button onClick={deleteAccount} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-all cursor-pointer touch-manipulation">Yes, Delete Everything</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
