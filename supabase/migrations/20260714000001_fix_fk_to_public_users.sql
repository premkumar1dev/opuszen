-- Fix FK constraints to reference public.users instead of auth.users
-- auth.users is not queryable via PostgREST even with service_role,
-- causing foreign key violations when inserting from the admin panel.

-- 1. user_api_keys.user_id → public.users(id)
ALTER TABLE public.user_api_keys
 DROP CONSTRAINT IF EXISTS user_api_keys_user_id_fkey,
 ADD CONSTRAINT user_api_keys_user_id_fkey
 FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. user_credit_history.user_id → public.users(id)
ALTER TABLE public.user_credit_history
 DROP CONSTRAINT IF EXISTS user_credit_history_user_id_fkey,
 ADD CONSTRAINT user_credit_history_user_id_fkey
 FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. api_request_logs.user_id → public.users(id)
ALTER TABLE public.api_request_logs
 DROP CONSTRAINT IF EXISTS api_request_logs_user_id_fkey,
 ADD CONSTRAINT api_request_logs_user_id_fkey
 FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
