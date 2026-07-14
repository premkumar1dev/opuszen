-- ==========================================================
-- OPUSZEN CONSOLIDATED DATABASE MIGRATIONS
-- Apply this entire file in Supabase Dashboard SQL Editor
-- ==========================================================

-- ----------------------------------------------------------
-- Migration File: 003_persistent_rate_limits_token_windows_and_key_encryption.sql
-- ----------------------------------------------------------
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


-- ----------------------------------------------------------
-- Migration File: 20250712000000_create_users_table.sql
-- ----------------------------------------------------------
-- Create users table for OpusZen admin management
-- Apply this in: Supabase Dashboard > SQL Editor

DROP TABLE IF EXISTS public.users;

CREATE TABLE public.users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 username TEXT NOT NULL UNIQUE,
 password TEXT NOT NULL,
 name TEXT NOT NULL,
 phone_number TEXT NOT NULL DEFAULT '',
 account_balance NUMERIC NOT NULL DEFAULT 0.00,
 total_orders INTEGER NOT NULL DEFAULT 0,
 total_spent NUMERIC NOT NULL DEFAULT 0.00,
 created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast filtering and sorting
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_name ON public.users(name);
CREATE INDEX IF NOT EXISTS idx_users_created ON public.users(created_at DESC);

-- IMPORTANT: Passwords should be hashed via bcrypt/argon2 server-side before insert
-- Consider migrating to Supabase Auth for password management

-- Enable RLS -- restrict access to authenticated users only
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read for authenticated" ON public.users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users insert for authenticated" ON public.users FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users update for authenticated" ON public.users FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users delete for authenticated" ON public.users FOR DELETE USING (auth.role() = 'authenticated');


