import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
	Link,
	useLocation,
} from "react-router";
import { useLoaderData, useActionData, useNavigation, Form, data } from "react-router";
import { useState, useEffect, useMemo } from "react";
import { verifyAdminSession } from "~/utils/admin-auth";
import { requireAdmin } from "~/utils/admin-actions";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import { securityHeaders } from "~/utils/security-headers";
import {
	getAllSocialLinks,
	upsertSocialLink,
	deleteSocialLink,
	toggleSocialLinkVisibility,
	reorderSocialLinks,
} from "~/utils/seo-service.server";
import type { SocialLink } from "~/types/seo";
import {
	Send,
	MessageCircle,
	Mail,
	Globe,
	Plus,
	Trash2,
	Save,
	RefreshCw,
	Check,
	AlertTriangle,
	Eye,
	EyeOff,
	MoveVertical,
	Share2,
} from "lucide-react";
import {
	XIcon,
	GithubIcon,
	LinkedinIcon,
	FacebookIcon,
	InstagramIcon,
	YoutubeIcon,
	DiscordIcon,
	TelegramIcon,
	WhatsappIcon,
} from "~/components/SocialIcons";

export const meta: MetaFunction = () => [
	{ title: "Social Media Links | Admin | OpusZen" },
];

const PLATFORMS = [
	{ value: "x", label: "X / Twitter", icon: XIcon },
	{ value: "facebook", label: "Facebook", icon: FacebookIcon },
	{ value: "linkedin", label: "LinkedIn", icon: LinkedinIcon },
	{ value: "github", label: "GitHub", icon: GithubIcon },
	{ value: "instagram", label: "Instagram", icon: InstagramIcon },
	{ value: "youtube", label: "YouTube", icon: YoutubeIcon },
	{ value: "discord", label: "Discord", icon: DiscordIcon },
	{ value: "telegram", label: "Telegram", icon: TelegramIcon },
	{ value: "whatsapp", label: "WhatsApp", icon: WhatsappIcon },
	{ value: "email", label: "Email", icon: Mail },
	{ value: "website", label: "Website / Custom", icon: Globe },
];

interface LoaderData {
	adminEmail: string;
	links: SocialLink[];
}

interface ActionData {
	success?: boolean;
	error?: string;
	links?: SocialLink[];
}

export async function loader({ request }: LoaderFunctionArgs) {
	const headers = securityHeaders();
	const adminCheck = await verifyAdminSession(request);
	if (!adminCheck.isAdmin) throw redirect("/auth/admin");

	const links = await getAllSocialLinks();
	return data({ adminEmail: adminCheck.adminEmail || "", links }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
	const headers = securityHeaders();
	await requireAdmin(request);

	const formData = await request.formData();
	const intent = formData.get("intent") as string;

	if (intent === "upsert") {
		const result = await upsertSocialLink({
			id: formData.get("id") as string | undefined,
			platform: formData.get("platform") as string,
			url: (formData.get("url") as string)?.trim() || "",
			label: (formData.get("label") as string)?.trim() || "",
			visible: formData.get("visible") === "on" || formData.get("visible") === "true",
			sort_order: parseInt(formData.get("sort_order") as string || "0", 10) || 0,
		});

		if (!result.success) {
			return data({ success: false, error: result.error }, { headers });
		}

		const links = await getAllSocialLinks();
		return data({ success: true, links }, { headers });
	}

	if (intent === "delete") {
		const result = await deleteSocialLink(formData.get("id") as string);
		if (!result.success) {
			return data({ success: false, error: result.error }, { headers });
		}
		const links = await getAllSocialLinks();
		return data({ success: true, links }, { headers });
	}

	if (intent === "toggle") {
		const result = await toggleSocialLinkVisibility(
			formData.get("id") as string,
			formData.get("visible") === "true"
		);
		if (!result.success) {
			return data({ success: false, error: result.error }, { headers });
		}
		const links = await getAllSocialLinks();
		return data({ success: true, links }, { headers });
	}

	if (intent === "reorder") {
		const orderedIds = JSON.parse(formData.get("orderedIds") as string) as string[];
		const result = await reorderSocialLinks(orderedIds);
		if (!result.success) {
			return data({ success: false, error: result.error }, { headers });
		}
		const links = await getAllSocialLinks();
		return data({ success: true, links }, { headers });
	}

	return data({ error: "Unknown action" }, { headers });
}

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
	const Comp = PLATFORMS.find((p) => p.value === platform)?.icon || Globe;
	return <Comp className={className || "w-5 h-5"} />;
}

