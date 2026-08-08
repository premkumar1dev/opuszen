-- ============================================================================
-- Admin Plan Management System
-- Stores custom OpusZen plans that override OpusLive internal plan branding.
-- Customers should NEVER see OpusLive plan names (5X, 20X, etc.).
-- ============================================================================

-- -------------------------------
-- Admin Plans
-- -------------------------------
CREATE TABLE IF NOT EXISTS public.admin_plans (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

 -- Core identity
 name TEXT NOT NULL, -- internal slug (e.g. "starter")
 display_name TEXT NOT NULL, -- customer-facing name (e.g. "Starter Plus")

 -- Visual
 badge_color TEXT DEFAULT '#6366f1', -- badge pill color (hex)
 icon TEXT DEFAULT 'Star', -- plan icon identifier

 -- Description & features
 description TEXT DEFAULT '',
 features JSONB DEFAULT '[]'::jsonb, -- array of feature strings

 -- Pricing
 monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
 daily_token_limit INTEGER DEFAULT 0, -- 0 = unlimited
 monthly_token_limit INTEGER DEFAULT 0, -- 0 = unlimited

 -- Model access
 model_access JSONB DEFAULT '[]'::jsonb, -- array of allowed model names

 -- Status & ordering
 is_active BOOLEAN NOT NULL DEFAULT true,
 is_visible BOOLEAN NOT NULL DEFAULT true,
 priority INTEGER NOT NULL DEFAULT 0,
 sort_order INTEGER NOT NULL DEFAULT 0,

 -- Metadata
 notes TEXT DEFAULT '',
 is_system BOOLEAN NOT NULL DEFAULT false, -- true = built-in, cannot be deleted

 -- Timestamps
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Plan name must be unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_plans_name ON public.admin_plans(name);

ALTER TABLE public.admin_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_plans_read_admin"
 ON public.admin_plans FOR SELECT
 USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin_plans_insert_admin"
 ON public.admin_plans FOR INSERT
 WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin_plans_update_admin"
 ON public.admin_plans FOR UPDATE
 USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin_plans_delete_admin"
 ON public.admin_plans FOR DELETE
 USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' AND is_system = false);

-- Public can read active, visible plans (for the customer-facing pricing page)
CREATE POLICY "admin_plans_read_public_active"
 ON public.admin_plans FOR SELECT
 USING (is_active = true AND is_visible = true);

-- -------------------------------
-- API Key → Plan Assignment Mapping
-- -------------------------------
CREATE TABLE IF NOT EXISTS public.api_key_plan_assignments (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

 -- References
 api_key TEXT NOT NULL, -- the hashed/obfuscated key reference
 user_api_key_id UUID REFERENCES public.user_api_keys(id) ON DELETE CASCADE,
 plan_id UUID NOT NULL REFERENCES public.admin_plans(id) ON DELETE RESTRICT,

 -- Override fields (optional — fall back to plan defaults if null)
 custom_display_name TEXT,
 custom_badge_color TEXT,
 custom_daily_token_limit INTEGER,
 custom_monthly_token_limit INTEGER,

 -- Assignment details
 assigned_by TEXT, -- admin email who assigned
 expiry_date TIMESTAMPTZ, -- optional plan expiry override
 is_active BOOLEAN NOT NULL DEFAULT true,
 notes TEXT DEFAULT '',

 -- Timestamps
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

 -- One active assignment per API key
 UNIQUE(api_key)
);

CREATE INDEX IF NOT EXISTS idx_plan_assignments_api_key ON public.api_key_plan_assignments(api_key);
CREATE INDEX IF NOT EXISTS idx_plan_assignments_plan_id ON public.api_key_plan_assignments(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_assignments_active ON public.api_key_plan_assignments(is_active);

ALTER TABLE public.api_key_plan_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_assignments_read_admin"
 ON public.api_key_plan_assignments FOR SELECT
 USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "plan_assignments_insert_admin"
 ON public.api_key_plan_assignments FOR INSERT
 WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "plan_assignments_update_admin"
 ON public.api_key_plan_assignments FOR UPDATE
 USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "plan_assignments_delete_admin"
 ON public.api_key_plan_assignments FOR DELETE
 USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Server/service can read assignments for key-status lookups
CREATE POLICY "plan_assignments_read_service"
 ON public.api_key_plan_assignments FOR SELECT
 USING (true);

-- -------------------------------
-- Activity Logs (Plan Management)
-- -------------------------------
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

 -- Action
 action TEXT NOT NULL, -- plan_created, plan_updated, plan_deleted, plan_assigned, etc.
 entity_type TEXT NOT NULL, -- plan, api_key, assignment
 entity_id UUID NOT NULL,

 -- Who
 admin_email TEXT,
 admin_ip TEXT,

 -- Details (JSONB for flexibility)
 details JSONB DEFAULT '{}'::jsonb,

 -- Timestamps
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.admin_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.admin_activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.admin_activity_logs(created_at DESC);

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_logs_read_admin"
 ON public.admin_activity_logs FOR SELECT
 USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "activity_logs_insert_admin"
 ON public.admin_activity_logs FOR INSERT
 WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- -------------------------------
-- Seed default system plans
-- -------------------------------
INSERT INTO public.admin_plans (name, display_name, description, monthly_price, daily_token_limit, monthly_token_limit, badge_color, icon, is_active, is_visible, is_system, sort_order, features) VALUES
 ('starter', 'Starter', 'Perfect for individuals and small projects', 499, 100000, 3000000, '#6366f1', 'Zap', true, true, true, 0, '["3M tokens/month", "60 req/min", "Email support", "Basic analytics"]'),
 ('pro', 'Pro', 'For professionals and growing teams', 1499, 500000, 15000000, '#8b5cf6', 'Shield', true, true, true, 1, '["15M tokens/month", "120 req/min", "Priority support", "Advanced analytics", "Custom integrations"]'),
 ('premium', 'Premium', 'Advanced features for power users', 3499, 2000000, 50000000, '#d946ef', 'Award', true, true, true, 2, '["50M tokens/month", "300 req/min", "24/7 phone support", "Custom fine-tuning", "SLA guarantee"]'),
 ('business', 'Business', 'Scale your business with enterprise features', 7999, 5000000, 150000000, '#f59e0b', 'TrendingUp', true, true, true, 3, '["150M tokens/month", "600 req/min", "Dedicated account manager", "Custom model training", "On-premise option"]'),
 ('enterprise', 'Enterprise', 'Full-scale enterprise solution', 19999, 20000000, 500000000, '#10b981', 'Activity', true, true, true, 4, '["500M tokens/month", "Unlimited req/min", "24/7 dedicated support", "Custom infrastructure", "SSO & audit logs"]')
ON CONFLICT (name) DO NOTHING;
