import { supabaseServer } from "~/utils/supabase.server";
import { type SeoConfig, type SocialLink, type PageMeta, DEFAULT_SEO_CONFIG } from "~/types/seo";

export type { SeoConfig, SocialLink, PageMeta };
export { DEFAULT_SEO_CONFIG };

// ─── Cache ──────────────────────────────────────────────────────────────────
let cachedConfig: { data: SeoConfig; timestamp: number } | null = null;
const CACHE_TTL_MS = 30_000;

function isCacheValid(): boolean {
	return cachedConfig !== null && Date.now() - cachedConfig.timestamp < CACHE_TTL_MS;
}

// ─── Site Config (SeoConfig) ─────────────────────────────────────────────────

export async function getSeoConfig(): Promise<SeoConfig> {
	if (isCacheValid()) return cachedConfig!.data;

	try {
		const { data, error } = await (supabaseServer as any)
			.from("site_config")
			.select("*")
			.limit(1)
			.maybeSingle();

		if (error || !data) return DEFAULT_SEO_CONFIG;

		const merged: SeoConfig = {
			...DEFAULT_SEO_CONFIG,
			...data,
			robots_index: data.robots_index !== undefined ? Boolean(data.robots_index) : DEFAULT_SEO_CONFIG.robots_index,
			robots_follow: data.robots_follow !== undefined ? Boolean(data.robots_follow) : DEFAULT_SEO_CONFIG.robots_follow,
			sitemap_enabled: data.sitemap_enabled !== undefined ? Boolean(data.sitemap_enabled) : DEFAULT_SEO_CONFIG.sitemap_enabled,
			llms_txt_enabled: data.llms_txt_enabled !== undefined ? Boolean(data.llms_txt_enabled) : DEFAULT_SEO_CONFIG.llms_txt_enabled,
			humans_txt_enabled: data.humans_txt_enabled !== undefined ? Boolean(data.humans_txt_enabled) : DEFAULT_SEO_CONFIG.humans_txt_enabled,
			llms_txt_content: data.llms_txt_content || DEFAULT_SEO_CONFIG.llms_txt_content,
			humans_txt_content: data.humans_txt_content || DEFAULT_SEO_CONFIG.humans_txt_content,
		};

		cachedConfig = { data: merged, timestamp: Date.now() };
		return merged;
	} catch {
		return DEFAULT_SEO_CONFIG;
	}
}

export async function updateSeoConfig(updates: Partial<SeoConfig>): Promise<{ success: boolean; data?: SeoConfig; error?: string }> {
	try {
		const { data: existing } = await (supabaseServer as any)
			.from("site_config")
			.select("id")
			.limit(1)
			.maybeSingle();

		const payload = { ...updates, updated_at: new Date().toISOString() };

		let result: any;
		if (existing?.id) {
			result = await (supabaseServer as any)
				.from("site_config")
				.update(payload)
				.eq("id", existing.id)
				.select()
				.single();
		} else {
			result = await (supabaseServer as any)
				.from("site_config")
				.insert(payload)
				.select()
				.single();
		}

		if (result.error) {
			return { success: false, error: result.error.message };
		}

		cachedConfig = null;
		return {
			success: true,
			data: { ...DEFAULT_SEO_CONFIG, ...result.data },
		};
	} catch (err: any) {
		return { success: false, error: err?.message || "Failed to update SEO config" };
	}
}

// ─── Social Links ────────────────────────────────────────────────────────────

export async function getAllSocialLinks(): Promise<SocialLink[]> {
	try {
		const { data, error } = await (supabaseServer as any)
			.from("site_social_links")
			.select("*")
			.order("sort_order", { ascending: true })
			.order("platform", { ascending: true });

		if (error || !data) return [];
		return data.map((row: any) => ({
			id: row.id,
			platform: row.platform,
			url: row.url || "",
			label: row.label || "",
			icon: row.icon || "",
			visible: Boolean(row.visible),
			sort_order: row.sort_order || 0,
		}));
	} catch {
		return [];
	}
}

export async function getVisibleSocialLinks(): Promise<SocialLink[]> {
	const all = await getAllSocialLinks();
	return all.filter((link) => link.visible);
}

export async function upsertSocialLink(link: Partial<SocialLink>): Promise<{ success: boolean; data?: SocialLink; error?: string }> {
	try {
		const payload = {
			platform: link.platform || "x",
			url: link.url || "",
			label: link.label || "",
			icon: link.icon || "",
			visible: link.visible ?? true,
			sort_order: link.sort_order ?? 0,
			updated_at: new Date().toISOString(),
		};

		let result: any;
		if (link.id) {
			result = await (supabaseServer as any)
				.from("site_social_links")
				.update(payload)
				.eq("id", link.id)
				.select()
				.single();
		} else {
			result = await (supabaseServer as any)
				.from("site_social_links")
				.insert(payload)
				.select()
				.single();
		}

		if (result.error) {
			return { success: false, error: result.error.message };
		}

		return {
			success: true,
			data: {
				id: result.data.id,
				platform: result.data.platform,
				url: result.data.url,
				label: result.data.label,
				icon: result.data.icon,
				visible: Boolean(result.data.visible),
				sort_order: result.data.sort_order,
			},
		};
	} catch (err: any) {
		return { success: false, error: err?.message || "Failed to save social link" };
	}
}

