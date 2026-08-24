import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
	Link,
	useLocation,
} from "react-router";
import { useLoaderData, useActionData, useNavigation, Form, data } from "react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { verifyAdminSession } from "~/utils/admin-auth";
import { requireAdmin } from "~/utils/admin-actions";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import { securityHeaders } from "~/utils/security-headers";
import {
	getAllPageMeta,
	upsertPageMeta,
	deletePageMeta,
	getSeoConfig,
} from "~/utils/seo-service.server";
import type { PageMeta, SeoConfig } from "~/types/seo";
import { DEFAULT_USER_PAGES, type UserPageConfig } from "~/utils/meta-helper";
import {
	Globe,
	Search,
	FileText,
	Eye,
	EyeOff,
	Plus,
	Trash2,
	Save,
	RefreshCw,
	Check,
	AlertTriangle,
	Lock,
	Unlock,
	ExternalLink,
	Sparkles,
	Tags,
	Image as ImageIcon,
	Share2,
	Layers,
	CheckCircle2,
	X,
	Sliders,
	ArrowRight,
	HelpCircle,
} from "lucide-react";

export const meta: MetaFunction = () => [
	{ title: "Page Meta & Keywords Editor | Admin | OpusZen" },
];

interface LoaderData {
	adminEmail: string;
	pageMetas: PageMeta[];
	seoConfig: SeoConfig;
}

interface ActionData {
	success?: boolean;
	error?: string;
	pageMetas?: PageMeta[];
}

