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
