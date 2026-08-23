-- ============================================================================
-- Admin Session Revocation Table
-- ============================================================================
-- Supports individual and bulk session revocation for admin accounts.
-- Revoked sessions are checked server-side on every admin auth verification.

CREATE TABLE IF NOT EXISTS public.revoked_sessions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	nonce TEXT NOT NULL UNIQUE,
	revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	reason TEXT DEFAULT 'manual', -- manual | password_change | bulk_logout | security
	admin_email TEXT -- who initiated the revocation
);

CREATE INDEX IF NOT EXISTS idx_revoked_sessions_nonce ON public.revoked_sessions(nonce);
CREATE INDEX IF NOT EXISTS idx_revoked_sessions_revoked_at ON public.revoked_sessions(revoked_at);

ALTER TABLE public.revoked_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "revoked_sessions_admin_full"
 ON public.revoked_sessions
 FOR ALL
 USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Auto-delete expired revoked sessions (older than 24 hours)
-- This keeps the table small since sessions naturally expire after 24h anyway
CREATE OR REPLACE FUNCTION public.cleanup_revoked_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
	DELETE FROM public.revoked_sessions
	WHERE revoked_at < now() - interval '24 hours';
END;
$$;

-- Schedule cleanup via a comment reminder (run periodically from application)
-- Or use pg_cron if available: SELECT cron.schedule('cleanup-revoked', '0 * * * *', 'SELECT public.cleanup_revoked_sessions()');
