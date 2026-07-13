import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
	Link,
} from "react-router";
import { useLoaderData, useActionData, useNavigation, Form } from "react-router";
import { useState, useEffect, useRef } from "react";
import { verifyAdminSession } from "../../utils/admin-auth";
import { supabase } from "../../utils/supabase";
import { AdminHeader } from "~/components/admin/admin-header";
import {
	FiGlobe,
	FiSave,
	FiCheck,
	FiAlertCircle,
	FiRefreshCw,
	FiImage,
	FiTrash2,
	FiType,
	FiMonitor,
	FiInfo,
	FiEye,
	FiUser,
	FiShield,
	FiBell,
	FiDatabase,
	FiMail,
	FiCreditCard,
} from "react-icons/fi";

const TABS = [
	{ id: "profile", label: "Profile", icon: <FiUser className="w-4 h-4" />, href: "/auth/admin/settings?tab=profile" },
	{ id: "security", label: "Security", icon: <FiShield className="w-4 h-4" />, href: "/auth/admin/settings?tab=security" },
	{ id: "notifications", label: "Notifications", icon: <FiBell className="w-4 h-4" />, href: "/auth/admin/settings?tab=notifications" },
	{ id: "appearance", label: "Appearance", icon: <FiMonitor className="w-4 h-4" />, href: "/auth/admin/settings?tab=appearance" },
	{ id: "data", label: "Data & Storage", icon: <FiDatabase className="w-4 h-4" />, href: "/auth/admin/settings?tab=data" },
	{ id: "site", label: "Site Config", icon: <FiGlobe className="w-4 h-4" />, href: "/auth/admin/settings/site" },
	{ id: "payments", label: "Payment Gateway", icon: <FiCreditCard className="w-4 h-4" />, href: "/auth/admin/settings/payments" },
];

export const meta: MetaFunction = () => [
	{ title: "Site Configuration | Admin | OpusZen" },
];

interface SiteConfig {
	id: string;
	site_name: string;
	logo_url: string;
	favicon_url: string;
	updated_at: string;
}

interface LoaderData {
	adminEmail: string;
	config: SiteConfig | null;
	error?: string;
}

interface ActionData {
	success?: boolean;
	error?: string;
	config?: SiteConfig;
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
	const adminCheck = await verifyAdminSession(request);
	if (!adminCheck.isAdmin) throw redirect("/auth/admin");

	try {
		const { data, error } = await (supabase as any)
			.from("site_config")
			.select("*")
			.limit(1)
			.maybeSingle() as { data: SiteConfig | null; error: any };

		if (error) {
			return { adminEmail: adminCheck.adminEmail || "", config: null, error: error.message };
		}

		return { adminEmail: adminCheck.adminEmail || "", config: data as SiteConfig | null };
	} catch (err: any) {
		return {
			adminEmail: adminCheck.adminEmail || "",
			config: null,
			error: err?.message || "Failed to load site configuration",
		};
	}
}

export async function action({ request }: ActionFunctionArgs): Promise<ActionData> {
	const adminCheck = await verifyAdminSession(request);
	if (!adminCheck.isAdmin) throw redirect("/auth/admin");

	const formData = await request.formData();
	const intent = formData.get("intent") as string;

	if (intent === "save") {
		const updates = {
			site_name: (formData.get("site_name") as string)?.trim(),
			logo_url: (formData.get("logo_url") as string)?.trim(),
			favicon_url: (formData.get("favicon_url") as string)?.trim(),
			updated_at: new Date().toISOString(),
		};

		try {
			const { data: existing } = await (supabase as any)
				.from("site_config")
				.select("id")
				.limit(1)
				.maybeSingle() as { data: { id: string } | null };

			let result: { data: any; error: any };
			if (existing?.id) {
				result = await (supabase as any)
					.from("site_config")
					.update(updates)
					.eq("id", existing.id)
					.select()
					.single();
			} else {
				result = await (supabase as any)
					.from("site_config")
					.insert(updates)
					.select()
					.single();
			}

			if (result.error) return { success: false, error: result.error.message };

			return { success: true, config: result.data as SiteConfig };
		} catch (err: any) {
			return { success: false, error: err?.message || "Save failed" };
		}
	}

	return { error: "Unknown action" };
}

