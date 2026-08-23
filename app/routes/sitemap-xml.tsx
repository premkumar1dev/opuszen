import { getSeoConfig, generateSitemapXml } from "~/utils/seo-service.server";

export async function loader() {
	const config = await getSeoConfig();
	if (!config.sitemap_enabled) {
		return new Response("Sitemap is disabled in admin settings", {
			status: 404,
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	}
	const content = generateSitemapXml(config);
	return new Response(content, {
		status: 200,
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600, s-maxage=86400",
		},
	});
}

export default function SitemapXml() {
	return null;
}
