import { useState, useEffect } from "react";
import { type MetaFunction, data, type ActionFunctionArgs, useNavigate } from "react-router";
import { DashboardSidebar } from "../components/dashboard/dashboard-sidebar";
import {
	User,
	Lock,
	Bell,
	Shield,
	Eye,
	EyeOff,
	Trash2,
	Save,
	AlertTriangle,
	Smartphone,
} from "lucide-react";
import { supabase } from "~/utils/supabase";
import { supabaseServer } from "~/utils/supabase.server";
import { useDashboardTheme } from "~/utils/theme";

export const meta: MetaFunction = () => [
	{ title: "Account Settings | OpusZen" },
	{ name: "description", content: "Manage your OpusZen account settings." },
];

// Server-side session validation helper
async function getCurrentUser(request: Request) {
	const cookieHeader = request.headers.get("Cookie") || "";
	const accessTokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
	if (!accessTokenMatch) return null;
	const { data, error } = await supabaseServer.auth.getUser(accessTokenMatch[1]);
	if (error || !data.user) return null;
	return data.user;
}

// Server action: update profile / change password scoped to the authenticated user
export async function action({ request }: ActionFunctionArgs) {
	const user = await getCurrentUser(request);
	if (!user) return data({ error: "Unauthorized" }, { status: 401 });

	const formData = await request.formData();
	const intent = formData.get("intent");

	if (intent === "updatePassword") {
		const newPassword = formData.get("newPassword");
		if (!newPassword || typeof newPassword !== "string") {
			return data({ error: "New password is required" }, { status: 400 });
		}
		const { error } = await supabaseServer.auth.admin.updateUserById(user.id, {
			password: newPassword,
		});
		if (error) return data({ error: error.message }, { status: 500 });
		return data({ success: true, message: "Password updated successfully." });
	}

	if (intent === "updateEmail") {
		const newEmail = formData.get("newEmail");
		if (!newEmail || typeof newEmail !== "string") {
			return data({ error: "New email is required" }, { status: 400 });
		}
		const { error } = await supabaseServer.auth.admin.updateUserById(user.id, {
			email: newEmail,
		});
		if (error) return data({ error: error.message }, { status: 500 });
		return data({ success: true, message: "Email updated successfully." });
	}

	return data({ error: "Unknown intent" }, { status: 400 });
}

