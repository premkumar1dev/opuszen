export interface SeoConfig {
	id?: string;
	site_name: string;
	site_title: string;
	site_tagline: string;
	site_description: string;
	keywords: string;
	author: string;
	site_url: string;
	logo_url: string;
	favicon_url: string;
	og_title: string;
	og_description: string;
	og_image: string;
	og_type: string;
	twitter_card: string;
	twitter_site: string;
	twitter_creator: string;
	twitter_title: string;
	twitter_description: string;
	twitter_image: string;
	robots_index: boolean;
	robots_follow: boolean;
	robots_custom: string;
	google_analytics_id: string;
	google_tag_manager_id: string;
	google_site_verification: string;
	bing_site_verification: string;
	custom_head_tags: string;
	custom_footer_scripts: string;
	json_ld_schema: string;
	robots_txt_content: string;
	sitemap_enabled: boolean;
	updated_at?: string;
}

export const DEFAULT_SEO_CONFIG: SeoConfig = {
	site_name: "OpusZen",
	site_title: "OpusZen — AI API Gateway",
	site_tagline: "High-performance AI API Gateway with Automatic Failover",
	site_description:
		"OpusZen is a high-performance AI API gateway with automatic failover, rate limiting, and token-based billing. Get your API key in seconds.",
	keywords:
		"AI API gateway, Claude API, OpenAI API, Anthropic, LLM failover, AI token billing, OpusZen, developer API",
	author: "OpusZen Team",
	site_url: "https://opuszen.com",
	logo_url: "https://opuszen.com/logo.png",
	favicon_url: "/favicon.ico",
	og_title: "OpusZen — AI API Gateway",
	og_description:
		"High-performance AI API gateway with failover, rate limiting, and token billing.",
	og_image: "https://opuszen.com/logo.png",
	og_type: "website",
	twitter_card: "summary_large_image",
	twitter_site: "@OpusZenAI",
	twitter_creator: "@OpusZenAI",
	twitter_title: "OpusZen — AI API Gateway",
	twitter_description:
		"High-performance AI API gateway with failover, rate limiting, and token billing.",
	twitter_image: "https://opuszen.com/logo.png",
	robots_index: true,
	robots_follow: true,
	robots_custom: "max-image-preview:large, max-snippet:-1, max-video-preview:-1",
	google_analytics_id: "",
	google_tag_manager_id: "",
	google_site_verification: "",
	bing_site_verification: "",
	custom_head_tags: "",
	custom_footer_scripts: "",
	json_ld_schema: JSON.stringify(
		{
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			name: "OpusZen",
			applicationCategory: "DeveloperApplication",
			operatingSystem: "Cloud / Web API",
			offers: {
				"@type": "Offer",
				price: "0",
				priceCurrency: "USD",
			},
			description:
				"High-performance AI API gateway with automatic failover, rate limiting, and token-based billing.",
			url: "https://opuszen.com",
		},
		null,
		2
	),
	robots_txt_content: `User-agent: *\nAllow: /\nDisallow: /auth/admin/\nDisallow: /api/\n\nSitemap: https://opuszen.com/sitemap.xml`,
	sitemap_enabled: true,
};
