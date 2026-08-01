-- Add OpusLive theme card & badge fields to public.plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS badge_text text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS secondary_price_text text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS button_text text DEFAULT 'Get this plan →',
  ADD COLUMN IF NOT EXISTS button_subtext text DEFAULT 'Instant key delivery after payment',
  ADD COLUMN IF NOT EXISTS is_dark_card boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_usdt numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_popular boolean DEFAULT false;

COMMENT ON COLUMN public.plans.badge_text IS 'Pill badge text (e.g. TRY IT OUT, BEST VALUE)';
COMMENT ON COLUMN public.plans.secondary_price_text IS 'Sub-tagline under price (e.g. ≈₹3,000 • 5× Claude Pro)';
COMMENT ON COLUMN public.plans.button_text IS 'Action button label (e.g. Start the trial →)';
COMMENT ON COLUMN public.plans.button_subtext IS 'Micro text under button (e.g. Instant key delivery after payment)';
COMMENT ON COLUMN public.plans.is_dark_card IS 'Whether to style this card in dark featured theme (like 20x Plan card)';
COMMENT ON COLUMN public.plans.price_usdt IS 'USDT price display (0 = derive from price)';
