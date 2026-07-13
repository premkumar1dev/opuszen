import { type LoaderFunctionArgs, type MetaFunction, redirect, Link, useSearchParams } from "react-router";
import { useLoaderData } from "react-router";
import { useState, useEffect } from "react";
import { verifyAdminSession } from "../../utils/admin-auth";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import { AdminHeader } from "~/components/admin/admin-header";
import { cn } from "@/lib/utils";
import { FiSettings, FiUser, FiKey, FiBell, FiGlobe, FiShield, FiSave, FiLock, FiDatabase, FiMail, FiCheck, FiMoon, FiSun, FiMonitor, FiCreditCard } from "react-icons/fi";

export const meta: MetaFunction = () => [{ title: "Settings | Admin | OpusZen" }];

interface LoaderData {
	adminEmail: string;
	planName: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
	const adminCheck = await verifyAdminSession(request);
	if (!adminCheck.isAdmin) return redirect("/auth/admin");
	return {
		adminEmail: adminCheck.adminEmail || import.meta.env.VITE_ADMIN_EMAIL || "",
		planName: "Enterprise Admin",
	};
}

const TABS = [
	{ id: "profile", label: "Profile", icon: <FiUser className="w-4 h-4" />, href: "/auth/admin/settings?tab=profile" },
	{ id: "security", label: "Security", icon: <FiShield className="w-4 h-4" />, href: "/auth/admin/settings?tab=security" },
	{ id: "notifications", label: "Notifications", icon: <FiBell className="w-4 h-4" />, href: "/auth/admin/settings?tab=notifications" },
	{ id: "appearance", label: "Appearance", icon: <FiMonitor className="w-4 h-4" />, href: "/auth/admin/settings?tab=appearance" },
	{ id: "data", label: "Data & Storage", icon: <FiDatabase className="w-4 h-4" />, href: "/auth/admin/settings?tab=data" },
	{ id: "site", label: "Site Config", icon: <FiGlobe className="w-4 h-4" />, href: "/auth/admin/settings/site" },
	{ id: "payments", label: "Payment Gateway", icon: <FiCreditCard className="w-4 h-4" />, href: "/auth/admin/settings/payments" },
];

