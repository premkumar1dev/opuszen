-- ============================================================================
-- Enterprise API Gateway - Database Schema
-- All tables for Master Keys, User Keys, Logs, Failover, Health, Settings
-- ============================================================================

-- -------------------------------
-- Master API Keys (upstream provider keys)
-- -------------------------------
DROP TABLE IF EXISTS public.master_api_keys;
CREATE TABLE public.master_api_keys (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 provider TEXT NOT NULL DEFAULT 'OpenAI',
 name TEXT NOT NULL,
 api_key TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'quota_exhausted', 'temporarily_failed', 'rate_limited')),
 priority INTEGER NOT NULL DEFAULT 100,
 total_credits NUMERIC(12,2) NOT NULL DEFAULT 0,
 used_credits NUMERIC(12,2) NOT NULL DEFAULT 0,
 remaining_credits NUMERIC(12,2) NOT NULL DEFAULT 0,
 total_requests INTEGER NOT NULL DEFAULT 0,
 success_requests INTEGER NOT NULL DEFAULT 0,
 failed_requests INTEGER NOT NULL DEFAULT 0,
 last_used TIMESTAMPTZ,
 last_failure TIMESTAMPTZ,
 failure_count INTEGER NOT NULL DEFAULT 0,
 health_status TEXT NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'rate_limited', 'unhealthy', 'quota_exhausted', 'disabled')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_master_keys_status ON public.master_api_keys(status);
CREATE INDEX IF NOT EXISTS idx_master_keys_priority ON public.master_api_keys(priority);
CREATE INDEX IF NOT EXISTS idx_master_keys_health ON public.master_api_keys(health_status);

ALTER TABLE public.master_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_keys_read_admin" ON public.master_api_keys FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "master_keys_insert_admin" ON public.master_api_keys FOR INSERT WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "master_keys_update_admin" ON public.master_api_keys FOR UPDATE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "master_keys_delete_admin" ON public.master_api_keys FOR DELETE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Seed data
INSERT INTO public.master_api_keys (provider, name, api_key, status, priority, total_credits, remaining_credits)
VALUES
 ('OpenAI', 'OpenAI Primary', 'sk-proj-placeholder-1', 'active', 1, 500.00, 500.00),
 ('Anthropic', 'Claude Primary', 'sk-ant-placeholder-1', 'active', 2, 500.00, 500.00),
 ('OpenAI', 'OpenAI Backup', 'sk-proj-placeholder-2', 'active', 3, 300.00, 300.00),
 ('Google', 'Gemini Primary', 'AIza-placeholder-1', 'active', 4, 200.00, 200.00)
ON CONFLICT DO NOTHING;

-- -------------------------------
-- User API Keys
-- -------------------------------
DROP TABLE IF EXISTS public.user_api_keys;
CREATE TABLE public.user_api_keys (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 api_key TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL DEFAULT 'Default Key',
 status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'expired', 'revoked')),
 allocated_credits NUMERIC(10,2) NOT NULL DEFAULT 0,
 used_credits NUMERIC(10,2) NOT NULL DEFAULT 0,
 remaining_credits NUMERIC(10,2) NOT NULL DEFAULT 0,
 expiry_date TIMESTAMPTZ,
 rate_limit INTEGER NOT NULL DEFAULT 60,
 allowed_models JSONB DEFAULT '[]'::jsonb,
 allowed_providers JSONB DEFAULT '[]'::jsonb,
 total_requests INTEGER NOT NULL DEFAULT 0,
 success_requests INTEGER NOT NULL DEFAULT 0,
 failed_requests INTEGER NOT NULL DEFAULT 0,
 last_used TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_key ON public.user_api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON public.user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_status ON public.user_api_keys(status);

ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_api_keys_read_own" ON public.user_api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_api_keys_read_admin" ON public.user_api_keys FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "user_api_keys_insert_admin" ON public.user_api_keys FOR INSERT WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "user_api_keys_update_admin" ON public.user_api_keys FOR UPDATE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "user_api_keys_delete_admin" ON public.user_api_keys FOR DELETE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- -------------------------------
-- API Request Logs
-- -------------------------------
DROP TABLE IF EXISTS public.api_request_logs;
CREATE TABLE public.api_request_logs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id TEXT NOT NULL,
 user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
 user_api_key_id UUID REFERENCES public.user_api_keys(id) ON DELETE SET NULL,
 user_api_key_prefix TEXT NOT NULL DEFAULT '',
 master_api_key_id UUID REFERENCES public.master_api_keys(id) ON DELETE SET NULL,
 master_key_prefix TEXT NOT NULL DEFAULT '',
 provider TEXT NOT NULL DEFAULT '',
 model TEXT NOT NULL DEFAULT '',
 prompt_tokens INTEGER NOT NULL DEFAULT 0,
 completion_tokens INTEGER NOT NULL DEFAULT 0,
 total_tokens INTEGER NOT NULL DEFAULT 0,
 credits_used NUMERIC(10,4) NOT NULL DEFAULT 0,
 response_time_ms INTEGER NOT NULL DEFAULT 0,
 http_status INTEGER NOT NULL DEFAULT 0,
 is_success BOOLEAN NOT NULL DEFAULT false,
 error_message TEXT DEFAULT '',
 ip_address TEXT DEFAULT '',
 user_agent TEXT DEFAULT '',
 request_body JSONB DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_request_id ON public.api_request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON public.api_request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON public.api_request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON public.api_request_logs(http_status);
