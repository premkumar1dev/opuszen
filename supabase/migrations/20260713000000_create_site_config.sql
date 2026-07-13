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