-- ----------------------------------------------------------
-- Migration File: 20250712000001_create_plans_table.sql
-- ----------------------------------------------------------
-- Plans table for subscription pricing
create table if not exists public.plans (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 description text,
 duration_days integer not null default 30,
 price numeric(10,2) not null default 0,
 currency text not null default 'INR',
 features jsonb default '[]'::jsonb,
 multiplier numeric(4,2) not null default 1,
 is_active boolean not null default true,
 sort_order integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;

create policy "allow_read_plans"
 on public.plans for select
 to anon, authenticated
 using (true);

create policy "allow_insert_plans_auth"
 on public.plans for insert
 to authenticated
 with check (true);

create policy "allow_update_plans_auth"
 on public.plans for update
 to authenticated
 using (true);

create policy "allow_delete_plans_auth"
 on public.plans for delete
 to authenticated
 using (true);

create index if not exists idx_plans_active on public.plans(is_active);
create index if not exists idx_plans_sort on public.plans(sort_order);


-- ----------------------------------------------------------
-- Migration File: 20250712000002_create_orders_table.sql
-- ----------------------------------------------------------
-- Create orders table for OpusZen admin management
-- Apply this in: Supabase Dashboard > SQL Editor

DROP TABLE IF EXISTS public.orders;

CREATE TABLE public.orders (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 username TEXT NOT NULL,
 plan_name TEXT NOT NULL,
 amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
 currency TEXT NOT NULL DEFAULT 'INR',
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
 payment_method TEXT DEFAULT '',
 payment_ref TEXT DEFAULT '',
 coupon_code TEXT DEFAULT '',
 discount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
 final_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
 notes TEXT DEFAULT '',
 completed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ DEFAULT now(),
 updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_username ON public.orders(username);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_plan ON public.orders(plan_name);

-- Enable RLS -- restrict access to authenticated users only
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Orders read for authenticated" ON public.orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Orders insert for authenticated" ON public.orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Orders update for authenticated" ON public.orders FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Orders delete for authenticated" ON public.orders FOR DELETE USING (auth.role() = 'authenticated');


-- ----------------------------------------------------------
-- Migration File: 20250712000003_seed_orders.sql
-- ----------------------------------------------------------
-- Seed orders with realistic data linked to existing usernames from the users table
INSERT INTO public.orders (username, plan_name, amount, currency, status, payment_method, payment_ref, coupon_code, discount, final_amount, notes, completed_at, created_at, updated_at) VALUES
 ('aarav_patel', 'Starter Plan (1x)', 499.00, 'INR', 'completed', 'UPI', 'txn_upi_aarav_001', 'WELCOME10', 49.90, 449.10, 'First purchase via UPI', now() - interval '40 days', now() - interval '45 days', now() - interval '40 days'),
 ('aarav_patel', 'Pro Plan (5x)', 1999.00, 'INR', 'completed', 'Credit Card', 'cc_stripe_aarav_002', '', 0.00, 1999.00, 'Upgraded from Starter', now() - interval '10 days', now() - interval '15 days', now() - interval '10 days'),
 ('mei_chen', 'Enterprise Plan (20x)', 4999.00, 'INR', 'completed', 'PayPal', 'pp_mei_chen_003', 'SAVE500', 500.00, 4499.00, 'Enterprise annual plan', now() - interval '28 days', now() - interval '32 days', now() - interval '28 days'),
 ('mei_chen', 'Pro Plan (5x)', 1999.00, 'INR', 'completed', 'Credit Card', 'cc_stripe_mei_004', '', 0.00, 1999.00, 'Mid-tier upgrade', now() - interval '20 days', now() - interval '25 days', now() - interval '20 days'),
 ('carlos_silva', 'Starter Plan (1x)', 499.00, 'INR', 'completed', 'Debit Card', 'dc_carlos_005', '', 0.00, 499.00, 'New user starter plan', now() - interval '85 days', now() - interval '90 days', now() - interval '85 days'),
 ('carlos_silva', 'Starter Plan (1x)', 499.00, 'INR', 'cancelled', 'UPI', 'txn_upi_carlos_006', '', 0.00, 499.00, 'Cancelled within refund window', now() - interval '82 days', now() - interval '84 days', now() - interval '82 days'),
 ('fatima_ahmed', 'Pro Plan (5x)', 1999.00, 'INR', 'completed', 'Bank Transfer', 'bt_fatima_007', 'LOYAL20', 399.80, 1599.20, 'Loyalty discount applied', now() - interval '115 days', now() - interval '125 days', now() - interval '115 days'),
 ('fatima_ahmed', 'Enterprise Plan (20x)', 4999.00, 'INR', 'failed', 'Credit Card', 'cc_stripe_fatima_008', '', 0.00, 4999.00, 'Payment declined — insufficient funds', now() - interval '60 days', now() - interval '65 days', now() - interval '60 days'),
 ('fatima_ahmed', 'Enterprise Plan (20x)', 4999.00, 'INR', 'completed', 'Credit Card', 'cc_stripe_fatima_009', '', 0.00, 4999.00, 'Retry after failed attempt', now() - interval '58 days', now() - interval '62 days', now() - interval '58 days'),
 ('liam_murphy', 'Starter Plan (1x)', 499.00, 'INR', 'completed', 'Apple Pay', 'ap_liam_010', 'NEWUSER', 49.90, 449.10, 'New user discount', now() - interval '5 days', now() - interval '10 days', now() - interval '5 days'),
 ('yuki_tanaka', 'Pro Plan (5x)', 1999.00, 'INR', 'completed', 'Credit Card', 'cc_stripe_yuki_011', '', 0.00, 1999.00, 'Standard pro plan', now() - interval '55 days', now() - interval '62 days', now() - interval '55 days'),
 ('yuki_tanaka', 'Pro Plan (5x)', 1999.00, 'INR', 'refunded', 'Credit Card', 'cc_stripe_yuki_012', '', 0.00, 1999.00, 'Refunded — feature not as expected', now() - interval '50 days', now() - interval '55 days', now() - interval '45 days'),
 ('omar_khan', 'Enterprise Plan (20x)', 4999.00, 'INR', 'completed', 'Bank Transfer', 'bt_omar_013', 'BULK50', 2499.50, 2499.50, 'Bulk enterprise deal', now() - interval '75 days', now() - interval '85 days', now() - interval '75 days'),
 ('omar_khan', 'Pro Plan (5x)', 1999.00, 'INR', 'completed', 'UPI', 'txn_upi_omar_014', '', 0.00, 1999.00, 'Additional plan purchase', now() - interval '20 days', now() - interval '28 days', now() - interval '20 days'),
 ('omar_khan', 'Enterprise Plan (20x)', 4999.00, 'INR', 'pending', '', '', '', 0.00, 4999.00, 'Awaiting payment confirmation', now() - interval '78 days', now() - interval '82 days', now() - interval '78 days'),
 ('sofia_rossi', 'Starter Plan (1x)', 499.00, 'INR', 'completed', 'PayPal', 'pp_sofia_015', 'TRYFREE', 49.90, 449.10, 'Trial converted to paid', now() - interval '10 days', now() - interval '15 days', now() - interval '10 days'),
 ('kai_park', 'Starter Plan (1x)', 499.00, 'INR', 'cancelled', 'Credit Card', 'cc_stripe_kai_016', '', 0.00, 499.00, 'Cancelled before activation', now() - interval '22 days', now() - interval '25 days', now() - interval '22 days'),
 ('kai_park', 'Starter Plan (1x)', 499.00, 'INR', 'pending', '', '', '', 0.00, 499.00, 'Awaiting payment', now() - interval '20 days', now() - interval '24 days', now() - interval '20 days'),
 ('priya_sharma', 'Pro Plan (5x)', 1999.00, 'INR', 'completed', 'UPI', 'txn_upi_priya_017', 'VIP20', 399.80, 1599.20, 'VIP customer', now() - interval '95 days', now() - interval '105 days', now() - interval '95 days'),
 ('priya_sharma', 'Enterprise Plan (20x)', 4999.00, 'INR', 'completed', 'Bank Transfer', 'bt_priya_018', 'BULK50', 2499.50, 2499.50, 'Annual enterprise renewal', now() - interval '85 days', now() - interval '100 days', now() - interval '85 days'),
 ('priya_sharma', 'Pro Plan (5x)', 1999.00, 'INR', 'completed', 'UPI', 'txn_upi_priya_019', '', 0.00, 1999.00, 'Additional license pack', now() - interval '30 days', now() - interval '40 days', now() - interval '30 days'),
 ('ethan_obrien', 'Starter Plan (1x)', 499.00, 'INR', 'completed', 'Credit Card', 'cc_stripe_ethan_020', '', 0.00, 499.00, 'Quick signup', now() - interval '2 days', now() - interval '3 days', now() - interval '2 days'),
 ('aisha_hassan', 'Pro Plan (5x)', 1999.00, 'INR', 'completed', 'PayPal', 'pp_aisha_021', 'WELCOME10', 199.90, 1799.10, 'Welcome discount applied', now() - interval '50 days', now() - interval '58 days', now() - interval '50 days'),
 ('noah_fischer', 'Enterprise Plan (20x)', 4999.00, 'INR', 'completed', 'Bank Transfer', 'bt_noah_022', '', 0.00, 4999.00, 'Enterprise plan — recurring', now() - interval '195 days', now() - interval '205 days', now() - interval '195 days'),
 ('noah_fischer', 'Enterprise Plan (20x)', 4999.00, 'INR', 'completed', 'Bank Transfer', 'bt_noah_023', '', 0.00, 4999.00, 'Enterprise renewal', now() - interval '165 days', now() - interval '175 days', now() - interval '165 days'),
 ('noah_fischer', 'Pro Plan (5x)', 1999.00, 'INR', 'completed', 'Credit Card', 'cc_stripe_noah_024', '', 0.00, 1999.00, 'Downgrade for off-season', now() - interval '100 days', now() - interval '110 days', now() - interval '100 days'),
 ('zara_ali', 'Starter Plan (1x)', 499.00, 'INR', 'completed', 'UPI', 'txn_upi_zara_025', '', 0.00, 499.00, 'Single plan purchase', now() - interval '15 days', now() - interval '20 days', now() - interval '15 days'),
 ('zara_ali', 'Starter Plan (1x)', 499.00, 'INR', 'failed', 'UPI', 'txn_upi_zara_026', '', 0.00, 499.00, 'UPI timeout — retry pending', now() - interval '12 days', now() - interval '16 days', now() - interval '12 days'),
 ('raj_singh', 'Starter Plan (1x)', 499.00, 'INR', 'completed', 'Credit Card', 'cc_stripe_raj_027', '', 0.00, 499.00, 'Standard purchase', now() - interval '35 days', now() - interval '42 days', now() - interval '35 days'),
 ('raj_singh', 'Pro Plan (5x)', 1999.00, 'INR', 'completed', 'Credit Card', 'cc_stripe_raj_028', 'LOYAL20', 399.80, 1599.20, 'Loyal customer discount', now() - interval '25 days', now() - interval '38 days', now() - interval '25 days'),
 ('aarav_patel', 'Pro Plan (5x)', 1999.00, 'INR', 'pending', 'UPI', 'txn_upi_aarav_029', '', 0.00, 1999.00, 'Awaiting UPI confirmation', now() - interval '8 days', now() - interval '10 days', now() - interval '8 days'),
 ('mei_chen', 'Pro Plan (5x)', 1999.00, 'INR', 'refunded', 'PayPal', 'pp_mei_chen_030', '', 0.00, 1999.00, 'Refunded — accidental double charge', now() - interval '18 days', now() - interval '22 days', now() - interval '14 days'),
 ('omar_khan', 'Pro Plan (5x)', 1999.00, 'INR', 'completed', 'Bank Transfer', 'bt_omar_031', '', 0.00, 1999.00, 'Team plan addition', now() - interval '40 days', now() - interval '50 days', now() - interval '40 days'),
 ('priya_sharma', 'Enterprise Plan (20x)', 4999.00, 'INR', 'completed', 'Bank Transfer', 'bt_priya_032', '', 0.00, 4999.00, 'Tier upgrade for team expansion', now() - interval '50 days', now() - interval '65 days', now() - interval '50 days'),
 ('noah_fischer', 'Pro Plan (5x)', 1999.00, 'INR', 'completed', 'Credit Card', 'cc_stripe_noah_033', '', 0.00, 1999.00, 'Seasonal plan', now() - interval '140 days', now() - interval '150 days', now() - interval '140 days'),
 ('fatima_ahmed', 'Starter Plan (1x)', 499.00, 'INR', 'cancelled', 'UPI', 'txn_upi_fatima_034', '', 0.00, 499.00, 'Cancelled — chose different plan', now() - interval '90 days', now() - interval '93 days', now() - interval '90 days'),
 ('carlos_silva', 'Pro Plan (5x)', 1999.00, 'INR', 'completed', 'Credit Card', 'cc_stripe_carlos_035', '', 0.00, 1999.00, 'Upgraded from starter', now() - interval '75 days', now() - interval '85 days', now() - interval '75 days'),
 ('sofia_rossi', 'Starter Plan (1x)', 499.00, 'INR', 'failed', 'Credit Card', 'cc_stripe_sofia_036', '', 0.00, 499.00, 'Card expired at payment time', now() - interval '12 days', now() - interval '14 days', now() - interval '12 days'),
 ('kai_park', 'Starter Plan (1x)', 499.00, 'INR', 'completed', 'Credit Card', 'cc_stripe_kai_037', 'NEWUSER', 49.90, 449.10, 'Second attempt succeeded', now() - interval '18 days', now() - interval '23 days', now() - interval '18 days'),
 ('ethan_obrien', 'Starter Plan (1x)', 499.00, 'INR', 'failed', 'UPI', 'txn_upi_ethan_038', '', 0.00, 499.00, 'UPI app not responding', now() - interval '1 day', now() - interval '2 days', now() - interval '1 day'),
 ('aisha_hassan', 'Pro Plan (5x)', 1999.00, 'INR', 'pending', 'PayPal', 'pp_aisha_039', '', 0.00, 1999.00, 'PayPal pending verification', now() - interval '3 days', now() - interval '5 days', now() - interval '3 days'),
 ('raj_singh', 'Enterprise Plan (20x)', 4999.00, 'INR', 'completed', 'Credit Card', 'cc_stripe_raj_040', 'BULK50', 2499.50, 2499.50, 'Enterprise upgrade with coupon', now() - interval '38 days', now() - interval '50 days', now() - interval '38 days')
ON CONFLICT DO NOTHING;


-- ----------------------------------------------------------
-- Migration File: 20250712000004_create_payment_gateway_settings.sql
-- ----------------------------------------------------------
-- Create payment_gateway_settings table for OpusZen admin
-- Apply this in: Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 gateway_name TEXT NOT NULL DEFAULT 'KhiladiXPro',
 is_active BOOLEAN NOT NULL DEFAULT false,
 api_key TEXT NOT NULL DEFAULT '',
 api_base_url TEXT NOT NULL DEFAULT 'https://khilaadixpro.shop',
 create_order_endpoint TEXT NOT NULL DEFAULT '/api/create-order',
 check_status_endpoint TEXT NOT NULL DEFAULT '/api/check-order-status',
 webhook_secret TEXT DEFAULT '',
 test_mode BOOLEAN NOT NULL DEFAULT false,
 created_at TIMESTAMPTZ DEFAULT now(),
 updated_at TIMESTAMPTZ DEFAULT now()
);

-- Only allow one row (singleton settings)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_gateway_singleton ON public.payment_gateway_settings ((true));

-- Enable RLS
ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;

-- Admin can manage payment gateway settings
CREATE POLICY "Allow authenticated read" ON public.payment_gateway_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON public.payment_gateway_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON public.payment_gateway_settings FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON public.payment_gateway_settings FOR DELETE USING (auth.role() = 'authenticated');

-- Seed with default values (configure api_key and webhook_secret via Admin Panel)
INSERT INTO public.payment_gateway_settings (
 gateway_name, is_active, api_key, api_base_url,
 create_order_endpoint, check_status_endpoint, webhook_secret, test_mode
) VALUES (
 'KhiladiXPro', false, '', 'https://khilaadixpro.shop',
 '/api/create-order', '/api/check-order-status', '', false
) ON CONFLICT DO NOTHING;


-- ----------------------------------------------------------
-- Migration File: 20260712105330_sync_auth_users.sql
-- ----------------------------------------------------------
-- Alter password column to have default empty string
ALTER TABLE public.users ALTER COLUMN password SET DEFAULT '';

-- Create trigger function to sync new auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, password, name, phone_number, account_balance, total_orders, total_spent)
  VALUES (
    new.id,
    new.email,
    '', -- Empty password for auth-based users
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    0.00,
    0,
    0.00
  )
  ON CONFLICT (username) DO UPDATE
  SET id = EXCLUDED.id,
      name = COALESCE(EXCLUDED.name, public.users.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------------
-- Migration File: 20260713000000_create_site_config.sql
-- ----------------------------------------------------------
-- Create site_config table for OpusZen admin
-- Apply this in: Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.site_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT NOT NULL DEFAULT 'OpusZen',
  logo_url TEXT NOT NULL DEFAULT '',
  favicon_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Only allow one row (singleton settings)
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_config_singleton ON public.site_config ((true));

-- Enable RLS -- public read allowed (site config is displayed publicly), mutations require auth
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site config read public" ON public.site_config FOR SELECT USING (true);
CREATE POLICY "Site config insert authenticated" ON public.site_config FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Site config update authenticated" ON public.site_config FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Site config delete authenticated" ON public.site_config FOR DELETE USING (auth.role() = 'authenticated');

-- Seed with default values
INSERT INTO public.site_config (
  site_name, logo_url, favicon_url
) VALUES (
  'OpusZen', '', ''
) ON CONFLICT DO NOTHING;


-- ----------------------------------------------------------
-- Migration File: 20260713000001_create_gateway_tables.sql
-- ----------------------------------------------------------
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
 ('https://api.opusmax.live/v1', 'OpusLive Primary', 'sk-placeholder-key', 'active', 1, 999999.00, 999999.00)
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


