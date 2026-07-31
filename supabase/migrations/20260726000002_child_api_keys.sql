-- Child API Keys: allow a parent key to spawn child keys that inherit its plan settings
-- Migration: 20260726000002_child_api_keys.sql

-- Add parent_key_id to user_api_keys (NULL = top-level/parent key)
ALTER TABLE public.user_api_keys
 ADD COLUMN IF NOT EXISTS parent_key_id UUID REFERENCES public.user_api_keys(id) ON DELETE CASCADE;

-- Index for fast lookup of children
CREATE INDEX IF NOT EXISTS idx_user_api_keys_parent ON public.user_api_keys(parent_key_id);

-- Allow users to update their own keys (needed for parent_key_id assignment via user action)
DROP POLICY IF EXISTS "user_api_keys_update_own" ON public.user_api_keys;
CREATE POLICY "user_api_keys_update_own" ON public.user_api_keys FOR UPDATE USING (auth.uid() = user_id);