// ── Image URL field with live preview ────────────────────────────────────────
function ImageField({
	label,
	sublabel,
	name,
	value,
	onChange,
	previewShape,
	placeholder,
	hint,
}: {
	label: string;
	sublabel: string;
	name: string;
	value: string;
	onChange: (v: string) => void;
	previewShape: "logo" | "favicon";
	placeholder: string;
	hint: string;
}) {
	const [draft, setDraft] = useState(value);
	const [imgError, setImgError] = useState(false);

	useEffect(() => {
		setDraft(value);
		setImgError(false);
	}, [value]);

	const commit = (v: string) => {
		onChange(v.trim());
		setImgError(false);
	};

	const previewSize = previewShape === "favicon" ? "w-12 h-12" : "w-24 h-24";
	const imgSize = previewShape === "favicon" ? "w-7 h-7" : "w-20 h-20";
	const Icon = previewShape === "favicon" ? FiMonitor : FiImage;

	return (
		<div className="space-y-3">
			<div>
				<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
					{label}
				</span>
				{sublabel && (
					<span className="ml-2 text-[10px] text-muted-foreground">{sublabel}</span>
				)}
			</div>

			<div className="flex items-start gap-4">
				{/* Preview */}
				<div
					className={`shrink-0 ${previewSize} flex items-center justify-center border-2 border-dashed border-border/50 bg-muted/20 rounded-xl overflow-hidden`}
				>
					{draft && !imgError ? (
						<img
							src={draft}
							alt={label}
							className={`${imgSize} object-contain`}
							onError={() => setImgError(true)}
						/>
					) : (
						<Icon className="w-5 h-5 text-muted-foreground/30" />
					)}
				</div>

				{/* Input */}
				<div className="flex-1 space-y-2">
					<div className="flex gap-2">
						<div className="relative flex-1">
							<FiGlobe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
							<input
								type="url"
								value={draft}
								onChange={(e) => { setDraft(e.target.value); setImgError(false); }}
								onBlur={() => commit(draft)}
								onKeyDown={(e) => e.key === "Enter" && commit(draft)}
								placeholder={placeholder}
								className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background/50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
							/>
						</div>
						{draft && (
							<button
								type="button"
								onClick={() => { setDraft(""); commit(""); }}
								className="h-10 w-10 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all cursor-pointer shrink-0"
								title="Clear"
							>
								<FiTrash2 className="w-4 h-4" />
							</button>
						)}
					</div>
					{/* Hidden input for form submission */}
					<input type="hidden" name={name} value={draft} />

					<p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
						<FiInfo className="w-3 h-3 shrink-0" />
						{hint}
					</p>

					{imgError && draft && (
						<p className="text-[11px] text-red-400 flex items-center gap-1.5">
							<FiAlertCircle className="w-3 h-3 shrink-0" />
							Cannot load image from this URL — check the address and try again.
						</p>
					)}
				</div>
			</div>
		</div>
	);
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function AdminSettingsSiteRoute() {
	const { adminEmail, config, error: loaderError } = useLoaderData<LoaderData>();
	const actionData = useActionData<ActionData>();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";

	const initial = config ?? { site_name: "OpusZen", logo_url: "", favicon_url: "" };

	const [form, setForm] = useState({
		site_name: initial.site_name,
		logo_url: initial.logo_url,
		favicon_url: initial.favicon_url,
	});

	const [saveFlash, setSaveFlash] = useState<"success" | "error" | null>(null);

	useEffect(() => {
		if (actionData?.success) {
			setSaveFlash("success");
			if (actionData.config) {
				setForm({
					site_name: actionData.config.site_name,
					logo_url: actionData.config.logo_url,
					favicon_url: actionData.config.favicon_url,
				});
			}
			const t = setTimeout(() => setSaveFlash(null), 3000);
			return () => clearTimeout(t);
		}
		if (actionData?.error) {
			setSaveFlash("error");
			const t = setTimeout(() => setSaveFlash(null), 4000);
			return () => clearTimeout(t);
		}
	}, [actionData]);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<AdminHeader adminEmail={adminEmail || undefined} />
			<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="max-w-[900px] space-y-6">

					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div>
							<div className="flex items-center gap-2 mb-1">
								<a href="/auth/admin/settings" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
									Settings
								</a>
								<span className="text-muted-foreground text-xs">/</span>
								<span className="text-xs text-foreground font-medium">Site</span>
							</div>
							<h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
								<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
									<FiGlobe className="w-5 h-5 text-white" />
								</div>
								Site Configuration
							</h1>
							<p className="text-muted-foreground text-sm mt-1 ml-12">
								Manage your site identity — name, logo, and favicon
							</p>
						</div>
						<a
							href="/"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border transition-all"
						>
							<FiEye className="w-4 h-4" />
							Preview Site
						</a>
					</div>

					<div className="flex flex-col lg:flex-row gap-6">
						{/* Sidebar */}
						<div className="lg:w-56 shrink-0">
							<div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
								<div className="p-1.5 space-y-0.5">
									{TABS.map((tab) => {
										const baseClasses = `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer`;
										const isActive = tab.id === "site";
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
							{/* Toast alerts */}
							{saveFlash === "success" && (
								<div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
									<FiCheck className="w-4 h-4 shrink-0" />
									Site configuration saved successfully!
								</div>
							)}
							{saveFlash === "error" && (
								<div className="flex items-center gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
									<FiAlertCircle className="w-4 h-4 shrink-0" />
									{actionData?.error || "Failed to save. Please try again."}
								</div>
							)}
							{loaderError && (
								<div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-medium">
									<FiAlertCircle className="w-4 h-4 shrink-0" />
									Could not load saved config: {loaderError}. Using defaults.
								</div>
							)}

					<Form method="post" className="space-y-5">
						<input type="hidden" name="intent" value="save" />

						{/* ── 1. Site Name ─────────────────────────────────── */}
						<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
									<FiType className="w-4 h-4" />
								</div>
								<div>
									<h3 className="text-base font-bold text-foreground">Site Name</h3>
									<p className="text-xs text-muted-foreground">
										Shown in the browser tab title, emails, and across the UI
									</p>
								</div>
							</div>

							<div>
								<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
									Site Name
								</label>
								<div className="relative">
									<FiType className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
									<input
										type="text"
										name="site_name"
										value={form.site_name}
										onChange={(e) => setForm((f) => ({ ...f, site_name: e.target.value }))}
										placeholder="e.g. OpusZen"
										maxLength={80}
										className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all"
									/>
								</div>
								{form.site_name && (
									<div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/20 border border-border/40 w-fit">
										<span className="text-[10px] text-muted-foreground font-mono">&lt;title&gt;</span>
										<span className="text-xs text-foreground font-medium">{form.site_name} | Page Name</span>
									</div>
								)}
							</div>
						</div>

						{/* ── 2. Logo ──────────────────────────────────────── */}
						<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500">
									<FiImage className="w-4 h-4" />
								</div>
								<div>
									<h3 className="text-base font-bold text-foreground">Logo</h3>
									<p className="text-xs text-muted-foreground">
										Displayed in the header and landing areas — use a transparent PNG or SVG
									</p>
								</div>
							</div>

							<ImageField
								label="Logo URL"
								sublabel="PNG / SVG / WebP · recommended 200×60 px"
								name="logo_url"
								value={form.logo_url}
								onChange={(v) => setForm((f) => ({ ...f, logo_url: v }))}
								previewShape="logo"
								placeholder="https://example.com/logo.png"
								hint="Paste a publicly accessible image URL. Transparent PNG or SVG works best."
							/>

							{/* Header mock */}
							{form.logo_url && (
								<div className="rounded-xl border border-border/50 bg-background/40 p-4">
									<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
										<FiEye className="w-3.5 h-3.5" />
										Header Preview
									</p>
									<div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border/40 bg-card/60 w-fit">
										<img
											src={form.logo_url}
											alt="Logo preview"
											className="h-7 w-auto object-contain"
											onError={(e) => (e.currentTarget.style.display = "none")}
										/>
										<span className="text-sm font-bold text-foreground">
											{form.site_name || "Your Site"}
										</span>
									</div>
								</div>
							)}
						</div>

						{/* ── 3. Favicon ───────────────────────────────────── */}
						<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
									<FiMonitor className="w-4 h-4" />
								</div>
								<div>
									<h3 className="text-base font-bold text-foreground">Favicon</h3>
									<p className="text-xs text-muted-foreground">
										The small icon shown in browser tabs and bookmarks — ICO, PNG, or SVG
									</p>
								</div>
							</div>

							<ImageField
								label="Favicon URL"
								sublabel="ICO / PNG / SVG · recommended 32×32 px"
								name="favicon_url"
								value={form.favicon_url}
								onChange={(v) => setForm((f) => ({ ...f, favicon_url: v }))}
								previewShape="favicon"
								placeholder="https://example.com/favicon.ico"
								hint="Use a square image. Browser tabs update on the next page reload."
							/>

							{/* Browser tab mock */}
							{form.favicon_url && (
								<div className="rounded-xl border border-border/50 bg-background/40 p-4">
									<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
										<FiEye className="w-3.5 h-3.5" />
										Browser Tab Preview
									</p>
									<div className="inline-block">
										<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg border border-b-0 border-border/40 bg-card/60 max-w-[220px]">
											<img
												src={form.favicon_url}
												alt="Favicon preview"
												className="w-4 h-4 object-contain shrink-0"
												onError={(e) => (e.currentTarget.style.display = "none")}
											/>
											<span className="text-xs text-foreground truncate font-medium">
												{form.site_name || "Your Site"}
											</span>
										</div>
										<div className="h-px bg-border/40 w-full" />
									</div>
								</div>
							)}
						</div>

						{/* ── Reference ────────────────────────────────────── */}
						<div className="rounded-2xl border border-border/50 bg-muted/20 p-5 space-y-3">
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
								<FiInfo className="w-3.5 h-3.5" />
								Where these settings are used
							</p>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								{[
									{
										field: "site_name",
										label: "Site Name",
										usages: ["<title> tags", "Email subjects", "Admin panel header"],
									},
									{
										field: "logo_url",
										label: "Logo",
										usages: ["Public header / navbar", "Login page", "Email templates"],
									},
									{
										field: "favicon_url",
										label: "Favicon",
										usages: ["Browser tab icon", "Bookmarks", "Mobile home screen"],
									},
								].map((item) => (
									<div key={item.field} className="flex flex-col gap-1.5 p-3 rounded-xl bg-card/60 border border-border/40">
										<code className="text-[11px] font-mono text-sky-400">{item.field}</code>
										<span className="text-xs font-semibold text-foreground">{item.label}</span>
										<ul className="space-y-0.5 mt-0.5">
											{item.usages.map((u) => (
												<li key={u} className="text-[10px] text-muted-foreground flex items-center gap-1.5">
													<span className="w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
													{u}
												</li>
											))}
										</ul>
									</div>
								))}
							</div>
						</div>

						{/* ── Save button ──────────────────────────────────── */}
						<div className="flex items-center justify-between pt-1">
							{config?.updated_at && (
								<p className="text-[11px] text-muted-foreground">
									Last saved:{" "}
									{new Date(config.updated_at).toLocaleString("en-IN", {
										dateStyle: "medium",
										timeStyle: "short",
									})}
								</p>
							)}
							<button
								type="submit"
								disabled={isSubmitting}
								className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
							>
								{isSubmitting ? (
									<><FiRefreshCw className="w-4 h-4 animate-spin" />Saving…</>
								) : (
									<><FiSave className="w-4 h-4" />Save Configuration</>
								)}
							</button>
						</div>
					</Form>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
