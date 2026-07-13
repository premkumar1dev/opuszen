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
