-- Fix RLS policy: allow users to insert their own API keys
-- This fixes the issue where key generation fails after payment verification
-- because the client-side insert was blocked by the admin-only INSERT policy.
-- Both the regular user policy AND admin policy coexist (OR logic).

DROP POLICY IF EXISTS "user_api_keys_insert_admin" ON public.user_api_keys;

CREATE POLICY "user_api_keys_insert_own" ON public.user_api_keys FOR INSERT
 WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_api_keys_insert_admin" ON public.user_api_keys FOR INSERT
 WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