export default function AdminSocialLinksRoute() {
	const { adminEmail, links: initialLinks } = useLoaderData<LoaderData>();
	const actionData = useActionData<ActionData>();
	const navigation = useNavigation();
	const location = useLocation();

	const [links, setLinks] = useState<SocialLink[]>(initialLinks);
	const [showForm, setShowForm] = useState(false);
	const [editItem, setEditItem] = useState<SocialLink | null>(null);
	const [form, setForm] = useState({
		id: "",
		platform: "x",
		url: "",
		label: "",
		visible: true,
		sort_order: 0,
	});
	const [saveFlash, setSaveFlash] = useState<"success" | "error" | null>(null);

	useEffect(() => {
		if (actionData?.links) {
			setLinks(actionData.links);
		}
		if (actionData?.success) {
			setSaveFlash("success");
			setShowForm(false);
			setEditItem(null);
			setForm({ id: "", platform: "x", url: "", label: "", visible: true, sort_order: 0 });
			const t = setTimeout(() => setSaveFlash(null), 3000);
			return () => clearTimeout(t);
		}
		if (actionData?.error) {
			setSaveFlash("error");
			const t = setTimeout(() => setSaveFlash(null), 4000);
			return () => clearTimeout(t);
		}
	}, [actionData]);

	useEffect(() => {
		setShowForm(false);
		setEditItem(null);
	}, [location.pathname]);

	const isSubmitting = navigation.state === "submitting";

	const handleEdit = (link: SocialLink) => {
		setEditItem(link);
		setForm({
			id: link.id || "",
			platform: link.platform,
			url: link.url,
			label: link.label || "",
			visible: link.visible,
			sort_order: link.sort_order,
		});
		setShowForm(true);
	};

	const handleNew = () => {
		setEditItem(null);
		const maxSort = links.reduce((max, l) => Math.max(max, l.sort_order), 0);
		setForm({
			id: "",
			platform: "x",
			url: "",
			label: "",
			visible: true,
			sort_order: maxSort + 1,
		});
		setShowForm(true);
	};

	return (
		<div className="min-h-screen bg-background text-foreground">
			<AdminSidebar
				collapsed={false}
				onToggle={() => {}}
				adminEmail={adminEmail || undefined}
				mobileOpen={false}
				onMobileToggle={() => {}}
			/>
			<main className="min-h-screen md:ml-[220px]">
				{/* Mobile header */}
				<div className="sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b border-border/60 bg-background/95 backdrop-blur md:hidden">
					<Link
						to="/auth/admin/settings"
						className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</Link>
					<span className="text-sm font-semibold">Social Links</span>
				</div>

				<div className="max-w-[1020px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div>
							<div className="flex items-center gap-2 mb-1">
								<Link to="/auth/admin/settings" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
									Settings
								</Link>
								<span className="text-muted-foreground text-xs">/</span>
								<span className="text-xs text-foreground font-medium">Social Media Links</span>
							</div>
							<h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-rose-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/20 text-white">
									<Share2 className="w-5 h-5" />
								</div>
								Social Media Links
							</h1>
							<p className="text-muted-foreground text-sm mt-1">
								Manage social media profile links displayed across the site (footer, contact section)
							</p>
						</div>

						<button
							type="button"
							onClick={handleNew}
							className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-md shadow-primary/20"
						>
							<Plus className="w-4 h-4" />
							Add Social Link
						</button>
					</div>

					{/* Toast notifications */}
					{saveFlash === "success" && (
						<div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
							<Check className="w-4 h-4 shrink-0" />
							Social links saved successfully!
						</div>
					)}
					{saveFlash === "error" && (
						<div className="flex items-center gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
							<AlertTriangle className="w-4 h-4 shrink-0" />
							{actionData?.error || "Failed to save."}
						</div>
					)}

					{/* Add/Edit Form */}
					{showForm && (
						<div className="rounded-2xl border border-primary/30 bg-card/60 p-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
							<div className="flex items-center justify-between">
								<h3 className="text-base font-bold text-foreground">
									{editItem ? "Edit Social Link" : "Add New Social Link"}
								</h3>
								<button
									type="button"
									onClick={() => { setShowForm(false); setEditItem(null); }}
									className="text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
								>
									Cancel
								</button>
							</div>

							<Form method="post" className="space-y-4">
								<input type="hidden" name="intent" value="upsert" />
								{form.id && <input type="hidden" name="id" value={form.id} />}

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
											Platform
										</label>
										<select
											name="platform"
											value={form.platform}
											onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
											className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer"
										>
											{PLATFORMS.map((p) => (
												<option key={p.value} value={p.value}>{p.label}</option>
											))}
										</select>
									</div>

									<div>
										<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
											Profile URL
										</label>
										<input
											type="url"
											name="url"
											value={form.url}
											onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
											placeholder="https://..."
											className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
											required
										/>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
											Display Label (optional)
										</label>
										<input
											type="text"
											name="label"
											value={form.label}
											onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
											placeholder="e.g. @OpusZenAI"
											className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
										/>
									</div>

									<div>
										<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
											Sort Order
										</label>
										<input
											type="number"
											name="sort_order"
											value={form.sort_order}
											onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
											className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
										/>
									</div>
								</div>

								<div className="flex items-center gap-3">
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											name="visible"
											checked={form.visible}
											onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))}
											className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
										/>
										<span className="text-sm text-foreground">Visible on site</span>
									</label>
								</div>

								<div className="flex items-center gap-3 pt-2">
									<button
										type="submit"
										disabled={isSubmitting}
										className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
									>
										{isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
										{editItem ? "Update Link" : "Add Link"}
									</button>
									<button
										type="button"
										onClick={() => { setShowForm(false); setEditItem(null); }}
										className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
									>
										Cancel
									</button>
								</div>
							</Form>
						</div>
					)}

					{/* Social Links Table */}
					<div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
						<div className="p-4 border-b border-border/50 flex items-center justify-between">
							<h3 className="text-sm font-semibold text-foreground">
								Configured Links ({links.length})
							</h3>
							<span className="text-xs text-muted-foreground">
								Visible: {links.filter((l) => l.visible).length} | Hidden: {links.filter((l) => !l.visible).length}
							</span>
						</div>

						{links.length === 0 ? (
							<div className="p-10 text-center">
								<Globe className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
								<p className="text-sm text-muted-foreground">No social links configured yet.</p>
								<p className="text-xs text-muted-foreground/70 mt-1">Click "Add Social Link" to get started.</p>
							</div>
						) : (
							<div className="divide-y divide-border/40">
								{links.map((link) => {
									const platformInfo = PLATFORMS.find((p) => p.value === link.platform);
									const IconComp = platformInfo?.icon || Globe;
									return (
										<div
											key={link.id}
											className={`flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors ${!link.visible ? "opacity-50" : ""}`}
										>
											<div className="shrink-0 w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
												<IconComp className="w-5 h-5 text-muted-foreground" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium text-foreground truncate">
													{platformInfo?.label || link.platform}
												</p>
												<p className="text-xs text-muted-foreground truncate font-mono">{link.url}</p>
											</div>
											{link.label && (
												<span className="text-xs text-muted-foreground hidden sm:inline">{link.label}</span>
											)}
											<span className="text-[10px] font-mono text-muted-foreground">#{link.sort_order}</span>
											<span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${
												link.visible
													? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
													: "bg-muted text-muted-foreground border border-border"
											}`}>
												{link.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
												{link.visible ? "Visible" : "Hidden"}
											</span>

											<div className="flex items-center gap-1">
												<Form method="post" className="inline">
													<input type="hidden" name="intent" value="toggle" />
													<input type="hidden" name="id" value={link.id} />
													<input type="hidden" name="visible" value={String(!link.visible)} />
													<button
														type="submit"
														className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
														title={link.visible ? "Hide" : "Show"}
													>
														{link.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
													</button>
												</Form>
												<button
													type="button"
													onClick={() => handleEdit(link)}
													className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
													title="Edit"
												>
													<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
														<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
														<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
													</svg>
												</button>
												<Form method="post" className="inline" onSubmit={(e) => {
													if (!confirm(`Delete this social link?`)) e.preventDefault();
												}}>
													<input type="hidden" name="intent" value="delete" />
													<input type="hidden" name="id" value={link.id} />
													<button
														type="submit"
														className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all cursor-pointer"
														title="Delete"
													>
														<Trash2 className="w-4 h-4" />
													</button>
												</Form>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