export default function UserAccountRoute() {
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
	const [profile, setProfile] = useState({ full_name: "", company: "", website: "", phone: "", username: "" });
	const [currentPw, setCurrentPw] = useState("");
	const [newPw, setNewPw] = useState("");
	const [saving, setSaving] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [showCurrentPw, setShowCurrentPw] = useState(false);
	const [showNewPw, setShowNewPw] = useState(false);
	const [showDelete, setShowDelete] = useState(false);
	const [notifications, setNotifications] = useState({ email: true, billing: true, security: true, marketing: false });
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => {
			const u = data.user;
			setUser(u);
			setProfile({
				full_name: u?.user_metadata?.full_name || "",
				company: u?.user_metadata?.company || "",
				website: u?.user_metadata?.website || "",
				phone: u?.user_metadata?.phone || u?.phone || "",
				username: u?.user_metadata?.username || u?.email?.split("@")[0] || "",
			});
		});
	}, []);

	async function saveProfile() {
		setSaving(true);
		setErrorMsg(null);
		setSuccessMsg(null);
		try {
			await supabase.auth.updateUser({
				data: {
					full_name: profile.full_name,
					company: profile.company,
					website: profile.website,
					phone: profile.phone,
					username: profile.username,
				}
			});
			setSuccessMsg("Profile updated successfully.");
			setTimeout(() => setSuccessMsg(null), 4000);
		} catch {
			setErrorMsg("Failed to update profile. Please try again.");
		}
		setSaving(false);
	}

	async function changePassword() {
		if (!currentPw || !newPw) return;
		setErrorMsg(null);
		setSuccessMsg(null);
		try {
			// Verify current password by reauthenticating before allowing change
			const { error: reauthErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw });
			if (reauthErr) {
				setErrorMsg("Current password is incorrect.");
				return;
			}
			await supabase.auth.updateUser({ password: newPw });
			setSuccessMsg("Password updated successfully.");
			setCurrentPw(""); setNewPw("");
			setTimeout(() => setSuccessMsg(null), 4000);
		} catch {
			setErrorMsg("Failed to update password. Please try again.");
		}
	}

	async function deleteAccount() {
		if (!user) return;
		setErrorMsg(null);
		setDeleting(true);
		try {
			// Client-side .admin methods are unavailable from the browser;
			// sign out to revoke session and guide user to contact support
			await supabase.auth.signOut();
			setSuccessMsg("Your session has been terminated. Contact support for permanent account deletion.");
			setTimeout(() => setSuccessMsg(null), 8000);
		} catch {
			setErrorMsg("Failed to terminate session. Please try again or contact support.");
		}
		setDeleting(false);
		setShowDelete(false);
	}

	const toggleNotif = async (key: keyof typeof notifications) => {
		setNotifications((n) => {
			const next = { ...n, [key]: !n[key] };
			// Persist to user metadata (fire-and-forget)
			if (user) {
				supabase.auth.updateUser({ data: { ...user.user_metadata, preferences: next } }).catch(() => {});
			}
			return next;
		});
	};

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
							<div className="min-w-0 flex-1">
								<h1 className="text-sm font-semibold text-[var(--dashboard-text)] truncate">Account Settings</h1>
								<p className="text-[11px] text-[var(--dashboard-text-muted)] hidden sm:block">Manage your profile and preferences</p>
							</div>
						</div>
					</div>
				</header>

				<div className="p-4 sm:p-6 lg:p-8 max-w-[800px] mx-auto w-full">
					{/* Flash messages */}
					{errorMsg && (
						<div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
							<AlertTriangle className="w-4 h-4 shrink-0" />
							{errorMsg}
						</div>
					)}
					{successMsg && (
						<div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
							<Shield className="w-4 h-4 shrink-0" />
							{successMsg}
						</div>
					)}

					{/* Profile */}
					<div className="dashboard-card p-5 sm:p-6 rounded-2xl mb-4 sm:mb-6">
						<div className="flex items-center gap-3 mb-6">
							<div className="p-2 rounded-lg bg-primary/10 border border-primary/20"><User className="w-4 h-4 text-primary" /></div>
							<div>
								<h2 className="text-sm font-bold text-[var(--dashboard-text)]">Profile Information</h2>
								<p className="text-[11px] text-[var(--dashboard-text-muted)]">Your personal details</p>
							</div>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-1.5">Username</label>
								<div className="relative">
									<input
										type="text"
										value={profile.username}
										onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
										className="dashboard-input w-full pl-9 pr-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-all"
										placeholder="Username"
									/>
									<User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--dashboard-text-muted)]" />
								</div>
							</div>
							<div>
								<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-1.5">Mobile Number</label>
								<div className="relative">
									<input
										type="text"
										value={profile.phone}
										onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
										className="dashboard-input w-full pl-9 pr-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-all font-mono"
										placeholder="e.g. 9876543210"
									/>
									<Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--dashboard-text-muted)]" />
								</div>
								<span className="text-[11px] text-amber-500/90 dark:text-amber-400/90 mt-1 block font-medium">
									Required for API key purchasing & online payment verification
								</span>
							</div>
							<div>
								<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-1.5">Full Name</label>
								<input type="text" value={profile.full_name} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} className="dashboard-input w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-all" />
							</div>
							<div>
								<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-1.5">Company</label>
								<input type="text" value={profile.company} onChange={(e) => setProfile((p) => ({ ...p, company: e.target.value }))} className="dashboard-input w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-all" />
							</div>
							<div>
								<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-1.5">Website</label>
								<input type="text" value={profile.website} onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))} className="dashboard-input w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-all" />
							</div>
						</div>
						<div className="mt-6 flex justify-end">
							<button onClick={saveProfile} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-40 cursor-pointer">
								<Save className="w-3.5 h-3.5" />{saving ? "Saving..." : "Save Profile"}
							</button>
						</div>
					</div>

					{/* Password */}
					<div className="dashboard-card p-5 sm:p-6 rounded-2xl mb-4 sm:mb-6">
						<div className="flex items-center gap-3 mb-6">
							<div className="p-2 rounded-lg bg-primary/10 border border-primary/20"><Lock className="w-4 h-4 text-primary" /></div>
							<div>
								<h2 className="text-sm font-bold text-[var(--dashboard-text)]">Change Password</h2>
								<p className="text-[11px] text-[var(--dashboard-text-muted)]">Update your account password</p>
							</div>
						</div>
						<div className="space-y-4 max-w-md">
							<div>
								<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-1.5">Current Password</label>
								<div className="relative">
									<input type={showCurrentPw ? "text" : "password"} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="dashboard-input w-full px-3 py-2.5 pr-10 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-all" />
									<button onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] p-1 touch-manipulation" aria-label={showCurrentPw ? "Hide" : "Show"}><Eye className="w-4 h-4" /></button>
								</div>
							</div>
							<div>
								<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-1.5">New Password</label>
								<div className="relative">
									<input type={showNewPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)} className="dashboard-input w-full px-3 py-2.5 pr-10 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-all" />
									<button onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] p-1 touch-manipulation" aria-label={showNewPw ? "Hide" : "Show"}><Eye className="w-4 h-4" /></button>
								</div>
							</div>
							<button onClick={changePassword} disabled={!currentPw || !newPw} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-40 cursor-pointer">
								<Shield className="w-3.5 h-3.5" /> Update Password
							</button>
						</div>
					</div>

					{/* Notifications */}
					<div className="dashboard-card p-5 sm:p-6 rounded-2xl mb-4 sm:mb-6">
						<div className="flex items-center gap-3 mb-6">
							<div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20"><Bell className="w-4 h-4 text-emerald-500" /></div>
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
									<button onClick={() => toggleNotif(item.key)} className={`relative w-11 h-6 rounded-full transition-all cursor-pointer ${notifications[item.key] ? "bg-primary" : "bg-[var(--dashboard-nav-hover)] border border-[var(--dashboard-border)]"}`}>
										<span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications[item.key] ? "translate-x-5" : "translate-x-0"}`} />
									</button>
								</div>
							))}
						</div>
					</div>

					{/* Danger zone */}
					<div className="dashboard-card p-5 sm:p-6 rounded-2xl border-red-500/20">
						<div className="flex items-center gap-3 mb-4">
							<div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20"><Trash2 className="w-4 h-4 text-red-500" /></div>
							<div>
								<h2 className="text-sm font-bold text-red-500">Danger Zone</h2>
								<p className="text-[11px] text-[var(--dashboard-text-muted)]">Irreversible actions</p>
							</div>
						</div>
						{!showDelete ? (
							<button onClick={() => setShowDelete(true)} className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-500 text-xs font-semibold hover:bg-red-500/5 transition-all cursor-pointer touch-manipulation">Delete Account</button>
						) : (
							<div className="space-y-3">
								<p className="text-xs text-[var(--dashboard-text-secondary)]">This will terminate your session and require support intervention for permanent deletion. This action cannot be undone.</p>
								<div className="flex gap-2">
									<button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--dashboard-border)] text-xs font-medium text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] transition-all cursor-pointer touch-manipulation">Cancel</button>
									<button onClick={deleteAccount} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-500 text-foreground text-xs font-semibold hover:bg-red-600 transition-all cursor-pointer touch-manipulation">{deleting ? "Terminating..." : "Yes, Terminate Session"}</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
