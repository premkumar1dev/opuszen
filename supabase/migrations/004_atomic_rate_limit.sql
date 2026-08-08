-- ===========================================================================
-- Migration: Atomic rate-limit via PL/pgSQL function
-- ===========================================================================
-- The previous rate limiter did SELECT then INSERT — two separate RPC calls
-- that can race under concurrency, allowing a burst past the limit.
-- This migration adds a PostgreSQL function that performs the check-and-increment
-- atomically in a single transaction.

CREATE OR REPLACE FUNCTION public.increment_rate_limit(
 p_user_api_key_id text,
 p_limit integer,
 p_window_seconds integer DEFAULT 60
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
 v_now bigint;
 v_window_start bigint;
 v_current_count integer;
 v_oldest bigint;
 v_remaining integer;
 v_retry_after integer;
BEGIN
 v_now := EXTRACT(EPOCH FROM now())::bigint;
 v_window_start := (v_now / 1)::bigint;
 v_current_count := 0;

 -- Sum all requests within the sliding window
 SELECT COALESCE(SUM(request_count), 0)
 INTO v_current_count
 FROM public.user_rate_limits
 WHERE user_api_key_id = p_user_api_key_id
 AND window_start >= v_window_start - p_window_seconds;

 IF v_current_count >= p_limit THEN
 -- Find oldest entry to compute retry-after
 SELECT COALESCE(MIN(window_start), v_window_start)
 INTO v_oldest
 FROM public.user_rate_limits
 WHERE user_api_key_id = p_user_api_key_id
 AND window_start >= v_window_start - p_window_seconds;

 v_retry_after := GREATEST(1, (v_oldest + p_window_seconds) - v_now);

 RETURN json_build_object(
 'allowed', false,
 'remaining', 0,
 'retry_after', v_retry_after
 );
 END IF;

 -- Insert a new bucket row for this second
 INSERT INTO public.user_rate_limits (user_api_key_id, window_start, request_count)
 VALUES (p_user_api_key_id, v_window_start, 1);

 v_remaining := p_limit - v_current_count - 1;

 RETURN json_build_object(
 'allowed', true,
 'remaining', GREATEST(0, v_remaining),
 'retry_after', null
 );
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_rate_limit(text, integer, integer) TO service_role;