export async function deleteSocialLink(id: string): Promise<{ success: boolean; error?: string }> {
	try {
		const { error } = await (supabaseServer as any)
			.from("site_social_links")
			.delete()
			.eq("id", id);

		if (error) {
			return { success: false, error: error.message };
		}
		return { success: true };
	} catch (err: any) {
		return { success: false, error: err?.message || "Failed to delete social link" };
	}
}

export async function toggleSocialLinkVisibility(id: string, visible: boolean): Promise<{ success: boolean; error?: string }> {
	try {
		const { error } = await (supabaseServer as any)
			.from("site_social_links")
			.update({ visible, updated_at: new Date().toISOString() })
			.eq("id", id);

		if (error) {
			return { success: false, error: error.message };
		}
		return { success: true };
	} catch (err: any) {
		return { success: false, error: err?.message || "Failed to toggle visibility" };
	}
}

export async function reorderSocialLinks(orderedIds: string[]): Promise<{ success: boolean; error?: string }> {
	try {
		for (let i = 0; i < orderedIds.length; i++) {
			await (supabaseServer as any)
				.from("site_social_links")
				.update({ sort_order: i, updated_at: new Date().toISOString() })
				.eq("id", orderedIds[i]);
		}
		return { success: true };
	} catch (err: any) {
		return { success: false, error: err?.message || "Failed to reorder" };
	}
}

// ─── Page Meta ───────────────────────────────────────────────────────────────

export async function getAllPageMeta(): Promise<PageMeta[]> {
	try {
		const { data, error } = await (supabaseServer as any)
			.from("site_page_meta")
			.select("*")
			.order("route_path", { ascending: true });

		if (error || !data) return [];
		return data.map((row: any) => ({
			id: row.id,
			route_path: row.route_path,
			meta_title: row.meta_title || "",
			meta_description: row.meta_description || "",
			meta_keywords: row.meta_keywords || "",
			og_title: row.og_title || "",
			og_description: row.og_description || "",
			og_image: row.og_image || "",
			no_index: Boolean(row.no_index),
			updated_at: row.updated_at || "",
		}));
	} catch {
		return [];
	}
}

export async function getPageMetaByRoute(routePath: string): Promise<PageMeta | null> {
	try {
		const { data, error } = await (supabaseServer as any)
			.from("site_page_meta")
			.select("*")
			.eq("route_path", routePath)
			.maybeSingle();

		if (error || !data) return null;
		return {
			id: data.id,
			route_path: data.route_path,
			meta_title: data.meta_title || "",
			meta_description: data.meta_description || "",
			meta_keywords: data.meta_keywords || "",
			og_title: data.og_title || "",
			og_description: data.og_description || "",
			og_image: data.og_image || "",
			no_index: Boolean(data.no_index),
			updated_at: data.updated_at || "",
		};
	} catch {
		return null;
	}
}

export async function upsertPageMeta(meta: Partial<PageMeta>): Promise<{ success: boolean; data?: PageMeta; error?: string }> {
	if (!meta.route_path) {
		return { success: false, error: "route_path is required" };
	}

	try {
		const payload = {
			route_path: meta.route_path,
			meta_title: meta.meta_title ?? "",
			meta_description: meta.meta_description ?? "",
			meta_keywords: meta.meta_keywords ?? "",
			og_title: meta.og_title ?? "",
			og_description: meta.og_description ?? "",
			og_image: meta.og_image ?? "",
			no_index: meta.no_index ?? false,
			updated_at: new Date().toISOString(),
		};

		let result: any;
		if (meta.id) {
			result = await (supabaseServer as any)
				.from("site_page_meta")
				.update(payload)
				.eq("id", meta.id)
				.select()
				.single();
		} else {
			// Check if exists
			const { data: existing } = await (supabaseServer as any)
				.from("site_page_meta")
				.select("id")
				.eq("route_path", meta.route_path)
				.maybeSingle();

			if (existing?.id) {
				result = await (supabaseServer as any)
					.from("site_page_meta")
					.update(payload)
					.eq("id", existing.id)
					.select()
					.single();
			} else {
				result = await (supabaseServer as any)
					.from("site_page_meta")
					.insert(payload)
					.select()
					.single();
			}
		}

		if (result.error) {
			return { success: false, error: result.error.message };
		}

		return {
			success: true,
			data: {
				id: result.data.id,
				route_path: result.data.route_path,
				meta_title: result.data.meta_title || "",
				meta_description: result.data.meta_description || "",
				meta_keywords: result.data.meta_keywords || "",
				og_title: result.data.og_title || "",
				og_description: result.data.og_description || "",
				og_image: result.data.og_image || "",
				no_index: Boolean(result.data.no_index),
				updated_at: result.data.updated_at || "",
			},
		};
	} catch (err: any) {
		return { success: false, error: err?.message || "Failed to save page meta" };
	}
}

