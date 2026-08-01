-- Add display_id column for human-readable order IDs (O-ID-0001 format)

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE;

-- Create sequence starting at 1
CREATE SEQUENCE IF NOT EXISTS order_display_id_seq START 1;

-- Backfill existing orders with display_id
UPDATE public.orders SET display_id = 'O-ID-' || lpad(nextval('order_display_id_seq')::text, 4, '0') WHERE display_id IS NULL;

-- Set default for new orders using the sequence
ALTER TABLE public.orders ALTER COLUMN display_id SET DEFAULT 'O-ID-' || lpad(nextval('order_display_id_seq')::text, 4, '0');

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_orders_display_id ON public.orders(display_id);