CREATE INDEX IF NOT EXISTS idx_api_logs_master_key ON public.api_request_logs(master_api_key_id);

ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_logs_read_admin" ON public.api_request_logs FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "api_logs_insert_system" ON public.api_request_logs FOR INSERT WITH CHECK (true);

-- -------------------------------
-- API Failover Logs
-- -------------------------------
DROP TABLE IF EXISTS public.api_failover_logs;
CREATE TABLE public.api_failover_logs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id TEXT NOT NULL,
 original_master_key_id UUID REFERENCES public.master_api_keys(id) ON DELETE SET NULL,
 new_master_key_id UUID REFERENCES public.master_api_keys(id) ON DELETE SET NULL,
 original_provider TEXT NOT NULL DEFAULT '',
 new_provider TEXT NOT NULL DEFAULT '',
 failure_reason TEXT NOT NULL DEFAULT '',
 http_status INTEGER,
 error_message TEXT DEFAULT '',
 retry_number INTEGER NOT NULL DEFAULT 1,
 model TEXT NOT NULL DEFAULT '',
 ip_address TEXT DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_failover_logs_request ON public.api_failover_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_failover_logs_created ON public.api_failover_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_failover_logs_original_key ON public.api_failover_logs(original_master_key_id);

ALTER TABLE public.api_failover_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "failover_logs_read_admin" ON public.api_failover_logs FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "failover_logs_insert_system" ON public.api_failover_logs FOR INSERT WITH CHECK (true);

