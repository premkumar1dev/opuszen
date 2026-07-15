-- Backfill existing auth.users into public.users if they are missing
INSERT INTO public.users (id, username, password, name, phone_number, account_balance, total_orders, total_spent)
SELECT 
  id, 
  email, 
  '', 
  COALESCE(raw_user_meta_data->>'full_name', email), 
  COALESCE(raw_user_meta_data->>'phone', ''), 
  0.00, 
  0, 
  0.00
FROM auth.users
ON CONFLICT (username) DO UPDATE
SET id = EXCLUDED.id,
    name = COALESCE(EXCLUDED.name, public.users.name);

-- Add user_id column to orders referencing public.users(id)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID;

-- Drop foreign key if it exists and add it
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Backfill user_id on existing orders matching by username
UPDATE public.orders o
SET user_id = u.id
FROM public.users u
WHERE o.username = u.username;
