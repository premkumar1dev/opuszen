import type { SeoConfig, PageMeta } from "~/types/seo";

export interface UserPageConfig {
	path: string;
	label: string;
	badge: string;
	defaultTitle: string;
	defaultDescription: string;
	defaultKeywords: string;
}

export const DEFAULT_USER_PAGES: UserPageConfig[] = [
	{
		path: "/",
		label: "Home / Landing",
		badge: "Main",
		defaultTitle: "OpusZen — High-Performance AI API Gateway",
		defaultDescription:
			"OpusZen is a high-performance AI API gateway with automatic failover, rate limiting, and token-based billing. Get your API key in seconds.",
		defaultKeywords:
			"AI API gateway, Claude API, Anthropic Claude, LLM failover, AI token billing, OpusZen, developer API",
	},
	{
		path: "/pricing",
		label: "Pricing Plans",
		badge: "Conversion",
		defaultTitle: "Pricing Plans — Transparent AI API Access | OpusZen",
		defaultDescription:
			"Explore OpusZen API plans — transparent pricing with zero hidden fees. Instant key activation, flexible concurrency, and reliable failover.",
		defaultKeywords:
			"OpusZen pricing, AI API pricing, Claude API cost, buy AI API key, pay as you go AI gateway",
	},
	{
		path: "/docs",
		label: "Documentation",
		badge: "Developer",
		defaultTitle: "Documentation & API Reference | OpusZen",
		defaultDescription:
			"Complete developer documentation for OpusZen. Anthropic-compatible API gateway setup, quickstart guide, code examples, and SDK integration.",
		defaultKeywords:
			"OpusZen docs, AI gateway documentation, Anthropic API integration, Claude API reference, SDK guide",
	},
	{
		path: "/status",
		label: "System Status",
		badge: "Monitoring",
		defaultTitle: "Live System Status & API Health | OpusZen",
		defaultDescription:
			"Check real-time health, latency, uptime, and incident reports for OpusZen AI API Gateway endpoints and model providers.",
		defaultKeywords:
			"OpusZen status, AI API uptime, gateway health monitor, system latency, API status page",
	},
	{
		path: "/key-status",
		label: "Key Status Checker",
		badge: "User Tool",
		defaultTitle: "Check API Key Status & Balance | OpusZen",
		defaultDescription:
			"Verify your OpusZen API key status, remaining token credits, active plan validity, and rate limits in real time.",
		defaultKeywords:
			"check API key, OpusZen key balance, API credit checker, token validity checker",
	},
	{
		path: "/orders",
		label: "Order Lookup & History",
		badge: "User Tool",
		defaultTitle: "Track Order & Subscription | OpusZen",
		defaultDescription:
			"Lookup and track your OpusZen plan purchases, order details, invoices, and key activations using your Order ID or email.",
		defaultKeywords:
			"OpusZen orders, track order, API subscription history, invoice lookup",
	},
	{
		path: "/terms",
		label: "Terms of Service",
		badge: "Legal",
		defaultTitle: "Terms of Service | OpusZen",
		defaultDescription:
			"Read the Terms of Service for using OpusZen AI API Gateway, billing policies, key management guidelines, and acceptable use.",
		defaultKeywords:
			"OpusZen terms, terms of service, API gateway terms, usage agreement",
	},
	{
		path: "/privacy",
		label: "Privacy Policy",
		badge: "Legal",
		defaultTitle: "Privacy Policy | OpusZen",
		defaultDescription:
			"OpusZen privacy policy explaining how we handle and protect your data, account details, and API communications securely.",
		defaultKeywords:
			"OpusZen privacy, privacy policy, data protection, API security",
	},
];

/**
 * Builds standard React Router meta tags based on root loader SEO data and per-page meta override.
 */
export function buildPageMetaTags(
	matches: any[],
	routePath: string,
	fallback?: {
		title?: string;
		description?: string;
		keywords?: string;
	}
) {
	const rootData = matches?.[0]?.data as
		| { seoConfig?: SeoConfig; allPageMeta?: PageMeta[] }
		| undefined;

	const seoConfig = rootData?.seoConfig;
	const allPageMeta = rootData?.allPageMeta || [];

	const pageConfig = DEFAULT_USER_PAGES.find((p) => p.path === routePath);
	const customMeta = allPageMeta.find((p) => p.route_path === routePath);

	const siteName = seoConfig?.site_name || "OpusZen";
	const siteUrl = (seoConfig?.site_url || "https://opuszen.com").replace(/\/$/, "");

	// Title
	const title =
		customMeta?.meta_title ||
		fallback?.title ||
		pageConfig?.defaultTitle ||
		seoConfig?.site_title ||
		`${siteName} — AI API Gateway`;

	// Description
	const description =
		customMeta?.meta_description ||
		fallback?.description ||
		pageConfig?.defaultDescription ||
		seoConfig?.site_description ||
		"";

	// Keywords
	const keywords =
		customMeta?.meta_keywords ||
		fallback?.keywords ||
		pageConfig?.defaultKeywords ||
		seoConfig?.keywords ||
		"";

	// OpenGraph Image
	const ogImage =
		customMeta?.og_image ||
		seoConfig?.og_image ||
		`${siteUrl}/logo.png`;

	// OpenGraph Title & Description
	const ogTitle = customMeta?.og_title || title;
	const ogDescription = customMeta?.og_description || description;

	// Robots
	const isNoIndex = customMeta?.no_index ?? false;
	const robots = isNoIndex
		? "noindex, nofollow"
		: seoConfig?.robots_index
		? "index, follow" + (seoConfig?.robots_custom ? ", " + seoConfig.robots_custom : "")
		: "noindex, nofollow";

	const canonicalUrl = `${siteUrl}${routePath === "/" ? "" : routePath}`;

	const tags: any[] = [
		{ title },
		{ name: "description", content: description },
		{ name: "keywords", content: keywords },
		{ name: "robots", content: robots },
		{ property: "og:site_name", content: siteName },
		{ property: "og:type", content: "website" },
		{ property: "og:url", content: canonicalUrl },
		{ property: "og:title", content: ogTitle },
		{ property: "og:description", content: ogDescription },
		{ property: "og:image", content: ogImage },
		{ property: "twitter:card", content: seoConfig?.twitter_card || "summary_large_image" },
		{ property: "twitter:title", content: ogTitle },
		{ property: "twitter:description", content: ogDescription },
		{ property: "twitter:image", content: ogImage },
	];

	if (seoConfig?.twitter_site) {
		tags.push({ property: "twitter:site", content: seoConfig.twitter_site });
	}

	return tags;
}
