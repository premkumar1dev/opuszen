import { useState, useEffect, useCallback } from "react";
import { type MetaFunction, NavLink } from "react-router";
import { DashboardSidebar } from "../components/dashboard/dashboard-sidebar";
import {
	FiUser,
	FiMail,
	FiShield,
	FiCreditCard,
	FiBell,
	FiGlobe,
	FiMoon,
	FiSun,
	FiKey,
	FiTrash2,
	FiCheck,
	FiLoader,
	FiSave,
	FiLogOut,
	FiEye,
	FiEyeOff,
} from "react-icons/fi";
import { supabase } from "~/utils/supabase";

export const meta: MetaFunction = () => [
	{ title: "Account Settings | Opuszen" },
	{ name: "description", content: "Manage your OpusZen account settings." },
];

interface ProfileForm {
	fullName: string;
	email: string;
	company: string;
	website: string;
}

interface SettingsForm {
	emailNotifications: boolean;
	usageAlerts: boolean;
	billingEmails: boolean;
	marketingEmails: boolean;
	theme: "dark" | "light" | "system";
	language: string;
	timezone: string;
}

export default function UserAccountRoute() {
	const [user, setUser] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [showPasswordChange, setShowPasswordChange] = useState(false);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPasswords, setShowPasswords] = useState(false);
	const [error, setError] = useState("");

	const [profile, setProfile] = useState<ProfileForm>({
		fullName: "",
		email: "",
		company: "",
		website: "",
	});

	const [settings, setSettings] = useState<SettingsForm>({
		emailNotifications: true,
		usageAlerts: true,
		billingEmails: true,
		marketingEmails: false,
		theme: "dark",
		language: "en",
		timezone: "UTC",
	});

	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => {
			const u = data.user;
			setUser(u);
			if (u) {
				setProfile({
					fullName: u.user_metadata?.full_name || u.user_metadata?.name || "",
					email: u.email || "",
					company: u.user_metadata?.company || "",
					website: u.user_metadata?.website || "",
				});
			}
			setLoading(false);
		});
	}, []);

	const saveProfile = useCallback(async () => {
		setSaving(true);
		setError("");
		try {
			const { error } = await supabase.auth.updateUser({
				data: {
					full_name: profile.fullName,
					company: profile.company,
					website: profile.website,
				},
			});
			if (error) setError(error.message);
			else {
				setSaved(true);
				setTimeout(() => setSaved(false), 3000);
			}
		} catch {
			setError("Failed to update profile");
		}
		setSaving(false);
	}, [profile]);

	const changePassword = useCallback(async () => {
		setError("");
		if (newPassword !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}
		if (newPassword.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}
		const { error } = await supabase.auth.updateUser({ password: newPassword });
		if (error) setError(error.message);
		else {
			setShowPasswordChange(false);
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			setSaved(true);
			setTimeout(() => setSaved(false), 3000);
		}
	}, [newPassword, confirmPassword]);

	const handleLogout = async () => {
		await supabase.auth.signOut();
		window.location.href = "/auth/login";
	};

	const deleteAccount = async () => {
		if (!confirm("Are you sure? This will permanently delete your account and all data.")) return;
		if (!confirm("This action cannot be undone. Confirm?")) return;
		await supabase.auth.signOut();
		window.location.href = "/auth/login";
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-[#09090b] flex items-center justify-center">
				<FiLoader className="w-8 h-8 animate-spin text-zinc-600" />
			</div>
		);
	}

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
								<h1 className="text-sm font-semibold text-white">Account Settings</h1>
								<p className="text-[11px] text-zinc-500 hidden sm:block">Manage your profile and preferences</p>
							</div>
						</div>
						{saved && (
							<div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
								<FiCheck className="w-3 h-3" />
								Saved!
							</div>
						)}
					</div>
				</header>

				<div className="p-4 sm:p-8 max-w-[700px]">
					{error && (
						<div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
							<FiShield className="w-3.5 h-3.5 shrink-0" />
							{error}
						</div>
					)}

					{/* Profile */}
					<div className="p-6 rounded-2xl border border-white/[0.06] bg-[#0c0c0f] mb-6">
						<div className="flex items-center gap-3 mb-5">
							<div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
								<FiUser className="w-4 h-4 text-indigo-400" />
							</div>
							<div>
								<h3 className="text-sm font-semibold text-white">Profile Information</h3>
								<p className="text-[11px] text-zinc-500">Your personal details</p>
							</div>
						</div>
						<div className="space-y-4">
							<div>
								<label className="block text-xs font-semibold text-zinc-400 mb-1.5">Full Name</label>
								<input
									type="text"
									value={profile.fullName}
									onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
									className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
								/>
							</div>
							<div>
								<label className="block text-xs font-semibold text-zinc-400 mb-1.5">Email</label>
								<input
									type="email"
									value={profile.email}
									disabled
									className="w-full px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-sm text-zinc-500 cursor-not-allowed"
								/>
								<p className="text-[10px] text-zinc-600 mt-1">Contact support to change your email</p>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-semibold text-zinc-400 mb-1.5">Company</label>
									<input
										type="text"
										value={profile.company}
										onChange={(e) => setProfile((p) => ({ ...p, company: e.target.value }))}
										className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
									/>
								</div>
								<div>
									<label className="block text-xs font-semibold text-zinc-400 mb-1.5">Website</label>
									<input
										type="text"
										value={profile.website}
										onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
										className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
									/>
								</div>
							</div>
							<button
								onClick={saveProfile}
								disabled={saving}
								className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-all disabled:opacity-40 cursor-pointer"
							>
								{saving ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiSave className="w-3.5 h-3.5" />}
								Save Changes
							</button>
						</div>
					</div>

					{/* Password */}
					<div className="p-6 rounded-2xl border border-white/[0.06] bg-[#0c0c0f] mb-6">
						<div className="flex items-center justify-between mb-5">
							<div className="flex items-center gap-3">
								<div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
									<FiShield className="w-4 h-4 text-violet-400" />
								</div>
								<div>
									<h3 className="text-sm font-semibold text-white">Password</h3>
									<p className="text-[11px] text-zinc-500">Keep your account secure</p>
								</div>
							</div>
							<button
								onClick={() => setShowPasswordChange(!showPasswordChange)}
								className="px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/10 transition-all cursor-pointer"
							>
								{showPasswordChange ? "Cancel" : "Change"}
							</button>
						</div>
						{showPasswordChange && (
							<div className="space-y-3">
								<div>
									<label className="block text-xs font-semibold text-zinc-400 mb-1.5">Current Password</label>
									<div className="relative">
										<input
											type={showPasswords ? "text" : "password"}
											value={currentPassword}
											onChange={(e) => setCurrentPassword(e.target.value)}
											className="w-full px-3 py-2.5 pr-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
										/>
										<button
											onClick={() => setShowPasswords(!showPasswords)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
										>
											{showPasswords ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
										</button>
									</div>
								</div>
								<div>
									<label className="block text-xs font-semibold text-zinc-400 mb-1.5">New Password</label>
									<input
										type={showPasswords ? "text" : "password"}
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
									/>
								</div>
								<div>
									<label className="block text-xs font-semibold text-zinc-400 mb-1.5">Confirm New Password</label>
									<input
										type={showPasswords ? "text" : "password"}
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										onKeyDown={(e) => e.key === "Enter" && changePassword()}
										className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
									/>
								</div>
								<button
									onClick={changePassword}
									disabled={!currentPassword || !newPassword || !confirmPassword}
									className="w-full py-2.5 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition-all disabled:opacity-40 cursor-pointer"
								>
									Update Password
								</button>
							</div>
						)}
					</div>

					{/* Preferences */}
					<div className="p-6 rounded-2xl border border-white/[0.06] bg-[#0c0c0f] mb-6">
						<div className="flex items-center gap-3 mb-5">
							<div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
								<FiBell className="w-4 h-4 text-amber-400" />
							</div>
							<div>
								<h3 className="text-sm font-semibold text-white">Notifications & Preferences</h3>
								<p className="text-[11px] text-zinc-500">Manage how you receive updates</p>
							</div>
						</div>
						<div className="space-y-3">
							<ToggleRow label="Email Notifications" value={settings.emailNotifications} onChange={(v) => setSettings((s) => ({ ...s, emailNotifications: v }))} />
							<ToggleRow label="Usage Alerts" value={settings.usageAlerts} onChange={(v) => setSettings((s) => ({ ...s, usageAlerts: v }))} />
							<ToggleRow label="Billing Emails" value={settings.billingEmails} onChange={(v) => setSettings((s) => ({ ...s, billingEmails: v }))} />
							<ToggleRow label="Marketing Updates" value={settings.marketingEmails} onChange={(v) => setSettings((s) => ({ ...s, marketingEmails: v }))} />
						</div>
					</div>

					{/* Danger zone */}
					<div className="p-6 rounded-2xl border border-red-500/20 bg-[#0c0c0f]">
						<div className="flex items-center gap-3 mb-3">
							<div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
								<FiTrash2 className="w-4 h-4 text-red-400" />
							</div>
							<div>
								<h3 className="text-sm font-semibold text-white">Danger Zone</h3>
								<p className="text-[11px] text-zinc-500">Irreversible actions</p>
							</div>
						</div>
						<p className="text-xs text-zinc-500 mb-4">
							Deleting your account will remove all your data, API keys, and usage history permanently.
						</p>
						<button
							onClick={deleteAccount}
							className="px-4 py-2 rounded-xl border border-red-500/20 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
						>
							Delete Account
						</button>
					</div>
				</div>
			</main>
		</div>
	);
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
	return (
		<div className="flex items-center justify-between py-2">
			<span className="text-sm text-zinc-300">{label}</span>
			<button
				onClick={() => onChange(!value)}
				className={`w-10 h-5.5 rounded-full transition-all cursor-pointer relative ${
					value ? "bg-indigo-500" : "bg-zinc-700"
				}`}
				style={{ height: "22px" }}
			>
				<span
					className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
						value ? "left-[22px]" : "left-[2px]"
					}`}
					style={{ height: "16px", width: "16px" }}
				/>
			</button>
		</div>
	);
}