export async function deletePageMeta(id: string): Promise<{ success: boolean; error?: string }> {
	try {
		const { error } = await (supabaseServer as any)
			.from("site_page_meta")
			.delete()
			.eq("id", id);

		if (error) {
			return { success: false, error: error.message };
		}
		return { success: true };
	} catch (err: any) {
		return { success: false, error: err?.message || "Failed to delete page meta" };
	}
}

// ─── Meta Merging Utility ────────────────────────────────────────────────────

export interface MergedMeta {
	title: string;
	description: string;
	keywords: string;
	ogTitle: string;
	ogDescription: string;
	ogImage: string;
	noIndex: boolean;
}

export function mergePageMeta(config: SeoConfig, pageMeta: PageMeta | null): MergedMeta {
	return {
		title: pageMeta?.meta_title || config.site_title || config.site_name || "OpusZen",
		description: pageMeta?.meta_description || config.site_description || "",
		keywords: pageMeta?.meta_keywords || config.keywords || "",
		ogTitle: pageMeta?.og_title || config.og_title || config.site_title || "OpusZen",
		ogDescription: pageMeta?.og_description || config.og_description || config.site_description || "",
		ogImage: pageMeta?.og_image || config.og_image || `${(config.site_url || "https://opuszen.com").replace(/\/$/, "")}/logo.png`,
		noIndex: pageMeta?.no_index || false,
	};
}

// ─── Sitemap XML Generator ───────────────────────────────────────────────────

export function generateSitemapXml(config: SeoConfig, pageMetas: PageMeta[] = []): string {
	const baseUrl = (config.site_url || "https://opuszen.com").replace(/\/$/, "");
	const today = new Date().toISOString().split("T")[0];

	const staticRoutes = [
		{ path: "/", priority: "1.0", changefreq: "daily" },
		{ path: "/pricing", priority: "0.9", changefreq: "daily" },
		{ path: "/docs", priority: "0.8", changefreq: "weekly" },
		{ path: "/status", priority: "0.8", changefreq: "always" },
		{ path: "/key-status", priority: "0.7", changefreq: "daily" },
		{ path: "/orders", priority: "0.6", changefreq: "daily" },
		{ path: "/terms", priority: "0.4", changefreq: "monthly" },
		{ path: "/privacy", priority: "0.4", changefreq: "monthly" },
	];

	// Add page_meta routes that have entries and are not no_index
	const customRoutes = pageMetas
		.filter((pm) => !pm.no_index && pm.route_path)
		.map((pm) => ({ path: pm.route_path, priority: "0.5", changefreq: "weekly" }));

	// Deduplicate: staticRoutes first, then add any custom routes not already there
	const allRoutes = [...staticRoutes];
	for (const cr of customRoutes) {
		if (!allRoutes.find((r) => r.path === cr.path)) {
			allRoutes.push(cr);
		}
	}

	const urlsXml = allRoutes
		.map(
			(r) => ` <url>
 <loc>${baseUrl}${r.path}</loc>
 <lastmod>${today}</lastmod>
 <changefreq>${r.changefreq}</changefreq>
 <priority>${r.priority}</priority>
 </url>`
		)
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
 xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
 xmlns:xhtml="http://www.w3.org/1999/xhtml"
 xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
 xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urlsXml}
</urlset>`;
}

// ─── Robots.txt Generator ────────────────────────────────────────────────────

export function generateRobotsTxt(config: SeoConfig): string {
	if (config.robots_txt_content && config.robots_txt_content.trim()) {
		return config.robots_txt_content.trim() + "\n";
	}
	const baseUrl = (config.site_url || "https://opuszen.com").replace(/\/$/, "");
	return `User-agent: *
Allow: /
Disallow: /auth/admin/
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
}

// ─── LLMs.txt Generator ─────────────────────────────────────────────────────

export function generateLlmsTxt(config: SeoConfig): string {
	if (!config.llms_txt_enabled) {
		return "# LLMs.txt is disabled\n";
	}
	return (config.llms_txt_content || DEFAULT_SEO_CONFIG.llms_txt_content).trim() + "\n";
}

// ─── Humans.txt Generator ───────────────────────────────────────────────────

export function generateHumansTxt(config: SeoConfig): string {
	if (!config.humans_txt_enabled) {
		return "# Humans.txt is disabled\n";
	}
	return (config.humans_txt_content || DEFAULT_SEO_CONFIG.humans_txt_content).trim() + "\n";
}