export async function loader({ request }: LoaderFunctionArgs) {
	const headers = securityHeaders();
	const adminCheck = await verifyAdminSession(request);
	if (!adminCheck.isAdmin) throw redirect("/auth/admin");

	const [pageMetas, seoConfig] = await Promise.all([
		getAllPageMeta(),
		getSeoConfig(),
	]);

	return data({ adminEmail: adminCheck.adminEmail || "", pageMetas, seoConfig }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
	const headers = securityHeaders();
	await requireAdmin(request);

	const formData = await request.formData();
	const intent = formData.get("intent") as string;

	if (intent === "upsert") {
		const result = await upsertPageMeta({
			id: formData.get("id") ? (formData.get("id") as string) : undefined,
			route_path: formData.get("route_path") as string,
			meta_title: (formData.get("meta_title") as string)?.trim() || "",
			meta_description: (formData.get("meta_description") as string)?.trim() || "",
			meta_keywords: (formData.get("meta_keywords") as string)?.trim() || "",
			og_title: (formData.get("og_title") as string)?.trim() || "",
			og_description: (formData.get("og_description") as string)?.trim() || "",
			og_image: (formData.get("og_image") as string)?.trim() || "",
			no_index: formData.get("no_index") === "on",
		});

		if (!result.success) {
			return data({ success: false, error: result.error }, { headers });
		}

		const pageMetas = await getAllPageMeta();
		return data({ success: true, pageMetas }, { headers });
	}

	if (intent === "delete") {
		const result = await deletePageMeta(formData.get("id") as string);
		if (!result.success) {
			return data({ success: false, error: result.error }, { headers });
		}
		const pageMetas = await getAllPageMeta();
		return data({ success: true, pageMetas }, { headers });
	}

	return data({ error: "Unknown action" }, { headers });
}

export default function AdminPageMetaRoute() {
	const { adminEmail, pageMetas: initialPageMetas, seoConfig } = useLoaderData<LoaderData>();
	const actionData = useActionData<ActionData>();
	const navigation = useNavigation();
	const location = useLocation();

	const [pageMetas, setPageMetas] = useState<PageMeta[]>(initialPageMetas);
	const [activePage, setActivePage] = useState<UserPageConfig | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [filterTab, setFilterTab] = useState<"all" | "custom" | "defaults">("all");

	const [form, setForm] = useState({
		id: "",
		route_path: "",
		meta_title: "",
		meta_description: "",
		meta_keywords: "",
		og_title: "",
		og_description: "",
		og_image: "",
		no_index: false,
	});

	const [saveFlash, setSaveFlash] = useState<"success" | "error" | null>(null);
	const [activePreview, setActivePreview] = useState<"google" | "social">("google");
	const editorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (actionData?.pageMetas) {
			setPageMetas(actionData.pageMetas);
		}
		if (actionData?.success) {
			setSaveFlash("success");
			setActivePage(null);
			const t = setTimeout(() => setSaveFlash(null), 3500);
			return () => clearTimeout(t);
		}
		if (actionData?.error) {
			setSaveFlash("error");
			const t = setTimeout(() => setSaveFlash(null), 4500);
			return () => clearTimeout(t);
		}
	}, [actionData]);

	useEffect(() => {
		setActivePage(null);
	}, [location.pathname]);

	const isSubmitting = navigation.state === "submitting";

	const metaMap = useMemo(() => {
		const map = new Map<string, PageMeta>();
		pageMetas.forEach((pm) => map.set(pm.route_path, pm));
		return map;
	}, [pageMetas]);

	const handleOpenEdit = (page: UserPageConfig) => {
		const existing = metaMap.get(page.path);
		setActivePage(page);
		setForm({
			id: existing?.id || "",
			route_path: page.path,
			meta_title: existing?.meta_title ?? page.defaultTitle,
			meta_description: existing?.meta_description ?? page.defaultDescription,
			meta_keywords: existing?.meta_keywords ?? page.defaultKeywords,
			og_title: existing?.og_title ?? (existing?.meta_title || page.defaultTitle),
			og_description: existing?.og_description ?? (existing?.meta_description || page.defaultDescription),
			og_image: existing?.og_image ?? (seoConfig.og_image || ""),
			no_index: existing?.no_index ?? false,
		});
		setTimeout(() => {
			editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
		}, 60);
	};

	const handleFillDefaults = () => {
		if (!activePage) return;
		setForm((prev) => ({
			...prev,
			meta_title: activePage.defaultTitle,
			meta_description: activePage.defaultDescription,
			meta_keywords: activePage.defaultKeywords,
			og_title: activePage.defaultTitle,
			og_description: activePage.defaultDescription,
			og_image: seoConfig.og_image || "",
			no_index: false,
		}));
	};

	const filteredPages = useMemo(() => {
		return DEFAULT_USER_PAGES.filter((p) => {
			const hasCustom = metaMap.has(p.path);
			if (filterTab === "custom" && !hasCustom) return false;
			if (filterTab === "defaults" && hasCustom) return false;
			if (searchQuery) {
				const q = searchQuery.toLowerCase();
				return (
					p.label.toLowerCase().includes(q) ||
					p.path.toLowerCase().includes(q) ||
					p.defaultTitle.toLowerCase().includes(q) ||
					(metaMap.get(p.path)?.meta_title || "").toLowerCase().includes(q)
				);
			}
			return true;
		});
	}, [filterTab, searchQuery, metaMap]);

	const customCount = useMemo(() => {
		let count = 0;
		DEFAULT_USER_PAGES.forEach((p) => {
			if (metaMap.has(p.path)) count++;
		});
		return count;
	}, [metaMap]);

	const siteName = seoConfig.site_name || "OpusZen";
	const siteUrl = (seoConfig.site_url || "https://opuszen.com").replace(/\/$/, "");

	// Preview calculated values
	const previewTitle = form.meta_title || (activePage?.defaultTitle ?? `${siteName} — AI API Gateway`);
	const previewDescription = form.meta_description || (activePage?.defaultDescription ?? seoConfig.site_description);
	const previewOgTitle = form.og_title || previewTitle;
	const previewOgDescription = form.og_description || previewDescription;
	const previewOgImage = form.og_image || seoConfig.og_image || `${siteUrl}/logo.png`;
	const previewUrl = `${siteUrl}${form.route_path === "/" ? "" : form.route_path}`;

	// Keywords array for tag pills preview
	const keywordTags = useMemo(() => {
		if (!form.meta_keywords) return [];
		return form.meta_keywords
			.split(",")
			.map((k) => k.trim())
			.filter(Boolean);
	}, [form.meta_keywords]);

	// Title quality badge
	const titleLength = form.meta_title.length;
	const titleStatus =
		titleLength === 0
			? { label: "Empty", color: "text-muted-foreground" }
			: titleLength < 30
			? { label: "Too short (< 30)", color: "text-amber-500" }
			: titleLength <= 60
			? { label: "Optimal (30-60 chars)", color: "text-emerald-500" }
			: { label: "Too long (> 60)", color: "text-amber-500" };

	// Description quality badge
	const descLength = form.meta_description.length;
	const descStatus =
		descLength === 0
			? { label: "Empty", color: "text-muted-foreground" }
			: descLength < 70
			? { label: "Too short (< 70)", color: "text-amber-500" }
			: descLength <= 160
			? { label: "Optimal (70-160 chars)", color: "text-emerald-500" }
			: { label: "Too long (> 160)", color: "text-amber-500" };

	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
			<AdminSidebar
				collapsed={false}
				onToggle={() => {}}
				adminEmail={adminEmail || undefined}
				mobileOpen={false}
				onMobileToggle={() => {}}
			/>

			<main className="flex-1 min-w-0 md:ml-[220px]">
				{/* Top Header */}
				<div className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 h-16 border-b border-border/60 bg-background/95 backdrop-blur">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-600 flex items-center justify-center shadow-md shadow-violet-500/20 text-white shrink-0">
							<FileText className="w-4 h-4" />
						</div>
						<div>
							<h1 className="text-base font-bold text-foreground leading-tight">
								User Pages Meta & Keyword Editor
							</h1>
							<p className="text-xs text-muted-foreground">
								Configure Page Title, Meta Description & Keywords separately for every user page
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<Link
							to="/sitemap.xml"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border transition-all"
						>
							<Globe className="w-3.5 h-3.5" />
							Live Sitemap
						</Link>
						<Link
							to="/auth/admin/seo"
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-all"
						>
							<Sliders className="w-3.5 h-3.5" />
							Global SEO
						</Link>
					</div>
				</div>

				<div className="max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
					{/* Toast flash */}
					{saveFlash === "success" && (
						<div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
							<CheckCircle2 className="w-5 h-5 shrink-0" />
							<span>Page metadata, title, and keywords saved and published successfully!</span>
						</div>
					)}
					{saveFlash === "error" && (
						<div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
							<AlertTriangle className="w-5 h-5 shrink-0" />
							<span>{actionData?.error || "Failed to save page metadata."}</span>
						</div>
					)}

					{/* Summary Stat Cards */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
						<div className="p-4 rounded-2xl border border-border bg-card/60">
							<div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
								<span>Total User Pages</span>
								<Layers className="w-3.5 h-3.5 text-primary" />
							</div>
							<p className="text-2xl font-bold text-foreground">{DEFAULT_USER_PAGES.length}</p>
							<p className="text-[11px] text-muted-foreground mt-0.5">All public user endpoints</p>
						</div>

						<div className="p-4 rounded-2xl border border-border bg-card/60">
							<div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
								<span>Custom Overrides</span>
								<Sparkles className="w-3.5 h-3.5 text-indigo-400" />
							</div>
							<p className="text-2xl font-bold text-foreground">{customCount}</p>
							<p className="text-[11px] text-muted-foreground mt-0.5">Custom title & keywords active</p>
						</div>

						<div className="p-4 rounded-2xl border border-border bg-card/60">
							<div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
								<span>Indexable Pages</span>
								<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
							</div>
							<p className="text-2xl font-bold text-foreground">
								{DEFAULT_USER_PAGES.filter((p) => !metaMap.get(p.path)?.no_index).length}
							</p>
							<p className="text-[11px] text-muted-foreground mt-0.5">Indexed by Google & Bing</p>
						</div>

						<div className="p-4 rounded-2xl border border-border bg-card/60">
							<div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
								<span>Noindex Pages</span>
								<EyeOff className="w-3.5 h-3.5 text-amber-500" />
							</div>
							<p className="text-2xl font-bold text-foreground">
								{DEFAULT_USER_PAGES.filter((p) => metaMap.get(p.path)?.no_index).length}
							</p>
							<p className="text-[11px] text-muted-foreground mt-0.5">Blocked from search index</p>
						</div>
					</div>

					{/* Search & Filter Controls */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border bg-card/40">
						<div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/50">
							<button
								type="button"
								onClick={() => setFilterTab("all")}
								className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
									filterTab === "all"
										? "bg-card text-foreground shadow-xs"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								All Pages ({DEFAULT_USER_PAGES.length})
							</button>
							<button
								type="button"
								onClick={() => setFilterTab("custom")}
								className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
									filterTab === "custom"
										? "bg-card text-foreground shadow-xs"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Customized ({customCount})
							</button>
							<button
								type="button"
								onClick={() => setFilterTab("defaults")}
								className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
									filterTab === "defaults"
										? "bg-card text-foreground shadow-xs"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Using Default ({DEFAULT_USER_PAGES.length - customCount})
							</button>
						</div>

						<div className="relative w-full sm:w-72">
							<Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search user page by path or title..."
								className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-background/80 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
							/>
						</div>
					</div>

					{/* Pages Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{filteredPages.map((page) => {
							const custom = metaMap.get(page.path);
							const title = custom?.meta_title || page.defaultTitle;
							const desc = custom?.meta_description || page.defaultDescription;
							const kw = custom?.meta_keywords || page.defaultKeywords;
							const isNoIndex = custom?.no_index ?? false;
							const isSelected = activePage?.path === page.path;

							const kwCount = kw ? kw.split(",").filter((s) => s.trim().length > 0).length : 0;

							return (
								<div
									key={page.path}
									className={`rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between ${
										isSelected
											? "border-primary bg-primary/5 shadow-md shadow-primary/5 ring-2 ring-primary/20"
											: custom
											? "border-border hover:border-foreground/20 bg-card/70"
											: "border-border/70 hover:border-foreground/20 bg-card/40"
									}`}
								>
									<div>
										{/* Card Header */}
										<div className="flex items-start justify-between gap-3 mb-3">
											<div className="flex items-center gap-2">
												<span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-background border border-border text-foreground">
													{page.path}
												</span>
												<span className="text-xs font-semibold text-foreground">
													{page.label}
												</span>
											</div>

											<div className="flex items-center gap-1.5">
												{custom ? (
													<span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
														Custom
													</span>
												) : (
													<span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/50">
														Default
													</span>
												)}

												{isNoIndex && (
													<span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
														<EyeOff className="w-2.5 h-2.5" /> Noindex
													</span>
												)}
											</div>
										</div>

										{/* Page Meta Details */}
										<div className="space-y-2 mb-4">
											<div>
												<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
													Page Title
												</p>
												<p className="text-xs font-medium text-foreground line-clamp-1 mt-0.5" title={title}>
													{title}
												</p>
											</div>

											<div>
												<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
													Meta Description
												</p>
												<p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5" title={desc}>
													{desc}
												</p>
											</div>

											<div>
												<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
													Keywords ({kwCount})
												</p>
												<p className="text-[11px] text-muted-foreground/80 line-clamp-1 mt-0.5" title={kw}>
													{kw || "None configured"}
												</p>
											</div>
										</div>
									</div>

									{/* Card Footer Actions */}
									<div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50 mt-2">
										<a
											href={page.path}
											target="_blank"
											rel="noopener noreferrer"
											className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
										>
											<ExternalLink className="w-3 h-3" />
											View Page
										</a>

										<div className="flex items-center gap-2">
											{custom && (
												<Form
													method="post"
													onSubmit={(e) => {
														if (
															!confirm(
																`Reset ${page.label} (${page.path}) to default metadata? Custom title and keywords will be cleared.`
															)
														) {
															e.preventDefault();
														}
													}}
												>
													<input type="hidden" name="intent" value="delete" />
													<input type="hidden" name="id" value={custom.id} />
													<button
														type="submit"
														className="text-[11px] text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
														title="Reset to defaults"
													>
														<Trash2 className="w-3.5 h-3.5" />
													</button>
												</Form>
											)}

											<button
												type="button"
												onClick={() => handleOpenEdit(page)}
												className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
													isSelected
														? "bg-primary text-primary-foreground shadow-sm"
														: "bg-primary/10 text-primary hover:bg-primary/20"
												}`}
											>
												<Sliders className="w-3.5 h-3.5" />
												Edit Meta & Keywords
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>

					{/* Modal / Slide-out Editor for Selected Page */}
					{activePage && (
						<div
							ref={editorRef}
							className="rounded-3xl border-2 border-primary/40 bg-card p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300"
						>
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
								<div>
									<div className="flex items-center gap-2 mb-1">
										<span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-mono">
											{activePage.path}
										</span>
										<span className="text-xs text-muted-foreground">•</span>
										<span className="text-xs text-muted-foreground font-semibold">{activePage.badge}</span>
									</div>
									<h2 className="text-xl font-bold text-foreground flex items-center gap-2">
										Editing SEO Meta & Keywords: <span className="text-primary">{activePage.label}</span>
									</h2>
								</div>

								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={handleFillDefaults}
										className="text-xs px-3 py-1.5 rounded-xl border border-border/70 hover:bg-muted text-foreground flex items-center gap-1.5 transition-all cursor-pointer"
										title="Fill with recommended SEO settings for this page"
									>
										<Sparkles className="w-3.5 h-3.5 text-amber-500" />
										Auto-fill Defaults
									</button>

									<button
										type="button"
										onClick={() => setActivePage(null)}
										className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
									>
										<X className="w-5 h-5" />
									</button>
								</div>
							</div>

							<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
								{/* Left column: Form inputs */}
								<div className="lg:col-span-7 space-y-5">
									<Form method="post" className="space-y-5">
										<input type="hidden" name="intent" value="upsert" />
										{form.id && <input type="hidden" name="id" value={form.id} />}
										<input type="hidden" name="route_path" value={form.route_path} />

										{/* 1. Page Title */}
										<div>
											<div className="flex items-center justify-between mb-1.5">
												<label className="block text-xs font-bold text-foreground uppercase tracking-wider">
													Page Title (&lt;title&gt;)
												</label>
												<span className={`text-[11px] font-mono font-semibold ${titleStatus.color}`}>
													{titleLength}/60 chars ({titleStatus.label})
												</span>
											</div>
											<input
												type="text"
												name="meta_title"
												value={form.meta_title}
												onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))}
												placeholder={activePage.defaultTitle}
												className="w-full h-11 px-3.5 rounded-xl border border-border bg-background/80 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-medium"
											/>
											<p className="text-[11px] text-muted-foreground mt-1">
												Appears in browser tabs and as the clickable headline in Google search results.
											</p>
										</div>

										{/* 2. Meta Description */}
										<div>
											<div className="flex items-center justify-between mb-1.5">
												<label className="block text-xs font-bold text-foreground uppercase tracking-wider">
													Meta Description
												</label>
												<span className={`text-[11px] font-mono font-semibold ${descStatus.color}`}>
													{descLength}/160 chars ({descStatus.label})
												</span>
											</div>
											<textarea
												name="meta_description"
												rows={3}
												value={form.meta_description}
												onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))}
												placeholder={activePage.defaultDescription}
												className="w-full p-3.5 rounded-xl border border-border bg-background/80 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-y leading-relaxed"
											/>
											<p className="text-[11px] text-muted-foreground mt-1">
												Search snippet text shown beneath the page title on Google and Bing.
											</p>
										</div>

										{/* 3. Meta Keywords */}
										<div>
											<div className="flex items-center justify-between mb-1.5">
												<label className="block text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
													<Tags className="w-3.5 h-3.5 text-primary" />
													Meta Keywords
												</label>
												<span className="text-[11px] text-muted-foreground">
													{keywordTags.length} keywords entered
												</span>
											</div>
											<input
												type="text"
												name="meta_keywords"
												value={form.meta_keywords}
												onChange={(e) => setForm((f) => ({ ...f, meta_keywords: e.target.value }))}
												placeholder="e.g. AI API gateway, claude api, token billing, failover"
												className="w-full h-11 px-3.5 rounded-xl border border-border bg-background/80 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
											/>
											<p className="text-[11px] text-muted-foreground mt-1">
												Separate keywords with commas. Used for on-page meta tags and internal search categorization.
											</p>

											{/* Keyword chips preview */}
											{keywordTags.length > 0 && (
												<div className="flex flex-wrap gap-1.5 mt-2.5 p-2.5 rounded-xl bg-muted/30 border border-border/50">
													{keywordTags.map((tag, idx) => (
														<span
															key={idx}
															className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-card border border-border text-foreground shadow-2xs"
														>
															#{tag}
														</span>
													))}
												</div>
											)}
										</div>

										{/* 4. OpenGraph Social Sharing (Expandable) */}
										<div className="p-4 rounded-2xl border border-border/70 bg-muted/20 space-y-4">
											<div className="flex items-center gap-2">
												<Share2 className="w-4 h-4 text-primary" />
												<h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
													Social Share Cards (OpenGraph & Twitter)
												</h4>
											</div>

											<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
												<div>
													<label className="block text-[11px] font-semibold text-muted-foreground mb-1">
														Custom Social Title (Optional)
													</label>
													<input
														type="text"
														name="og_title"
														value={form.og_title}
														onChange={(e) => setForm((f) => ({ ...f, og_title: e.target.value }))}
														placeholder="Falls back to Page Title"
														className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
													/>
												</div>

												<div>
													<label className="block text-[11px] font-semibold text-muted-foreground mb-1">
														Custom OG Image URL
													</label>
													<input
														type="url"
														name="og_image"
														value={form.og_image}
														onChange={(e) => setForm((f) => ({ ...f, og_image: e.target.value }))}
														placeholder="https://.../social-card.png"
														className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
													/>
												</div>
											</div>

											<div>
												<label className="block text-[11px] font-semibold text-muted-foreground mb-1">
													Custom Social Description (Optional)
												</label>
												<textarea
													name="og_description"
													rows={2}
													value={form.og_description}
													onChange={(e) => setForm((f) => ({ ...f, og_description: e.target.value }))}
													placeholder="Falls back to Meta Description"
													className="w-full p-2.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
												/>
											</div>
										</div>

										{/* 5. Search Engine Robots Control */}
										<div className="p-4 rounded-2xl border border-border/70 bg-card/60 flex items-center justify-between gap-4">
											<div className="flex items-center gap-3">
												<div className={`w-8 h-8 rounded-lg flex items-center justify-center ${form.no_index ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}>
													{form.no_index ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
												</div>
												<div>
													<p className="text-xs font-bold text-foreground">
														{form.no_index ? "Search Indexing Blocked (noindex)" : "Search Engine Indexing Allowed (index, follow)"}
													</p>
													<p className="text-[11px] text-muted-foreground">
														{form.no_index ? "Google & Bing crawlers will ignore this page" : "Page will be indexed in search engines and included in sitemap"}
													</p>
												</div>
											</div>

											<label className="relative inline-flex items-center cursor-pointer">
												<input
													type="checkbox"
													name="no_index"
													checked={form.no_index}
													onChange={(e) => setForm((f) => ({ ...f, no_index: e.target.checked }))}
													className="sr-only peer"
												/>
												<div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
											</label>
										</div>

										{/* Submit / Save Bar */}
										<div className="flex items-center gap-3 pt-2">
											<button
												type="submit"
												disabled={isSubmitting}
												className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
											>
												{isSubmitting ? (
													<>
														<RefreshCw className="w-4 h-4 animate-spin" />
														Saving Changes…
													</>
												) : (
													<>
														<Save className="w-4 h-4" />
														Save Page Meta
													</>
												)}
											</button>

											<button
												type="button"
												onClick={() => setActivePage(null)}
												className="px-5 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
											>
												Cancel
											</button>
										</div>
									</Form>
								</div>

								{/* Right column: Live Real-time Previews */}
								<div className="lg:col-span-5 space-y-4">
									<div className="flex items-center justify-between">
										<p className="text-xs font-bold text-foreground uppercase tracking-wider">
											Live Real-time Preview
										</p>
										<div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/60">
											<button
												type="button"
												onClick={() => setActivePreview("google")}
												className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
													activePreview === "google"
														? "bg-card text-foreground shadow-2xs"
														: "text-muted-foreground hover:text-foreground"
												}`}
											>
												Google Search
											</button>
											<button
												type="button"
												onClick={() => setActivePreview("social")}
												className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
													activePreview === "social"
														? "bg-card text-foreground shadow-2xs"
														: "text-muted-foreground hover:text-foreground"
												}`}
											>
												Social Card
											</button>
										</div>
									</div>

									{/* Google Search Snippet Preview */}
									{activePreview === "google" ? (
										<div className="p-5 rounded-2xl border border-border bg-card/90 space-y-2.5 shadow-sm">
											<div className="flex items-center gap-2">
												<div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
													OZ
												</div>
												<div className="min-w-0">
													<p className="text-xs font-medium text-foreground truncate">{siteName}</p>
													<p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono truncate">
														{previewUrl}
													</p>
												</div>
											</div>

											<h4 className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer leading-snug line-clamp-2">
												{previewTitle}
											</h4>

											<p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
												{previewDescription}
											</p>

											{form.no_index && (
												<div className="pt-2 border-t border-border/50 text-[11px] text-amber-500 font-medium flex items-center gap-1.5">
													<EyeOff className="w-3.5 h-3.5" />
													Note: Page is marked &lt;meta name="robots" content="noindex"&gt;
												</div>
											)}
										</div>
									) : (
										/* Social Share Preview */
										<div className="rounded-2xl border border-border overflow-hidden bg-card/90 shadow-sm">
											<div className="aspect-[1.91/1] w-full bg-muted/40 relative flex items-center justify-center overflow-hidden border-b border-border/60">
												{previewOgImage ? (
													<img
														src={previewOgImage}
														alt="OG Preview"
														className="w-full h-full object-cover"
														onError={(e) => {
															(e.target as HTMLElement).style.display = "none";
														}}
													/>
												) : (
													<div className="text-center p-4">
														<ImageIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1" />
														<span className="text-[11px] text-muted-foreground">No Social Image Set</span>
													</div>
												)}
											</div>
											<div className="p-4 space-y-1">
												<p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
													{siteUrl.replace(/^https?:\/\//, "")}
												</p>
												<h4 className="text-sm font-bold text-foreground line-clamp-2 leading-snug">
													{previewOgTitle}
												</h4>
												<p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
													{previewOgDescription}
												</p>
											</div>
										</div>
									)}

									{/* Quick Tips Box */}
									<div className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-2">
										<p className="text-xs font-bold text-foreground flex items-center gap-1.5">
											<Sparkles className="w-3.5 h-3.5 text-primary" />
											SEO Best Practices for {activePage.label}
										</p>
										<ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside leading-relaxed">
											<li>Keep titles between 30 and 60 characters for best Google display.</li>
											<li>Include high-intent keywords naturally in the description.</li>
											<li>Provide 1200x630px image for optimal Twitter/LinkedIn previews.</li>
										</ul>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
