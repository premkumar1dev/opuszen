-- Migration: Add SEO and Tools Configuration to site_config
-- Apply this in: Supabase Dashboard > SQL Editor or via Supabase CLI

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS site_title TEXT NOT NULL DEFAULT 'OpusZen — AI API Gateway',
  ADD COLUMN IF NOT EXISTS site_tagline TEXT NOT NULL DEFAULT 'High-performance AI API Gateway with Automatic Failover',
  ADD COLUMN IF NOT EXISTS site_description TEXT NOT NULL DEFAULT 'OpusZen is a high-performance AI API gateway with automatic failover, rate limiting, and token-based billing. Get your API key in seconds.',
  ADD COLUMN IF NOT EXISTS keywords TEXT NOT NULL DEFAULT 'AI API gateway, Claude API, OpenAI API, LLM failover, AI token billing, OpusZen',
  ADD COLUMN IF NOT EXISTS author TEXT NOT NULL DEFAULT 'OpusZen Team',
  ADD COLUMN IF NOT EXISTS site_url TEXT NOT NULL DEFAULT 'https://opuszen.com',
  ADD COLUMN IF NOT EXISTS og_title TEXT NOT NULL DEFAULT 'OpusZen — AI API Gateway',
  ADD COLUMN IF NOT EXISTS og_description TEXT NOT NULL DEFAULT 'High-performance AI API gateway with failover, rate limiting, and token billing.',
  ADD COLUMN IF NOT EXISTS og_image TEXT NOT NULL DEFAULT 'https://opuszen.com/logo.png',
  ADD COLUMN IF NOT EXISTS og_type TEXT NOT NULL DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS twitter_card TEXT NOT NULL DEFAULT 'summary_large_image',
  ADD COLUMN IF NOT EXISTS twitter_site TEXT NOT NULL DEFAULT '@OpusZenAI',
  ADD COLUMN IF NOT EXISTS twitter_creator TEXT NOT NULL DEFAULT '@OpusZenAI',
  ADD COLUMN IF NOT EXISTS twitter_title TEXT NOT NULL DEFAULT 'OpusZen — AI API Gateway',
  ADD COLUMN IF NOT EXISTS twitter_description TEXT NOT NULL DEFAULT 'High-performance AI API gateway with failover, rate limiting, and token billing.',
  ADD COLUMN IF NOT EXISTS twitter_image TEXT NOT NULL DEFAULT 'https://opuszen.com/logo.png',
  ADD COLUMN IF NOT EXISTS robots_index BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS robots_follow BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS robots_custom TEXT NOT NULL DEFAULT 'max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  ADD COLUMN IF NOT EXISTS google_analytics_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS google_tag_manager_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS google_site_verification TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bing_site_verification TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS custom_head_tags TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS custom_footer_scripts TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS json_ld_schema TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS robots_txt_content TEXT NOT NULL DEFAULT 'User-agent: *
Allow: /
Disallow: /auth/admin/
Disallow: /api/

Sitemap: https://opuszen.com/sitemap.xml',
  ADD COLUMN IF NOT EXISTS sitemap_enabled BOOLEAN NOT NULL DEFAULT true;
