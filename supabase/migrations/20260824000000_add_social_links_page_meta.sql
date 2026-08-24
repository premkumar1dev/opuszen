-- ============================================================
-- SEO & Social Media Extensions for OpusZen
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Extend site_config with new columns (llms, humans, GA fields already exist)
ALTER TABLE IF EXISTS site_config
 ADD COLUMN IF NOT EXISTS llms_txt_content TEXT DEFAULT '',
 ADD COLUMN IF NOT EXISTS llms_txt_enabled BOOLEAN DEFAULT true,
 ADD COLUMN IF NOT EXISTS humans_txt_content TEXT DEFAULT '',
 ADD COLUMN IF NOT EXISTS humans_txt_enabled BOOLEAN DEFAULT true;

-- 2. Social links table
CREATE TABLE IF NOT EXISTS site_social_links (
 id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 platform TEXT NOT NULL DEFAULT 'x',
 url TEXT NOT NULL DEFAULT '',
 label TEXT DEFAULT '',
 icon TEXT DEFAULT '',
 visible BOOLEAN DEFAULT true,
 sort_order INTEGER DEFAULT 0,
 created_at TIMESTAMPTZ DEFAULT now(),
 updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_links_visible ON site_social_links(visible);
CREATE INDEX IF NOT EXISTS idx_social_links_sort ON site_social_links(sort_order);

-- Seed with default social links
INSERT INTO site_social_links (platform, url, label, visible, sort_order) VALUES
 ('x', 'https://x.com/OpusZenAI', 'Twitter / X', true, 1),
 ('github', 'https://github.com/opuszen', 'GitHub', true, 2),
 ('discord', 'https://discord.gg/opuszen', 'Discord', true, 3),
 ('linkedin', 'https://linkedin.com/company/opuszen', 'LinkedIn', true, 4),
 ('youtube', 'https://youtube.com/@opuszen', 'YouTube', false, 5),
 ('instagram', 'https://instagram.com/opuszen', 'Instagram', false, 6),
 ('email', 'mailto:admin@opuszen.com', 'Email', true, 7)
ON CONFLICT DO NOTHING;

-- 3. Per-page meta table
CREATE TABLE IF NOT EXISTS site_page_meta (
 id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 route_path TEXT NOT NULL UNIQUE,
 meta_title TEXT DEFAULT '',
 meta_description TEXT DEFAULT '',
 meta_keywords TEXT DEFAULT '',
 og_title TEXT DEFAULT '',
 og_description TEXT DEFAULT '',
 og_image TEXT DEFAULT '',
 no_index BOOLEAN DEFAULT false,
 updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_meta_route ON site_page_meta(route_path);

-- Seed with default per-page meta
INSERT INTO site_page_meta (route_path, meta_title, meta_description, meta_keywords, no_index) VALUES
 ('/', 'OpusZen — AI API Gateway', 'OpusZen is a high-performance AI API gateway with automatic failover, rate limiting, and token-based billing.', 'AI API, Claude, GPT, OpenAI', false),
 ('/pricing', 'Pricing | OpusZen', 'OpusZen API plans — transparent pricing with no hidden fees. Rent a plan and get your API key in seconds.', 'pricing, AI API plans, Claude pricing', false),
 ('/docs', 'Documentation | OpusZen', 'Documentation for OpusZen — Anthropic-compatible API gateway. Quick start, API reference, models, and IDE configuration.', 'docs, API docs, Claude API docs', false),
 ('/status', 'Status | OpusZen', 'Real-time service status and uptime for OpusZen API gateway.', 'status, uptime, service status', false),
 ('/key-status', 'Key Status | OpusZen', 'Check your OpusZen API key status, usage, and rate limits in real-time.', 'API key status, usage, rate limits', false),
 ('/orders', 'Orders | OpusZen', 'View and manage your OpusZen orders and subscriptions.', 'orders, subscriptions, billing', false),
 ('/terms', 'Terms of Service | OpusZen', 'Terms of Service for OpusZen — Anthropic-compatible API gateway.', 'terms of service, legal', false),
 ('/privacy', 'Privacy Policy | OpusZen', 'Privacy Policy for OpusZen — Anthropic-compatible API gateway.', 'privacy policy, data privacy', false)
ON CONFLICT (route_path) DO NOTHING;
