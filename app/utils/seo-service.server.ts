import { supabaseServer } from "~/utils/supabase.server";
import { type SeoConfig, DEFAULT_SEO_CONFIG } from "~/types/seo";

export type { SeoConfig };
export { DEFAULT_SEO_CONFIG };

// Simple in-memory cache with 30s TTL
let cachedConfig: { data: SeoConfig; timestamp: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getSeoConfig(): Promise<SeoConfig> {
	const now = Date.now();
	if (cachedConfig && now - cachedConfig.timestamp < CACHE_TTL_MS) {
		return cachedConfig.data;
	}

	try {
		const { data, error } = await (supabaseServer as any)
			.from("site_config")
			.select("*")
			.limit(1)
			.maybeSingle();

		if (error || !data) {
			return DEFAULT_SEO_CONFIG;
		}

		const merged: SeoConfig = {
			...DEFAULT_SEO_CONFIG,
			...data,
			robots_index: data.robots_index !== undefined ? Boolean(data.robots_index) : DEFAULT_SEO_CONFIG.robots_index,
			robots_follow: data.robots_follow !== undefined ? Boolean(data.robots_follow) : DEFAULT_SEO_CONFIG.robots_follow,
			sitemap_enabled: data.sitemap_enabled !== undefined ? Boolean(data.sitemap_enabled) : DEFAULT_SEO_CONFIG.sitemap_enabled,
		};

		cachedConfig = { data: merged, timestamp: now };
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

		const payload = {
			...updates,
			updated_at: new Date().toISOString(),
		};

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

		// Clear cache
		cachedConfig = null;

		return {
			success: true,
			data: { ...DEFAULT_SEO_CONFIG, ...result.data },
		};
	} catch (err: any) {
		return { success: false, error: err?.message || "Failed to update SEO config" };
	}
}

export function generateSitemapXml(config: SeoConfig): string {
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

	const urlsXml = staticRoutes
		.map(
			(r) => `  <url>
    <loc>${baseUrl}${r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
		)
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;
}

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
