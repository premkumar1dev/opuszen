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
import { getSeoConfig, updateSeoConfig } from "~/utils/seo-service.server";
import { type SeoConfig, DEFAULT_SEO_CONFIG } from "~/types/seo";
import {
	Globe,
	Search,
	Share2,
	BarChart3,
	FileCode,
	Bot,
	CheckCircle2,
	AlertTriangle,
	XCircle,
	Copy,
	Check,
	ExternalLink,
	Save,
	RefreshCw,
	Sparkles,
	Eye,
	Sliders,
	Code2,
	Layers,
	Shield,
	User,
	Bell,
	Monitor,
	Database,
	CreditCard,
	Info,
	Trash2,
	Plus,
	Smartphone,
	Laptop,
} from "lucide-react";

export const meta: MetaFunction = () => [
	{ title: "SEO Tools & Meta Editor | Admin | OpusZen" },
];

const SETTINGS_TABS = [
	{ id: "profile", label: "Profile", icon: <User className="w-4 h-4" />, href: "/auth/admin/settings?tab=profile" },
	{ id: "security", label: "Security", icon: <Shield className="w-4 h-4" />, href: "/auth/admin/settings?tab=security" },
	{ id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" />, href: "/auth/admin/settings?tab=notifications" },
	{ id: "appearance", label: "Appearance", icon: <Monitor className="w-4 h-4" />, href: "/auth/admin/settings?tab=appearance" },
	{ id: "data", label: "Data & Storage", icon: <Database className="w-4 h-4" />, href: "/auth/admin/settings?tab=data" },
	{ id: "site", label: "Site Config", icon: <Globe className="w-4 h-4" />, href: "/auth/admin/settings/site" },
	{ id: "seo", label: "SEO Tools", icon: <Search className="w-4 h-4" />, href: "/auth/admin/seo" },
	{ id: "payments", label: "Payment Gateway", icon: <CreditCard className="w-4 h-4" />, href: "/auth/admin/settings/payments" },
];

interface LoaderData {
	adminEmail: string;
	config: SeoConfig;
}

interface ActionData {
	success?: boolean;
	error?: string;
	config?: SeoConfig;
}

export async function loader({ request }: LoaderFunctionArgs) {
	const headers = securityHeaders();
	const adminCheck = await verifyAdminSession(request);
	if (!adminCheck.isAdmin) throw redirect("/auth/admin");

	const config = await getSeoConfig();
	return data({ adminEmail: adminCheck.adminEmail || "", config }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
	const headers = securityHeaders();
	await requireAdmin(request);

	const formData = await request.formData();
	const intent = formData.get("intent") as string;

	if (intent === "save_seo") {
		const updates: Partial<SeoConfig> = {
			site_name: (formData.get("site_name") as string)?.trim() || DEFAULT_SEO_CONFIG.site_name,
			site_title: (formData.get("site_title") as string)?.trim() || DEFAULT_SEO_CONFIG.site_title,
			site_tagline: (formData.get("site_tagline") as string)?.trim() || "",
			site_description: (formData.get("site_description") as string)?.trim() || "",
			keywords: (formData.get("keywords") as string)?.trim() || "",
			author: (formData.get("author") as string)?.trim() || "",
			site_url: (formData.get("site_url") as string)?.trim() || "https://opuszen.com",
			og_title: (formData.get("og_title") as string)?.trim() || "",
			og_description: (formData.get("og_description") as string)?.trim() || "",
			og_image: (formData.get("og_image") as string)?.trim() || "",
			og_type: (formData.get("og_type") as string)?.trim() || "website",
			twitter_card: (formData.get("twitter_card") as string)?.trim() || "summary_large_image",
			twitter_site: (formData.get("twitter_site") as string)?.trim() || "",
			twitter_creator: (formData.get("twitter_creator") as string)?.trim() || "",
			twitter_title: (formData.get("twitter_title") as string)?.trim() || "",
			twitter_description: (formData.get("twitter_description") as string)?.trim() || "",
			twitter_image: (formData.get("twitter_image") as string)?.trim() || "",
			robots_index: formData.get("robots_index") === "true",
			robots_follow: formData.get("robots_follow") === "true",
			robots_custom: (formData.get("robots_custom") as string)?.trim() || "",
			google_analytics_id: (formData.get("google_analytics_id") as string)?.trim() || "",
			google_tag_manager_id: (formData.get("google_tag_manager_id") as string)?.trim() || "",
			google_site_verification: (formData.get("google_site_verification") as string)?.trim() || "",
			bing_site_verification: (formData.get("bing_site_verification") as string)?.trim() || "",
			custom_head_tags: (formData.get("custom_head_tags") as string) || "",
			custom_footer_scripts: (formData.get("custom_footer_scripts") as string) || "",
			json_ld_schema: (formData.get("json_ld_schema") as string) || "",
			robots_txt_content: (formData.get("robots_txt_content") as string) || "",
			sitemap_enabled: formData.get("sitemap_enabled") === "true",
		};

		const result = await updateSeoConfig(updates);
		if (!result.success) {
			return data({ success: false, error: result.error || "Failed to save" }, { headers });
		}

		return data({ success: true, config: result.data }, { headers });
	}

	return data({ error: "Unknown action" }, { headers });
}

export default function AdminSeoRoute() {
	const { adminEmail, config } = useLoaderData<LoaderData>();
	const actionData = useActionData<ActionData>();
	const navigation = useNavigation();
	const location = useLocation();

	const isSubmitting = navigation.state === "submitting";
	const [mobileOpen, setMobileOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<"meta" | "social" | "analytics" | "schema" | "robots" | "audit">("meta");

	useEffect(() => {
		setMobileOpen(false);
	}, [location.pathname]);

	const [form, setForm] = useState<SeoConfig>(config);
	const [saveFlash, setSaveFlash] = useState<"success" | "error" | null>(null);
	const [copiedHtml, setCopiedHtml] = useState(false);
	const [previewPlatform, setPreviewPlatform] = useState<"google-desktop" | "google-mobile" | "facebook" | "twitter">("google-desktop");
	const [newKeyword, setNewKeyword] = useState("");

	useEffect(() => {
		if (actionData?.success) {
			setSaveFlash("success");
			if (actionData.config) {
				setForm(actionData.config);
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

	// Keywords array parsed from comma-separated string
	const keywordList = useMemo(() => {
		if (!form.keywords) return [];
		return form.keywords
			.split(",")
			.map((k) => k.trim())
			.filter(Boolean);
	}, [form.keywords]);

	const addKeyword = (kw: string) => {
		const trimmed = kw.trim();
		if (!trimmed) return;
		if (keywordList.includes(trimmed)) {
			setNewKeyword("");
			return;
		}
		const updated = [...keywordList, trimmed].join(", ");
		setForm((f) => ({ ...f, keywords: updated }));
		setNewKeyword("");
	};

	const removeKeyword = (kw: string) => {
		const updated = keywordList.filter((k) => k !== kw).join(", ");
		setForm((f) => ({ ...f, keywords: updated }));
	};

	// JSON-LD validity checker
	const jsonLdValidity = useMemo(() => {
		if (!form.json_ld_schema || !form.json_ld_schema.trim()) {
			return { valid: true, empty: true, message: "No custom schema configured." };
		}
		try {
			JSON.parse(form.json_ld_schema);
			return { valid: true, empty: false, message: "Valid JSON syntax." };
		} catch (err: any) {
			return { valid: false, empty: false, message: err.message || "Invalid JSON syntax." };
		}
	}, [form.json_ld_schema]);

	// Calculated SEO score and audit points
	const audit = useMemo(() => {
		const checks = [
			{
				title: "Site Title tag is present",
				passed: Boolean(form.site_title && form.site_title.trim().length > 0),
				warning: form.site_title.length < 20 || form.site_title.length > 70,
				desc: form.site_title.length > 70 ? "Title is over 70 chars (may get truncated in SERP)" : form.site_title.length < 20 ? "Title is quite short (< 20 chars)" : "Optimal length (20-70 characters)",
				weight: 15,
			},
			{
				title: "Meta Description is defined",
				passed: Boolean(form.site_description && form.site_description.trim().length > 0),
				warning: form.site_description.length < 50 || form.site_description.length > 170,
				desc: form.site_description.length > 160 ? "Description exceeds 160 chars" : form.site_description.length < 50 ? "Description is quite short (< 50 chars)" : "Optimal length (50-160 characters)",
				weight: 20,
			},
			{
				title: "Keywords & Tags defined",
				passed: keywordList.length >= 3,
				warning: keywordList.length > 0 && keywordList.length < 3,
				desc: `${keywordList.length} keywords defined (${keywordList.length >= 5 ? "Good coverage" : "3-8 keywords recommended"})`,
				weight: 10,
			},
			{
				title: "Canonical Site URL configured",
				passed: Boolean(form.site_url && form.site_url.startsWith("http")),
				warning: !form.site_url.startsWith("https://"),
				desc: form.site_url.startsWith("https://") ? "Secure HTTPS canonical URL set" : "HTTPS recommended",
				weight: 10,
			},
			{
				title: "OpenGraph Social Image set",
				passed: Boolean(form.og_image && form.og_image.trim().length > 0),
				warning: false,
				desc: form.og_image ? "Image set for rich social share previews" : "Missing OG share image",
				weight: 15,
			},
			{
				title: "Twitter Card meta tags configured",
				passed: Boolean(form.twitter_title || form.og_title),
				warning: !form.twitter_site,
				desc: form.twitter_site ? `Configured for ${form.twitter_site}` : "Twitter handle not specified",
				weight: 10,
			},
			{
				title: "Search Engine Indexing enabled",
				passed: form.robots_index && form.robots_follow,
				warning: !form.robots_index,
				desc: form.robots_index ? "Public search indexing allowed (index, follow)" : "NOINDEX: Search engines blocked!",
				weight: 10,
			},
			{
				title: "Structured Data (Schema.org) valid",
				passed: jsonLdValidity.valid,
				warning: jsonLdValidity.empty,
				desc: jsonLdValidity.valid ? (jsonLdValidity.empty ? "Optional schema empty" : "Valid JSON-LD schema present") : "Syntax error in Schema JSON",
				weight: 10,
			},
		];

		let score = 0;
		checks.forEach((c) => {
			if (c.passed && !c.warning) score += c.weight;
			else if (c.passed && c.warning) score += Math.floor(c.weight * 0.7);
		});

		return { checks, score: Math.min(100, score) };
	}, [form, keywordList, jsonLdValidity]);

	// Generate Copyable HTML meta snippet
	const generatedHtml = useMemo(() => {
		const title = form.site_title || form.site_name || "OpusZen";
		const desc = form.site_description || "";
		const url = form.site_url || "https://opuszen.com";
		const img = form.og_image || `${url}/logo.png`;
		const ogTitle = form.og_title || title;
		const ogDesc = form.og_description || desc;
		const twCard = form.twitter_card || "summary_large_image";
		const twSite = form.twitter_site || "";
		const robots = `${form.robots_index ? "index" : "noindex"}, ${form.robots_follow ? "follow" : "nofollow"}${form.robots_custom ? `, ${form.robots_custom}` : ""}`;

		return `<!-- Primary Meta Tags -->
<title>${title}</title>
<meta name="title" content="${title}" />
<meta name="description" content="${desc}" />
${form.keywords ? `<meta name="keywords" content="${form.keywords}" />\n` : ""}${form.author ? `<meta name="author" content="${form.author}" />\n` : ""}<link rel="canonical" href="${url}" />
<meta name="robots" content="${robots}" />

<!-- Open Graph / Facebook -->
<meta property="og:type" content="${form.og_type || "website"}" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${ogTitle}" />
<meta property="og:description" content="${ogDesc}" />
<meta property="og:image" content="${img}" />
<meta property="og:site_name" content="${form.site_name || "OpusZen"}" />

<!-- Twitter -->
<meta property="twitter:card" content="${twCard}" />
${twSite ? `<meta property="twitter:site" content="${twSite}" />\n` : ""}<meta property="twitter:url" content="${url}" />
<meta property="twitter:title" content="${form.twitter_title || ogTitle}" />
<meta property="twitter:description" content="${form.twitter_description || ogDesc}" />
<meta property="twitter:image" content="${form.twitter_image || img}" />
${form.google_site_verification ? `<meta name="google-site-verification" content="${form.google_site_verification}" />\n` : ""}${form.bing_site_verification ? `<meta name="msvalidate.01" content="${form.bing_site_verification}" />\n` : ""}`;
	}, [form]);

	const copyToClipboard = () => {
		navigator.clipboard.writeText(generatedHtml);
		setCopiedHtml(true);
		setTimeout(() => setCopiedHtml(false), 2500);
	};

	return (
		<div className="min-h-screen bg-background text-foreground">
			<AdminSidebar
				collapsed={false}
				onToggle={() => {}}
				adminEmail={adminEmail || undefined}
				mobileOpen={mobileOpen}
				onMobileToggle={() => setMobileOpen((v) => !v)}
			/>
			<main className="min-h-screen md:ml-[220px]">
				{/* Mobile header bar */}
				<div className="sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b border-border/60 bg-background/95 backdrop-blur md:hidden">
					<button
						onClick={() => setMobileOpen(true)}
						className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
						aria-label="Open menu"
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
							<path d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
					<span className="text-sm font-semibold">SEO Tools</span>
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
								<span className="text-xs text-foreground font-medium">SEO & Meta Tools</span>
							</div>
							<h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-600 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white">
									<Search className="w-5 h-5" />
								</div>
								SEO Tools & Meta Editor
							</h1>
							<p className="text-muted-foreground text-sm mt-1">
								Manage site meta tags, search engine indexing, social share cards, analytics, robots.txt, and sitemaps
							</p>
						</div>

						<div className="flex items-center gap-2">
							<a
								href="/sitemap.xml"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border transition-all"
								title="View live XML sitemap"
							>
								<FileCode className="w-3.5 h-3.5" />
								Sitemap
								<ExternalLink className="w-3 h-3 opacity-60" />
							</a>
							<a
								href="/robots.txt"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border transition-all"
								title="View live robots.txt"
							>
								<Bot className="w-3.5 h-3.5" />
								Robots.txt
								<ExternalLink className="w-3 h-3 opacity-60" />
							</a>
							<a
								href="/"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-muted/60 hover:bg-muted text-xs font-medium text-foreground transition-all"
							>
								<Eye className="w-3.5 h-3.5" />
								Preview Site
							</a>
						</div>
					</div>

					{/* SEO Health Score Banner */}
					<div className="rounded-2xl border border-border bg-gradient-to-r from-card/80 via-card/50 to-card/80 p-5 backdrop-blur relative overflow-hidden">
						<div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
							<div className="flex items-center gap-4">
								<div className="relative flex items-center justify-center w-16 h-16 shrink-0">
									<svg className="w-16 h-16 transform -rotate-90">
										<circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="5" className="text-muted/30" fill="transparent" />
										<circle
											cx="32"
											cy="32"
											r="26"
											stroke="currentColor"
											strokeWidth="5"
											className={audit.score >= 80 ? "text-emerald-500" : audit.score >= 50 ? "text-amber-500" : "text-red-500"}
											strokeDasharray={163.36}
											strokeDashoffset={163.36 - (163.36 * audit.score) / 100}
											strokeLinecap="round"
											fill="transparent"
										/>
									</svg>
									<span className="absolute text-base font-bold text-foreground">{audit.score}%</span>
								</div>
								<div>
									<div className="flex items-center gap-2">
										<h2 className="text-base font-bold text-foreground">SEO Health Score</h2>
										<span
											className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
												audit.score >= 80
													? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
													: audit.score >= 50
													? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
													: "bg-red-500/10 text-red-500 border border-red-500/20"
											}`}
										>
											{audit.score >= 80 ? "Excellent" : audit.score >= 50 ? "Needs Improvement" : "Critical Actions Needed"}
										</span>
									</div>
									<p className="text-xs text-muted-foreground mt-0.5">
										{audit.checks.filter((c) => c.passed && !c.warning).length} of {audit.checks.length} audit checks passing perfectly
									</p>
								</div>
							</div>

							<div className="flex flex-wrap items-center gap-2">
								<button
									type="button"
									onClick={() => setActiveTab("audit")}
									className="text-xs font-medium px-3 py-1.5 rounded-xl border border-border hover:bg-muted/40 text-foreground transition-all cursor-pointer"
								>
									View Audit Checklist
								</button>
								<button
									type="button"
									onClick={copyToClipboard}
									className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all cursor-pointer"
								>
									{copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
									{copiedHtml ? "Copied Tags!" : "Copy Meta Tags"}
								</button>
							</div>
						</div>
					</div>

					{/* Layout with Settings Navigation and Main Panel */}
					<div className="flex flex-col lg:flex-row gap-6">
						{/* Settings Navigation Sidebar */}
						<div className="lg:w-56 shrink-0 space-y-4">
							<div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
								<div className="p-1.5 space-y-0.5">
									{SETTINGS_TABS.map((tab) => {
										const baseClasses = `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer`;
										const isActive = tab.id === "seo";
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

							{/* Quick feature navigation inside SEO */}
							<div className="rounded-2xl border border-border/60 bg-card/40 p-3 space-y-1">
								<p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider px-2 py-1">
									SEO Tools Sections
								</p>
								{[
									{ id: "meta", label: "Meta & Identity", icon: Globe },
									{ id: "social", label: "Social & SERP Previews", icon: Share2 },
									{ id: "analytics", label: "Analytics & Scripts", icon: BarChart3 },
									{ id: "schema", label: "Structured Data", icon: FileCode },
									{ id: "robots", label: "Robots & Sitemap", icon: Bot },
									{ id: "audit", label: "SEO Health Audit", icon: CheckCircle2 },
								].map((s) => {
									const Icon = s.icon;
									const isCurrent = activeTab === s.id;
									return (
										<button
											key={s.id}
											type="button"
											onClick={() => setActiveTab(s.id as any)}
											className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-all cursor-pointer ${
												isCurrent
													? "bg-muted text-foreground font-semibold border border-border/80"
													: "text-muted-foreground hover:text-foreground hover:bg-muted/30"
											}`}
										>
											<Icon className={`w-3.5 h-3.5 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
											{s.label}
										</button>
									);
								})}
							</div>
						</div>

						{/* Main Content Area */}
						<div className="flex-1 space-y-5 min-w-0">
							{/* Toast notifications */}
							{saveFlash === "success" && (
								<div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
									<Check className="w-4 h-4 shrink-0" />
									SEO & Meta tags settings updated successfully!
								</div>
							)}
							{saveFlash === "error" && (
								<div className="flex items-center gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
									<AlertTriangle className="w-4 h-4 shrink-0" />
									{actionData?.error || "Failed to save SEO configuration."}
								</div>
							)}

							<Form method="post" className="space-y-6">
								<input type="hidden" name="intent" value="save_seo" />

								{/* ═══════════════════════════════════════════════════════════════════
								    TAB 1: META & IDENTITY
								   ═══════════════════════════════════════════════════════════════════ */}
								{activeTab === "meta" && (
									<div className="space-y-5">
										{/* Site Title & Tagline */}
										<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
													<Globe className="w-4 h-4" />
												</div>
												<div>
													<h3 className="text-base font-bold text-foreground">Site Title & Tagline</h3>
													<p className="text-xs text-muted-foreground">
														The primary title tag displayed in Google search results and browser tabs
													</p>
												</div>
											</div>

											<div className="space-y-4">
												<div>
													<div className="flex items-center justify-between mb-1.5">
														<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
															Page Title (&lt;title&gt;)
														</label>
														<span
															className={`text-[11px] font-mono font-medium ${
																form.site_title.length > 65 ? "text-amber-400" : form.site_title.length < 25 ? "text-muted-foreground" : "text-emerald-400"
															}`}
														>
															{form.site_title.length} / 60 chars (optimal: 50-60)
														</span>
													</div>
													<input
														type="text"
														name="site_title"
														value={form.site_title}
														onChange={(e) => setForm((f) => ({ ...f, site_title: e.target.value }))}
														placeholder="e.g. OpusZen — AI API Gateway"
														className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
													/>
												</div>

												<div>
													<div className="flex items-center justify-between mb-1.5">
														<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
															Site Tagline / Headline
														</label>
														<span className="text-[11px] text-muted-foreground font-mono">{form.site_tagline.length} chars</span>
													</div>
													<input
														type="text"
														name="site_tagline"
														value={form.site_tagline}
														onChange={(e) => setForm((f) => ({ ...f, site_tagline: e.target.value }))}
														placeholder="e.g. High-performance AI API Gateway with Automatic Failover"
														className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
													/>
												</div>

												<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
													<div>
														<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
															Site Brand Name
														</label>
														<input
															type="text"
															name="site_name"
															value={form.site_name}
															onChange={(e) => setForm((f) => ({ ...f, site_name: e.target.value }))}
															placeholder="e.g. OpusZen"
															className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
														/>
													</div>
													<div>
														<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
															Canonical Base URL
														</label>
														<input
															type="url"
															name="site_url"
															value={form.site_url}
															onChange={(e) => setForm((f) => ({ ...f, site_url: e.target.value }))}
															placeholder="https://opuszen.com"
															className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
														/>
													</div>
												</div>
											</div>
										</div>

										{/* Meta Description */}
										<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
													<FileCode className="w-4 h-4" />
												</div>
												<div>
													<h3 className="text-base font-bold text-foreground">Meta Description</h3>
													<p className="text-xs text-muted-foreground">
														Summarizes page content for search engines and social link cards (recommended: 140–160 chars)
													</p>
												</div>
											</div>

											<div>
												<div className="flex items-center justify-between mb-1.5">
													<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
														Meta Description Text
													</label>
													<span
														className={`text-[11px] font-mono font-medium ${
															form.site_description.length > 165
																? "text-red-400"
																: form.site_description.length >= 120
																? "text-emerald-400"
																: "text-amber-400"
														}`}
													>
														{form.site_description.length} / 160 chars
													</span>
												</div>
												<textarea
													name="site_description"
													rows={3}
													value={form.site_description}
													onChange={(e) => setForm((f) => ({ ...f, site_description: e.target.value }))}
													placeholder="Write a clear, compelling description with primary keywords..."
													className="w-full p-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
												/>
												<div className="mt-2 flex items-center gap-2">
													<div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
														<div
															className={`h-full transition-all duration-300 ${
																form.site_description.length > 160
																	? "bg-red-500"
																	: form.site_description.length >= 120
																	? "bg-emerald-500"
																	: "bg-amber-500"
															}`}
															style={{
																width: `${Math.min(100, (form.site_description.length / 160) * 100)}%`,
															}}
														/>
													</div>
													<span className="text-[10px] text-muted-foreground shrink-0">
														{form.site_description.length > 160
															? "Too long"
															: form.site_description.length >= 120
															? "Ideal length"
															: "Could be longer"}
													</span>
												</div>
											</div>
										</div>

										{/* Keywords Manager */}
										<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
													<Sparkles className="w-4 h-4" />
												</div>
												<div>
													<h3 className="text-base font-bold text-foreground">Keywords & Search Tags</h3>
													<p className="text-xs text-muted-foreground">
														Target search keywords and topics related to your platform
													</p>
												</div>
											</div>

											{/* Tag Chips */}
											<div className="flex flex-wrap gap-2 min-h-[44px] p-2.5 rounded-xl border border-border bg-background/40">
												{keywordList.map((kw) => (
													<span
														key={kw}
														className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary"
													>
														{kw}
														<button
															type="button"
															onClick={() => removeKeyword(kw)}
															className="text-primary/60 hover:text-primary cursor-pointer"
															title="Remove tag"
														>
															<Trash2 className="w-3 h-3" />
														</button>
													</span>
												))}
												{keywordList.length === 0 && (
													<span className="text-xs text-muted-foreground py-1 px-1">No keywords added yet.</span>
												)}
											</div>

											{/* Add keyword input */}
											<div className="flex gap-2">
												<input
													type="text"
													value={newKeyword}
													onChange={(e) => setNewKeyword(e.target.value)}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === ",") {
															e.preventDefault();
															addKeyword(newKeyword);
														}
													}}
													placeholder="Add keyword tag and press Enter..."
													className="flex-1 h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
												/>
												<button
													type="button"
													onClick={() => addKeyword(newKeyword)}
													className="px-4 h-10 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
												>
													<Plus className="w-3.5 h-3.5" />
													Add Tag
												</button>
											</div>

											{/* Hidden input for form submission */}
											<input type="hidden" name="keywords" value={form.keywords} />

											{/* Quick suggestions */}
											<div className="space-y-1.5 pt-1">
												<p className="text-[11px] text-muted-foreground font-medium">Quick suggestions to add:</p>
												<div className="flex flex-wrap gap-1.5">
													{[
														"AI Gateway",
														"Claude 3.5 Sonnet",
														"OpenAI API",
														"LLM Proxy",
														"Automatic Failover",
														"Token Billing",
														"DeepSeek R1",
													].map((s) => (
														<button
															key={s}
															type="button"
															onClick={() => addKeyword(s)}
															disabled={keywordList.includes(s)}
															className="text-[10px] px-2 py-0.5 rounded-md bg-muted/40 hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
														>
															+ {s}
														</button>
													))}
												</div>
											</div>
										</div>

										{/* Author & Indexing Settings */}
										<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
													<Bot className="w-4 h-4" />
												</div>
												<div>
													<h3 className="text-base font-bold text-foreground">Author & Search Engine Indexing Directives</h3>
													<p className="text-xs text-muted-foreground">
														Control how search crawlers (Googlebot, Bingbot) crawl and index this site
													</p>
												</div>
											</div>

											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
												<div>
													<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
														Author / Publisher
													</label>
													<input
														type="text"
														name="author"
														value={form.author}
														onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
														placeholder="OpusZen Team"
														className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
													/>
												</div>
												<div>
													<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
														Custom Meta Robots Directives
													</label>
													<input
														type="text"
														name="robots_custom"
														value={form.robots_custom}
														onChange={(e) => setForm((f) => ({ ...f, robots_custom: e.target.value }))}
														placeholder="max-image-preview:large, max-snippet:-1"
														className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
													/>
												</div>
											</div>

											<div className="divide-y divide-border/40 pt-1">
												<div className="flex items-center justify-between py-3">
													<div>
														<p className="text-sm font-medium text-foreground">Allow Search Indexing (index)</p>
														<p className="text-xs text-muted-foreground">Allow search engines to show pages in search results</p>
													</div>
													<button
														type="button"
														onClick={() => setForm((f) => ({ ...f, robots_index: !f.robots_index }))}
														className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
															form.robots_index ? "bg-primary" : "bg-muted"
														}`}
													>
														<span
															className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
																form.robots_index ? "translate-x-[18px]" : "translate-x-1"
															}`}
														/>
													</button>
													<input type="hidden" name="robots_index" value={String(form.robots_index)} />
												</div>

												<div className="flex items-center justify-between py-3">
													<div>
														<p className="text-sm font-medium text-foreground">Follow Page Links (follow)</p>
														<p className="text-xs text-muted-foreground">Allow search engines to crawl links on public pages</p>
													</div>
													<button
														type="button"
														onClick={() => setForm((f) => ({ ...f, robots_follow: !f.robots_follow }))}
														className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
															form.robots_follow ? "bg-primary" : "bg-muted"
														}`}
													>
														<span
															className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
																form.robots_follow ? "translate-x-[18px]" : "translate-x-1"
															}`}
														/>
													</button>
													<input type="hidden" name="robots_follow" value={String(form.robots_follow)} />
												</div>
											</div>
										</div>
									</div>
								)}

								{/* ═══════════════════════════════════════════════════════════════════
								    TAB 2: SOCIAL MEDIA & SERP PREVIEWS
								   ═══════════════════════════════════════════════════════════════════ */}
								{activeTab === "social" && (
									<div className="space-y-5">
										{/* Live Interactive Preview Box */}
										<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-4">
											<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
												<div>
													<h3 className="text-base font-bold text-foreground flex items-center gap-2">
														<Eye className="w-4 h-4 text-primary" />
														Live Search & Social Preview
													</h3>
													<p className="text-xs text-muted-foreground">
														Simulate how your site appears across major platforms in real-time
													</p>
												</div>

												{/* Platform Tabs */}
												<div className="flex items-center gap-1 p-1 rounded-xl bg-background/80 border border-border/60">
													<button
														type="button"
														onClick={() => setPreviewPlatform("google-desktop")}
														className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
															previewPlatform === "google-desktop" ? "bg-primary text-primary-foreground font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground"
														}`}
													>
														<Laptop className="w-3 h-3" />
														Google (Desktop)
													</button>
													<button
														type="button"
														onClick={() => setPreviewPlatform("google-mobile")}
														className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
															previewPlatform === "google-mobile" ? "bg-primary text-primary-foreground font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground"
														}`}
													>
														<Smartphone className="w-3 h-3" />
														Google (Mobile)
													</button>
													<button
														type="button"
														onClick={() => setPreviewPlatform("facebook")}
														className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
															previewPlatform === "facebook" ? "bg-primary text-primary-foreground font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground"
														}`}
													>
														Facebook
													</button>
													<button
														type="button"
														onClick={() => setPreviewPlatform("twitter")}
														className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
															previewPlatform === "twitter" ? "bg-primary text-primary-foreground font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground"
														}`}
													>
														Twitter / X
													</button>
												</div>
											</div>

											{/* Preview Mockup Container */}
											<div className="rounded-xl border border-border/70 bg-background/90 p-5 overflow-hidden">
												{/* GOOGLE DESKTOP */}
												{previewPlatform === "google-desktop" && (
													<div className="space-y-1.5 max-w-[600px] font-sans">
														<div className="flex items-center gap-2">
															<div className="w-6 h-6 rounded-full bg-muted/60 flex items-center justify-center text-xs overflow-hidden border border-border/50">
																{form.favicon_url ? (
																	<img src={form.favicon_url} alt="" className="w-4 h-4 object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
																) : (
																	<Globe className="w-3.5 h-3.5 text-muted-foreground" />
																)}
															</div>
															<div className="flex flex-col text-[11px] leading-tight">
																<span className="text-foreground font-medium">{form.site_name || "OpusZen"}</span>
																<span className="text-muted-foreground truncate">{form.site_url || "https://opuszen.com"}</span>
															</div>
														</div>
														<h4 className="text-lg text-sky-400 hover:underline cursor-pointer font-medium leading-snug">
															{form.site_title || "OpusZen — AI API Gateway"}
														</h4>
														<p className="text-xs text-muted-foreground/90 leading-relaxed line-clamp-2">
															{form.site_description || "High-performance AI API gateway with automatic failover, rate limiting, and token-based billing."}
														</p>
													</div>
												)}

												{/* GOOGLE MOBILE */}
												{previewPlatform === "google-mobile" && (
													<div className="max-w-[360px] mx-auto p-3 rounded-2xl border border-border/70 bg-card/60 space-y-2">
														<div className="flex items-center gap-2">
															<div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center overflow-hidden">
																<Globe className="w-3 h-3 text-muted-foreground" />
															</div>
															<span className="text-[11px] text-muted-foreground truncate">{form.site_url || "opuszen.com"}</span>
														</div>
														<h4 className="text-sm font-semibold text-sky-400 leading-tight">
															{form.site_title || "OpusZen — AI API Gateway"}
														</h4>
														<p className="text-[11px] text-muted-foreground line-clamp-3">
															{form.site_description || "High-performance AI API gateway with automatic failover, rate limiting, and token-based billing."}
														</p>
													</div>
												)}

												{/* FACEBOOK SHARE CARD */}
												{previewPlatform === "facebook" && (
													<div className="max-w-[500px] mx-auto rounded-xl border border-border/80 bg-card overflow-hidden shadow-md">
														<div className="aspect-[1.91/1] w-full bg-muted/40 flex items-center justify-center relative overflow-hidden">
															{form.og_image ? (
																<img src={form.og_image} alt="OG Share" className="w-full h-full object-cover" />
															) : (
																<div className="flex flex-col items-center gap-2 text-muted-foreground">
																	<Share2 className="w-8 h-8 opacity-40" />
																	<span className="text-xs">No OG Image Set</span>
																</div>
															)}
														</div>
														<div className="p-3.5 space-y-1 bg-card/90 border-t border-border/50">
															<p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono truncate">
																{(form.site_url || "OPUSZEN.COM").replace(/^https?:\/\//, "").toUpperCase()}
															</p>
															<h4 className="text-sm font-bold text-foreground leading-snug line-clamp-1">
																{form.og_title || form.site_title || "OpusZen — AI API Gateway"}
															</h4>
															<p className="text-xs text-muted-foreground line-clamp-2">
																{form.og_description || form.site_description || "High-performance AI API gateway with automatic failover."}
															</p>
														</div>
													</div>
												)}

												{/* TWITTER / X CARD */}
												{previewPlatform === "twitter" && (
													<div className="max-w-[480px] mx-auto rounded-2xl border border-border/80 bg-card overflow-hidden shadow-md">
														{form.twitter_card === "summary_large_image" ? (
															<>
																<div className="aspect-[1.91/1] w-full bg-muted/40 flex items-center justify-center relative overflow-hidden">
																	{form.twitter_image || form.og_image ? (
																		<img src={form.twitter_image || form.og_image} alt="Twitter Card" className="w-full h-full object-cover" />
																	) : (
																		<div className="flex flex-col items-center gap-2 text-muted-foreground">
																			<Share2 className="w-8 h-8 opacity-40" />
																			<span className="text-xs">No Twitter Image Set</span>
																		</div>
																	)}
																</div>
																<div className="p-3 space-y-0.5 bg-card/90 border-t border-border/50">
																	<p className="text-[11px] text-muted-foreground truncate font-mono">
																		{(form.site_url || "opuszen.com").replace(/^https?:\/\//, "")}
																	</p>
																	<h4 className="text-sm font-bold text-foreground line-clamp-1">
																		{form.twitter_title || form.og_title || form.site_title}
																	</h4>
																	<p className="text-xs text-muted-foreground line-clamp-2">
																		{form.twitter_description || form.og_description || form.site_description}
																	</p>
																</div>
															</>
														) : (
															<div className="flex p-3 gap-3">
																<div className="w-20 h-20 rounded-xl bg-muted/40 shrink-0 overflow-hidden flex items-center justify-center">
																	{form.twitter_image || form.og_image ? (
																		<img src={form.twitter_image || form.og_image} alt="" className="w-full h-full object-cover" />
																	) : (
																		<Globe className="w-6 h-6 text-muted-foreground" />
																	)}
																</div>
																<div className="flex-1 min-w-0 space-y-0.5">
																	<p className="text-[11px] text-muted-foreground truncate font-mono">
																		{(form.site_url || "opuszen.com").replace(/^https?:\/\//, "")}
																	</p>
																	<h4 className="text-sm font-bold text-foreground line-clamp-1">
																		{form.twitter_title || form.og_title || form.site_title}
																	</h4>
																	<p className="text-xs text-muted-foreground line-clamp-2">
																		{form.twitter_description || form.og_description || form.site_description}
																	</p>
																</div>
															</div>
														)}
													</div>
												)}
											</div>
										</div>

										{/* OpenGraph Settings Form */}
										<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
													<Share2 className="w-4 h-4" />
												</div>
												<div>
													<h3 className="text-base font-bold text-foreground">Open Graph (Facebook / LinkedIn)</h3>
													<p className="text-xs text-muted-foreground">Configures metadata when shared on social networks</p>
												</div>
											</div>

											<div className="space-y-4">
												<div>
													<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
														OG Title
													</label>
													<input
														type="text"
														name="og_title"
														value={form.og_title}
														onChange={(e) => setForm((f) => ({ ...f, og_title: e.target.value }))}
														placeholder={form.site_title || "OpusZen — AI API Gateway"}
														className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
													/>
												</div>

												<div>
													<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
														OG Description
													</label>
													<textarea
														name="og_description"
														rows={2}
														value={form.og_description}
														onChange={(e) => setForm((f) => ({ ...f, og_description: e.target.value }))}
														placeholder={form.site_description || "High-performance AI API gateway..."}
														className="w-full p-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
													/>
												</div>

												<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
													<div>
														<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
															OG Image URL (1200 × 630 px)
														</label>
														<input
															type="url"
															name="og_image"
															value={form.og_image}
															onChange={(e) => setForm((f) => ({ ...f, og_image: e.target.value }))}
															placeholder="https://opuszen.com/og-image.png"
															className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
														/>
													</div>
													<div>
														<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
															OG Type
														</label>
														<select
															name="og_type"
															value={form.og_type}
															onChange={(e) => setForm((f) => ({ ...f, og_type: e.target.value }))}
															className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer"
														>
															<option value="website">website</option>
															<option value="article">article</option>
															<option value="product">product</option>
														</select>
													</div>
												</div>
											</div>
										</div>

										{/* Twitter Card Settings Form */}
										<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
													<Share2 className="w-4 h-4" />
												</div>
												<div>
													<h3 className="text-base font-bold text-foreground">Twitter / X Card Settings</h3>
													<p className="text-xs text-muted-foreground">Configures tweet cards and handle attribution</p>
												</div>
											</div>

											<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
												<div>
													<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
														Card Type
													</label>
													<select
														name="twitter_card"
														value={form.twitter_card}
														onChange={(e) => setForm((f) => ({ ...f, twitter_card: e.target.value }))}
														className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer"
													>
														<option value="summary_large_image">Summary with Large Image (Recommended)</option>
														<option value="summary">Standard Summary Card</option>
													</select>
												</div>
												<div>
													<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
														Site Handle (@handle)
													</label>
													<input
														type="text"
														name="twitter_site"
														value={form.twitter_site}
														onChange={(e) => setForm((f) => ({ ...f, twitter_site: e.target.value }))}
														placeholder="@OpusZenAI"
														className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
													/>
												</div>
												<div>
													<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
														Creator Handle
													</label>
													<input
														type="text"
														name="twitter_creator"
														value={form.twitter_creator}
														onChange={(e) => setForm((f) => ({ ...f, twitter_creator: e.target.value }))}
														placeholder="@OpusZenAI"
														className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
													/>
												</div>
											</div>

											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
												<div>
													<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
														Custom Twitter Title (Optional)
													</label>
													<input
														type="text"
														name="twitter_title"
														value={form.twitter_title}
														onChange={(e) => setForm((f) => ({ ...f, twitter_title: e.target.value }))}
														placeholder="Falls back to OG Title"
														className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
													/>
												</div>
												<div>
													<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
														Custom Twitter Image URL (Optional)
													</label>
													<input
														type="url"
														name="twitter_image"
														value={form.twitter_image}
														onChange={(e) => setForm((f) => ({ ...f, twitter_image: e.target.value }))}
														placeholder="Falls back to OG Image"
														className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
													/>
												</div>
											</div>
										</div>
									</div>
								)}

								{/* ═══════════════════════════════════════════════════════════════════
								    TAB 3: ANALYTICS & WEBMASTER SCRIPTS
								   ═══════════════════════════════════════════════════════════════════ */}
								{activeTab === "analytics" && (
									<div className="space-y-5">
										{/* Tracking IDs */}
										<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
													<BarChart3 className="w-4 h-4" />
												</div>
												<div>
													<h3 className="text-base font-bold text-foreground">Analytics & Conversion Tracking</h3>
													<p className="text-xs text-muted-foreground">
														Connect Google Analytics and Tag Manager without editing code
													</p>
												</div>
											</div>

											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
												<div>
													<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
														Google Analytics 4 Measurement ID
													</label>
													<input
														type="text"
														name="google_analytics_id"
														value={form.google_analytics_id}
														onChange={(e) => setForm((f) => ({ ...f, google_analytics_id: e.target.value }))}
														placeholder="G-XXXXXXXXXX"
														className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
													/>
													<p className="text-[11px] text-muted-foreground mt-1">
														Found in Google Analytics &gt; Admin &gt; Data Streams
													</p>
												</div>

												<div>
													<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
														Google Tag Manager Container ID
													</label>
													<input
														type="text"
														name="google_tag_manager_id"
														value={form.google_tag_manager_id}
														onChange={(e) => setForm((f) => ({ ...f, google_tag_manager_id: e.target.value }))}
														placeholder="GTM-XXXXXXX"
														className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
													/>
													<p className="text-[11px] text-muted-foreground mt-1">
														Injects GTM script container automatically
													</p>
												</div>
											</div>
										</div>

										{/* Search Console & Webmaster Verification */}
										<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
													<Shield className="w-4 h-4" />
												</div>
												<div>
													<h3 className="text-base font-bold text-foreground">Webmaster Ownership Verification</h3>
													<p className="text-xs text-muted-foreground">
														Verify domain ownership with Google Search Console and Bing Webmaster Tools
													</p>
												</div>
											</div>

											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
												<div>
													<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
														Google Search Console Verification Token
													</label>
													<input
														type="text"
														name="google_site_verification"
														value={form.google_site_verification}
														onChange={(e) => setForm((f) => ({ ...f, google_site_verification: e.target.value }))}
														placeholder="e.g. AbCdEf1234567890..."
														className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
													/>
													<p className="text-[11px] text-muted-foreground mt-1">
														HTML tag method: extracts token from &lt;meta name="google-site-verification" content="..."&gt;
													</p>
												</div>

												<div>
													<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
														Bing Webmaster Tools Verification Token
													</label>
													<input
														type="text"
														name="bing_site_verification"
														value={form.bing_site_verification}
														onChange={(e) => setForm((f) => ({ ...f, bing_site_verification: e.target.value }))}
														placeholder="e.g. 1234567890ABCDEF..."
														className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
													/>
													<p className="text-[11px] text-muted-foreground mt-1">
														Injected as &lt;meta name="msvalidate.01" content="..."&gt;
													</p>
												</div>
											</div>
										</div>

										{/* Custom Head and Footer Script Injection */}
										<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500">
													<Code2 className="w-4 h-4" />
												</div>
												<div>
													<h3 className="text-base font-bold text-foreground">Custom Script & Tag Injection</h3>
													<p className="text-xs text-muted-foreground">
														Add custom header tags, meta pixels, or tracking snippets
													</p>
												</div>
											</div>

											<div className="space-y-4">
												<div>
													<div className="flex items-center justify-between mb-1.5">
														<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
															Custom &lt;head&gt; HTML / Scripts
														</label>
														<span className="text-[11px] text-muted-foreground">Injected before &lt;/head&gt;</span>
													</div>
													<textarea
														name="custom_head_tags"
														rows={4}
														value={form.custom_head_tags}
														onChange={(e) => setForm((f) => ({ ...f, custom_head_tags: e.target.value }))}
														placeholder="<!-- e.g. Custom meta tags, font preloads, or third-party SDKs -->"
														className="w-full p-3 rounded-xl border border-border bg-background/50 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-y"
													/>
												</div>

												<div>
													<div className="flex items-center justify-between mb-1.5">
														<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
															Custom Footer Scripts
														</label>
														<span className="text-[11px] text-muted-foreground">Injected before &lt;/body&gt;</span>
													</div>
													<textarea
														name="custom_footer_scripts"
														rows={4}
														value={form.custom_footer_scripts}
														onChange={(e) => setForm((f) => ({ ...f, custom_footer_scripts: e.target.value }))}
														placeholder="<!-- e.g. Chat widget scripts, heatmaps, or conversion pixels -->"
														className="w-full p-3 rounded-xl border border-border bg-background/50 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-y"
													/>
												</div>
											</div>
										</div>
									</div>
								)}

								{/* ═══════════════════════════════════════════════════════════════════
								    TAB 4: STRUCTURED DATA (SCHEMA.ORG / JSON-LD)
								   ═══════════════════════════════════════════════════════════════════ */}
								{activeTab === "schema" && (
									<div className="space-y-5">
										<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
											<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
												<div className="flex items-center gap-3">
													<div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-500">
														<FileCode className="w-4 h-4" />
													</div>
													<div>
														<h3 className="text-base font-bold text-foreground">Structured Data (Schema.org / JSON-LD)</h3>
														<p className="text-xs text-muted-foreground">
															Provides rich search snippets (SoftwareApplication, Organization, WebSite) for Google
														</p>
													</div>
												</div>

												<div className="flex items-center gap-2">
													<button
														type="button"
														onClick={() => {
															try {
																const parsed = JSON.parse(form.json_ld_schema);
																setForm((f) => ({ ...f, json_ld_schema: JSON.stringify(parsed, null, 2) }));
															} catch {}
														}}
														className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50 text-foreground transition-all cursor-pointer"
													>
														Format JSON
													</button>
													<button
														type="button"
														onClick={() => setForm((f) => ({ ...f, json_ld_schema: DEFAULT_SEO_CONFIG.json_ld_schema }))}
														className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all cursor-pointer"
													>
														Load Default Schema
													</button>
												</div>
											</div>

											<div>
												<div className="flex items-center justify-between mb-2">
													<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
														JSON-LD Schema Markup
													</label>
													<span
														className={`text-[11px] font-medium flex items-center gap-1.5 ${
															jsonLdValidity.valid ? "text-emerald-400" : "text-red-400"
														}`}
													>
														{jsonLdValidity.valid ? (
															<><CheckCircle2 className="w-3.5 h-3.5" /> Valid JSON</>
														) : (
															<><XCircle className="w-3.5 h-3.5" /> {jsonLdValidity.message}</>
														)}
													</span>
												</div>

												<textarea
													name="json_ld_schema"
													rows={12}
													value={form.json_ld_schema}
													onChange={(e) => setForm((f) => ({ ...f, json_ld_schema: e.target.value }))}
													placeholder='{\n  "@context": "https://schema.org",\n  "@type": "SoftwareApplication",\n  "name": "OpusZen"\n}'
													className="w-full p-4 rounded-xl border border-border bg-background/70 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-y"
												/>
											</div>

											<div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
												<p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
													<Info className="w-3.5 h-3.5 text-primary" />
													How Search Engines Use This
												</p>
												<p className="text-xs text-muted-foreground leading-relaxed">
													Google parses this JSON-LD schema to display enhanced rich results in search pages, knowledge panels, and developer tool classifications. You can test your live URL using the official{" "}
													<a
														href="https://search.google.com/test/rich-results"
														target="_blank"
														rel="noopener noreferrer"
														className="text-primary hover:underline font-medium"
													>
														Google Rich Results Test
													</a>
													.
												</p>
											</div>
										</div>
									</div>
								)}

								{/* ═══════════════════════════════════════════════════════════════════
								    TAB 5: ROBOTS.TXT & SITEMAP TOOLS
								   ═══════════════════════════════════════════════════════════════════ */}
								{activeTab === "robots" && (
									<div className="space-y-5">
										{/* Robots.txt editor */}
										<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
											<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
												<div className="flex items-center gap-3">
													<div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
														<Bot className="w-4 h-4" />
													</div>
													<div>
														<h3 className="text-base font-bold text-foreground">Robots.txt Configuration</h3>
														<p className="text-xs text-muted-foreground">
															Instructs search engine crawlers which pages and paths they can or cannot crawl
														</p>
													</div>
												</div>

												<div className="flex items-center gap-2">
													<a
														href="/robots.txt"
														target="_blank"
														rel="noopener noreferrer"
														className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-foreground flex items-center gap-1.5 transition-all"
													>
														<Eye className="w-3.5 h-3.5" />
														View Live /robots.txt
													</a>
												</div>
											</div>

											{/* Quick presets */}
											<div className="flex flex-wrap items-center gap-2">
												<span className="text-xs text-muted-foreground font-medium">Quick Presets:</span>
												<button
													type="button"
													onClick={() =>
														setForm((f) => ({
															...f,
															robots_txt_content: `User-agent: *\nAllow: /\nDisallow: /auth/admin/\nDisallow: /api/\n\nSitemap: ${(f.site_url || "https://opuszen.com").replace(/\/$/, "")}/sitemap.xml`,
														}))
													}
													className="text-[11px] px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 border border-border/50 text-foreground transition-colors cursor-pointer"
												>
													Standard Production (Protect Admin/API)
												</button>
												<button
													type="button"
													onClick={() =>
														setForm((f) => ({
															...f,
															robots_txt_content: `User-agent: *\nAllow: /\n\nSitemap: ${(f.site_url || "https://opuszen.com").replace(/\/$/, "")}/sitemap.xml`,
														}))
													}
													className="text-[11px] px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 border border-border/50 text-foreground transition-colors cursor-pointer"
												>
													Allow All
												</button>
												<button
													type="button"
													onClick={() =>
														setForm((f) => ({
															...f,
															robots_txt_content: `User-agent: *\nDisallow: /`,
														}))
													}
													className="text-[11px] px-2.5 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors cursor-pointer"
												>
													Block All (Staging)
												</button>
											</div>

											<div>
												<textarea
													name="robots_txt_content"
													rows={8}
													value={form.robots_txt_content}
													onChange={(e) => setForm((f) => ({ ...f, robots_txt_content: e.target.value }))}
													placeholder="User-agent: *\nAllow: /"
													className="w-full p-4 rounded-xl border border-border bg-background/70 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-y"
												/>
											</div>
										</div>

										{/* Dynamic Sitemap Tools */}
										<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
											<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
												<div className="flex items-center gap-3">
													<div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
														<FileCode className="w-4 h-4" />
													</div>
													<div>
														<h3 className="text-base font-bold text-foreground">Dynamic XML Sitemap</h3>
														<p className="text-xs text-muted-foreground">
															Automatically generates a fresh, search-engine compliant XML sitemap for all public routes
														</p>
													</div>
												</div>

												<div className="flex items-center gap-3">
													<a
														href="/sitemap.xml"
														target="_blank"
														rel="noopener noreferrer"
														className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-foreground flex items-center gap-1.5 transition-all"
													>
														<Eye className="w-3.5 h-3.5" />
														View Live /sitemap.xml
													</a>
												</div>
											</div>

											<div className="flex items-center justify-between py-3 border-y border-border/40">
												<div>
													<p className="text-sm font-medium text-foreground">Enable Public XML Sitemap (/sitemap.xml)</p>
													<p className="text-xs text-muted-foreground">
														When enabled, search engines can discover all public pages automatically
													</p>
												</div>
												<button
													type="button"
													onClick={() => setForm((f) => ({ ...f, sitemap_enabled: !f.sitemap_enabled }))}
													className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
														form.sitemap_enabled ? "bg-primary" : "bg-muted"
													}`}
												>
													<span
														className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
															form.sitemap_enabled ? "translate-x-[18px]" : "translate-x-1"
														}`}
													/>
												</button>
												<input type="hidden" name="sitemap_enabled" value={String(form.sitemap_enabled)} />
											</div>

											{/* Indexable Routes Table */}
											<div className="space-y-2">
												<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
													Auto-Generated Public Routes in Sitemap
												</p>
												<div className="rounded-xl border border-border overflow-hidden">
													<table className="w-full text-left text-xs">
														<thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/50">
															<tr>
																<th className="px-3 py-2.5">Route Path</th>
																<th className="px-3 py-2.5">Change Frequency</th>
																<th className="px-3 py-2.5">Priority</th>
																<th className="px-3 py-2.5 text-right">Status</th>
															</tr>
														</thead>
														<tbody className="divide-y divide-border/40 font-mono">
															{[
																{ path: "/", freq: "daily", priority: "1.0", status: "Indexed" },
																{ path: "/pricing", freq: "daily", priority: "0.9", status: "Indexed" },
																{ path: "/docs", freq: "weekly", priority: "0.8", status: "Indexed" },
																{ path: "/status", freq: "always", priority: "0.8", status: "Indexed" },
																{ path: "/key-status", freq: "daily", priority: "0.7", status: "Indexed" },
																{ path: "/orders", freq: "daily", priority: "0.6", status: "Indexed" },
																{ path: "/terms", freq: "monthly", priority: "0.4", status: "Indexed" },
																{ path: "/privacy", freq: "monthly", priority: "0.4", status: "Indexed" },
															].map((r) => (
																<tr key={r.path} className="hover:bg-muted/20">
																	<td className="px-3 py-2 text-foreground font-medium">{r.path}</td>
																	<td className="px-3 py-2 text-muted-foreground">{r.freq}</td>
																	<td className="px-3 py-2 text-primary font-semibold">{r.priority}</td>
																	<td className="px-3 py-2 text-right">
																		<span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-sans font-medium">
																			<Check className="w-3 h-3" /> {r.status}
																		</span>
																	</td>
																</tr>
															))}
														</tbody>
													</table>
												</div>
											</div>
										</div>
									</div>
								)}

								{/* ═══════════════════════════════════════════════════════════════════
								    TAB 6: SEO HEALTH AUDIT & EXPORT
								   ═══════════════════════════════════════════════════════════════════ */}
								{activeTab === "audit" && (
									<div className="space-y-5">
										<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
													<CheckCircle2 className="w-4 h-4" />
												</div>
												<div>
													<h3 className="text-base font-bold text-foreground">Automated SEO Health Checklist</h3>
													<p className="text-xs text-muted-foreground">
														Review compliance against search engine best practices and technical guidelines
													</p>
												</div>
											</div>

											{/* Checklist Items */}
											<div className="space-y-2.5">
												{audit.checks.map((c, idx) => (
													<div
														key={idx}
														className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border transition-all ${
															c.passed && !c.warning
																? "bg-emerald-500/5 border-emerald-500/20"
																: c.passed && c.warning
																? "bg-amber-500/5 border-amber-500/20"
																: "bg-red-500/5 border-red-500/20"
														}`}
													>
														<div className="flex items-start gap-3">
															<div className="mt-0.5 shrink-0">
																{c.passed && !c.warning ? (
																	<CheckCircle2 className="w-4 h-4 text-emerald-500" />
																) : c.passed && c.warning ? (
																	<AlertTriangle className="w-4 h-4 text-amber-500" />
																) : (
																	<XCircle className="w-4 h-4 text-red-500" />
																)}
															</div>
															<div>
																<p className="text-xs font-semibold text-foreground">{c.title}</p>
																<p className="text-[11px] text-muted-foreground mt-0.5">{c.desc}</p>
															</div>
														</div>
														<span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-card/60 border border-border/50 text-muted-foreground shrink-0">
															Weight: {c.weight}%
														</span>
													</div>
												))}
											</div>
										</div>

										{/* Export HTML Meta Code */}
										<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-4">
											<div className="flex items-center justify-between gap-3">
												<div>
													<h3 className="text-base font-bold text-foreground">Generated HTML &lt;meta&gt; Tags</h3>
													<p className="text-xs text-muted-foreground">
														Copy ready-to-use HTML meta tags for static pages or external sites
													</p>
												</div>
												<button
													type="button"
													onClick={copyToClipboard}
													className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
												>
													{copiedHtml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
													{copiedHtml ? "Copied to Clipboard!" : "Copy Code"}
												</button>
											</div>

											<pre className="p-4 rounded-xl bg-background/80 border border-border overflow-x-auto text-[11px] font-mono text-foreground/90 leading-relaxed max-h-60 custom-scrollbar">
												<code>{generatedHtml}</code>
											</pre>
										</div>
									</div>
								)}

								{/* ═══════════════════════════════════════════════════════════════════
								    STICKY BOTTOM SAVE BAR
								   ═══════════════════════════════════════════════════════════════════ */}
								<div className="sticky bottom-4 z-20 flex items-center justify-between p-4 rounded-2xl bg-card/95 border border-border/80 backdrop-blur shadow-xl">
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<Sparkles className="w-4 h-4 text-primary" />
										<span>All changes apply instantly to public search tags & headers.</span>
									</div>

									<button
										type="submit"
										disabled={isSubmitting}
										className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
									>
										{isSubmitting ? (
											<>
												<RefreshCw className="w-4 h-4 animate-spin" />
												Saving Changes…
											</>
										) : (
											<>
												<Save className="w-4 h-4" />
												Save SEO Configuration
											</>
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