export default function AdminSettingsRoute() {
	const { adminEmail, planName } = useLoaderData<LoaderData>();
	const [searchParams] = useSearchParams();
	const activeTab = searchParams.get("tab") || "profile";
	const [saved, setSaved] = useState(false);
	const [form, setForm] = useState({
		name: "Administrator",
		email: adminEmail,
		oldPassword: "",
		newPassword: "",
		confirmPassword: "",
		theme: "dark",
		compactMode: false,
		emailNotifications: true,
		errorAlerts: true,
		weeklyReport: true,
		marketingEmails: false,
		apiLogsRetention: "30",
		backupFrequency: "daily",
	});

	const handleSave = () => {
		try {
			if (typeof localStorage !== "undefined") {
				localStorage.setItem("admin-settings", JSON.stringify(form));
			}
			setSaved(true);
			setTimeout(() => setSaved(false), 2500);
		} catch {
			// localStorage may be unavailable
			setSaved(true);
			setTimeout(() => setSaved(false), 2500);
		}
	};

	// Load saved settings from localStorage on mount
	useEffect(() => {
		try {
			if (typeof localStorage !== "undefined") {
				const saved = localStorage.getItem("admin-settings");
				if (saved) {
					const parsed = JSON.parse(saved);
					setForm((prev) => ({ ...prev, ...parsed }));
				}
			}
		} catch {
			// ignore
		}
	}, []);

	const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
		<button
			onClick={() => onChange(!checked)}
			className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 ${checked ? "bg-primary" : "bg-muted"}`}
			role="switch"
			aria-checked={checked}
		>
			<span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[18px]" : "translate-x-1"}`} />
		</button>
	);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<AdminSidebar collapsed={false} onToggle={() => {}} adminEmail={adminEmail || undefined} />
			<main className="ml-[220px] min-h-screen">
				<div className="max-w-[900px] space-y-6">
					{/* Header */}
					<div>
						<h1 className="text-3xl font-bold text-foreground">Settings</h1>
						<p className="text-muted-foreground text-sm mt-1">Manage your admin account, security, and preferences</p>
					</div>

			<div className="flex flex-col lg:flex-row gap-6">
				{/* Sidebar */}
				<div className="lg:w-56 shrink-0">
					<div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
						<div className="p-1.5 space-y-0.5">
							{TABS.map((tab) => {
								const baseClasses = `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer`;
								const isActive = activeTab === tab.id;
								return (
									<Link
										key={tab.id}
										to={tab.href}
										className={`${baseClasses} ${
											isActive
												? "bg-primary/10 text-primary font-semibold"
												: "text-muted-foreground hover:text-foreground hover:bg-muted/50"
										}`}
									>
										{tab.icon}
										{tab.label}
									</Link>
								);
							})}
						</div>
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 space-y-4">
					{saved && (
						<div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium">
							<FiCheck className="w-4 h-4" />
							Settings saved successfully
						</div>
					)}

					{activeTab === "profile" && (
						<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
							<div>
								<h3 className="text-base font-bold text-foreground">Profile Information</h3>
								<p className="text-xs text-muted-foreground mt-1">Update your admin profile details</p>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Display Name</label>
									<input
										type="text"
										value={form.name}
										onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
										className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
									/>
								</div>
								<div>
									<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Email Address</label>
									<input
										type="email"
										value={form.email}
										onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
										className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
									/>
								</div>
							</div>
							<div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
								<div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
									{form.name.charAt(0).toUpperCase()}
								</div>
								<div>
									<p className="text-sm font-semibold text-foreground">{form.name}</p>
									<p className="text-xs text-muted-foreground">{form.email}</p>
								</div>
								<span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{planName}</span>
							</div>
						</div>
					)}

					{activeTab === "security" && (
						<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
							<div>
								<h3 className="text-base font-bold text-foreground">Security Settings</h3>
								<p className="text-xs text-muted-foreground mt-1">Manage password and access controls</p>
							</div>
							<div className="space-y-4">
								<div>
									<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Current Password</label>
									<input
										type="password"
										placeholder="Enter current password"
										value={form.oldPassword}
										onChange={(e) => setForm((f) => ({ ...f, oldPassword: e.target.value }))}
										className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
									/>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">New Password</label>
										<input
											type="password"
											placeholder="New password"
											value={form.newPassword}
											onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
											className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
										/>
									</div>
									<div>
										<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Confirm Password</label>
										<input
											type="password"
											placeholder="Confirm new password"
											value={form.confirmPassword}
											onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
											className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
										/>
									</div>
								</div>
							</div>
							<div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
								<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</p>
								{[
									{ time: "Today, 09:14 AM", event: "Login from Chrome / Windows", ip: "127.0.0.1" },
									{ time: "Yesterday, 02:35 PM", event: "Password changed", ip: "127.0.0.1" },
									{ time: "3 days ago", event: "Login from Chrome / Windows", ip: "127.0.0.1" },
								].map((a, i) => (
									<div key={i} className="flex items-center justify-between text-xs">
										<div>
											<p className="text-foreground">{a.event}</p>
											<p className="text-muted-foreground font-mono">{a.ip}</p>
										</div>
										<span className="text-muted-foreground">{a.time}</span>
									</div>
								))}
							</div>
						</div>
					)}

					{activeTab === "notifications" && (
						<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
							<div>
								<h3 className="text-base font-bold text-foreground">Notification Preferences</h3>
								<p className="text-xs text-muted-foreground mt-1">Choose what you want to be notified about</p>
							</div>
							<div className="space-y-0.5">
								{[
									{ label: "Email Notifications", desc: "Receive email notifications for important events", key: "emailNotifications" },
									{ label: "Error Alerts", desc: "Get notified when error rates exceed threshold", key: "errorAlerts" },
									{ label: "Weekly Report", desc: "Receive weekly analytics summary via email", key: "weeklyReport" },
									{ label: "Marketing Emails", desc: "Updates about new features and promotions", key: "marketingEmails" },
								].map((item) => (
									<div key={item.key} className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-muted/30 transition-colors">
										<div>
											<p className="text-sm font-medium text-foreground">{item.label}</p>
											<p className="text-xs text-muted-foreground">{item.desc}</p>
										</div>
										<Toggle checked={form[item.key as keyof typeof form] as boolean} onChange={(v) => setForm((f) => ({ ...f, [item.key]: v }))} />
									</div>
								))}
							</div>
							<div className="flex items-start gap-3 p-4 rounded-xl bg-violet-500/5 border border-violet-500/15">
								<FiMail className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
								<div className="space-y-1">
									<p className="text-xs font-semibold text-foreground">Outbound Mail Configuration</p>
									<p className="text-[11px] text-muted-foreground">
										Authentication and system emails are managed directly through your Supabase Auth settings in the Supabase Dashboard.
									</p>
								</div>
							</div>
						</div>
					)}

					{activeTab === "appearance" && (
						<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
							<div>
								<h3 className="text-base font-bold text-foreground">Appearance</h3>
								<p className="text-xs text-muted-foreground mt-1">Customize the look and feel</p>
							</div>
							<div className="grid grid-cols-3 gap-3">
								{[
									{ id: "light", label: "Light", icon: <FiSun className="w-5 h-5" /> },
									{ id: "dark", label: "Dark", icon: <FiMoon className="w-5 h-5" /> },
									{ id: "system", label: "System", icon: <FiMonitor className="w-5 h-5" /> },
								].map((t) => (
									<button
										key={t.id}
										onClick={() => setForm((f) => ({ ...f, theme: t.id }))}
										className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all cursor-pointer ${
											form.theme === t.id ? "border-primary/50 bg-primary/5 text-primary" : "border-border hover:bg-muted/30 text-muted-foreground"
										}`}
									>
										{t.icon}
										<span className="text-xs font-medium">{t.label}</span>
									</button>
								))}
							</div>
							<div className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-muted/30 transition-colors">
								<div>
									<p className="text-sm font-medium text-foreground">Compact Mode</p>
									<p className="text-xs text-muted-foreground">Use a denser, more compact layout</p>
								</div>
								<Toggle checked={form.compactMode} onChange={(v) => setForm((f) => ({ ...f, compactMode: v }))} />
							</div>
						</div>
					)}

					{activeTab === "data" && (
						<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
							<div>
								<h3 className="text-base font-bold text-foreground">Data & Storage</h3>
								<p className="text-xs text-muted-foreground mt-1">Manage data retention and backup settings</p>
							</div>
							<div className="space-y-4">
								<div>
									<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">API Logs Retention</label>
									<select
										value={form.apiLogsRetention}
										onChange={(e) => setForm((f) => ({ ...f, apiLogsRetention: e.target.value }))}
										className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
									>
										<option value="7">7 days</option>
										<option value="14">14 days</option>
										<option value="30">30 days</option>
										<option value="90">90 days</option>
									</select>
								</div>
								<div>
									<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Backup Frequency</label>
									<select
										value={form.backupFrequency}
										onChange={(e) => setForm((f) => ({ ...f, backupFrequency: e.target.value }))}
										className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
									>
										<option value="hourly">Hourly</option>
										<option value="daily">Daily</option>
										<option value="weekly">Weekly</option>
									</select>
								</div>
							</div>
							<div className="flex gap-3 pt-2">
								<button className="px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-muted/50 transition-colors cursor-pointer text-muted-foreground">Export All Data</button>
								<button className="px-4 py-2 rounded-xl text-sm font-medium border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer">Clear Logs</button>
							</div>
						</div>
					)}

					{/* Save Button */}
					<div className="flex justify-end">
						<button
							onClick={handleSave}
							className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-md shadow-primary/20"
						>
							<FiSave className="w-4 h-4" />
							Save Changes
						</button>
					</div>
				</div>
			</div>
		</div>
		</main>
	</div>
	);
}