-- -------------------------------
-- Provider Health Status
-- -------------------------------
DROP TABLE IF EXISTS public.provider_health;
CREATE TABLE public.provider_health (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 master_api_key_id UUID NOT NULL REFERENCES public.master_api_keys(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'rate_limited', 'unhealthy', 'quota_exhausted', 'disabled')),
 consecutive_failures INTEGER NOT NULL DEFAULT 0,
 consecutive_successes INTEGER NOT NULL DEFAULT 0,
 last_check TIMESTAMPTZ NOT NULL DEFAULT now(),
 last_success TIMESTAMPTZ,
 last_failure TIMESTAMPTZ,
 last_error TEXT DEFAULT '',
 avg_response_time_ms INTEGER DEFAULT 0,
 total_checks INTEGER NOT NULL DEFAULT 0,
 success_rate NUMERIC(5,2) NOT NULL DEFAULT 100.00,
 retry_after TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(master_api_key_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_health_status ON public.provider_health(status);
CREATE INDEX IF NOT EXISTS idx_provider_health_key ON public.provider_health(master_api_key_id);

ALTER TABLE public.provider_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_health_read_admin" ON public.provider_health FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "provider_health_insert_system" ON public.provider_health FOR INSERT WITH CHECK (true);
CREATE POLICY "provider_health_update_system" ON public.provider_health FOR UPDATE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Seed health records for existing master keys
INSERT INTO public.provider_health (master_api_key_id, status, success_rate)
SELECT id, 'healthy', 100.00 FROM public.master_api_keys
ON CONFLICT DO NOTHING;

-- -------------------------------
-- Usage Statistics (aggregated)
-- -------------------------------
DROP TABLE IF EXISTS public.usage_statistics;
CREATE TABLE public.usage_statistics (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 date DATE NOT NULL DEFAULT CURRENT_DATE,
 master_api_key_id UUID REFERENCES public.master_api_keys(id) ON DELETE SET NULL,
 provider TEXT NOT NULL DEFAULT '',
 total_requests INTEGER NOT NULL DEFAULT 0,
 success_requests INTEGER NOT NULL DEFAULT 0,
 failed_requests INTEGER NOT NULL DEFAULT 0,
 total_tokens INTEGER NOT NULL DEFAULT 0,
 total_credits NUMERIC(12,4) NOT NULL DEFAULT 0,
 avg_response_time_ms INTEGER DEFAULT 0,
 failover_count INTEGER NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(date, master_api_key_id)
);

CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON public.usage_statistics(date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_stats_master_key ON public.usage_statistics(master_api_key_id);

ALTER TABLE public.usage_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_stats_read_admin" ON public.usage_statistics FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "usage_stats_insert_system" ON public.usage_statistics FOR INSERT WITH CHECK (true);

-- -------------------------------
-- User Credit History
-- -------------------------------
DROP TABLE IF EXISTS public.user_credit_history;
CREATE TABLE public.user_credit_history (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 user_api_key_id UUID REFERENCES public.user_api_keys(id) ON DELETE SET NULL,
 action TEXT NOT NULL CHECK (action IN ('allocated', 'used', 'refunded', 'reset', 'expired', 'purchased')),
 amount NUMERIC(10,4) NOT NULL DEFAULT 0,
 balance_after NUMERIC(10,2) NOT NULL DEFAULT 0,
 description TEXT DEFAULT '',
 request_id TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_history_user ON public.user_credit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_history_created ON public.user_credit_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_history_action ON public.user_credit_history(action);

ALTER TABLE public.user_credit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_history_read_own" ON public.user_credit_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credit_history_read_admin" ON public.user_credit_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "credit_history_insert_system" ON public.user_credit_history FOR INSERT WITH CHECK (true);

-- -------------------------------
-- Gateway Configuration Settings
-- -------------------------------
DROP TABLE IF EXISTS public.gateway_config;
CREATE TABLE public.gateway_config (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 key TEXT NOT NULL UNIQUE,
 value TEXT NOT NULL DEFAULT '',
 value_type TEXT NOT NULL DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
 description TEXT DEFAULT '',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gateway_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gateway_config_read_admin" ON public.gateway_config FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "gateway_config_upsert_admin" ON public.gateway_config FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "gateway_config_update_admin" ON public.gateway_config FOR UPDATE USING (auth.role() = 'authenticated');

-- Seed default gateway settings
INSERT INTO public.gateway_config (key, value, value_type, description) VALUES
 ('retry_count', '3', 'number', 'Number of retry attempts on failover'),
 ('retry_delay_ms', '1000', 'number', 'Delay between retries in milliseconds'),
 ('failover_enabled', 'true', 'boolean', 'Enable automatic failover between master keys'),
 ('health_check_interval_seconds', '60', 'number', 'Interval between health checks in seconds'),
 ('request_timeout_ms', '120000', 'number', 'HTTP request timeout in milliseconds'),
 ('auto_disable_failed_keys', 'true', 'boolean', 'Automatically disable keys after repeated failures'),
 ('auto_recover_keys', 'true', 'boolean', 'Automatically re-enable keys after cooldown period'),
 ('auto_recover_after_minutes', '30', 'number', 'Minutes before auto-recovering a failed key'),
 ('max_consecutive_failures', '5', 'number', 'Max failures before key is auto-disabled'),
 ('rate_limit_window_minutes', '1', 'number', 'Rate limit window in minutes'),
 ('default_rate_limit', '60', 'number', 'Default requests per minute rate limit'),
 ('supported_providers', '["OpenAI","Anthropic","Google","Groq","Mistral","Cohere","AI21"]', 'json', 'List of supported AI providers')
ON CONFLICT DO NOTHING;
