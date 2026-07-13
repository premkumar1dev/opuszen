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
