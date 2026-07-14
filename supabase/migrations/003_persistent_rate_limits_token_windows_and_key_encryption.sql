-- ===========================================================================
-- Migration 003: Persistent Rate Limiting, Token Windows, Key Encryption
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Persistent rate limiting table
-- Replaces the in-memory rateLimitMap. Stores per-user-key sliding-window
-- counters so rate limits survive restarts and work across instances.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_rate_limits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_api_key_id text NOT NULL,
 window_start bigint NOT NULL, -- unix ms of window start
 request_count integer NOT NULL DEFAULT 1,
 created_at timestamptz DEFAULT now(),
 updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_rate_limits_key_window
 ON public.user_rate_limits (user_api_key_id, window_start DESC);

-- ---------------------------------------------------------------------------
-- 2. Token usage windows (5-hour rolling)
-- Tracks per-user-key token consumption in rolling 5-hour windows.
-- Used to enforce "5-hour usage window" limits mentioned in the docs.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.token_usage_windows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_api_key_id text NOT NULL,
 window_start timestamptz NOT NULL,
 window_end timestamptz NOT NULL,
 prompt_tokens bigint NOT NULL DEFAULT 0,
 completion_tokens bigint NOT NULL DEFAULT 0,
 total_tokens bigint NOT NULL DEFAULT 0,
 request_count integer NOT NULL DEFAULT 0,
 created_at timestamptz DEFAULT now(),
 updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_token_windows_key_time
 ON public.token_usage_windows (user_api_key_id, window_start DESC);

-- ---------------------------------------------------------------------------
-- 3. Encrypted columns for master_api_keys
-- Stores AES-256-GCM encrypted API keys so secrets never sit in plaintext.
-- ---------------------------------------------------------------------------
ALTER TABLE public.master_api_keys
 ADD COLUMN IF NOT EXISTS encrypted_api_key text,
 ADD COLUMN IF NOT EXISTS key_encryption_iv text;

-- RLS policies (allow service role to read/write; drop if they already exist
-- from a prior partial migration).
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_rate_limits') THEN
 -- policies already exist, skip
 NULL;
 ELSE
 ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;
 CREATE POLICY "service_all" ON public.user_rate_limits FOR ALL USING (true);
 END IF;
END;
$$;

DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'token_usage_windows') THEN
 NULL;
 ELSE
 ALTER TABLE public.token_usage_windows ENABLE ROW LEVEL SECURITY;
 CREATE POLICY "service_all" ON public.token_usage_windows FOR ALL USING (true);
 END IF;
END;
$$;
