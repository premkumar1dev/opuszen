/**
 * Server-side Supabase client factory.
 *
 * IMPORTANT: Creates a NEW client per call — never caches a singleton.
 * In serverless/edge runtimes (Vercel), module-level singletons persist
 * across concurrent requests from different users, which is unsafe when
 * using the service-role key (which bypasses RLS).
 *
 * Env vars required:
 * SUPABASE_URL — project URL (server-side, not VITE_ prefixed)
 * SUPABASE_SERVICE_ROLE_KEY — service role key (server-only)
 *
 * Fallback (for backwards compatibility during migration):
 * VITE_SUPABASE_URL is read if SUPABASE_URL is not set.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase helper.
 *
 * SECURITY: This module MUST NOT be imported in client-side code.
 * It contains the service-role key which bypasses all RLS policies.
 * A guard at module load time throws if the browser bundle includes this.
 */
function assertServerEnvironment(): void {
	if (typeof window !== "undefined") {
		throw new Error(
			"[supabase.server] Refusing to initialize in the browser — this module must only be imported on the server."
		);
	}
}

assertServerEnvironment();

function getEnvUrl(): string | null {
	return (
		process.env.SUPABASE_URL ||
		import.meta.env.SUPABASE_URL ||
		process.env.VITE_SUPABASE_URL ||
		import.meta.env.VITE_SUPABASE_URL ||
		null
	);
}

function getServiceRoleKey(): string | null {
	return (
		process.env.SUPABASE_SERVICE_ROLE_KEY ||
		import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
		null
	);
}

/**
 * Create a fresh Supabase client using the service role key.
 * Call this per-request — do NOT cache the returned client.
 */
export function createServerSupabase(): SupabaseClient {
	const url = getEnvUrl();
	const serviceRoleKey = getServiceRoleKey();
	const isPlaceholder = serviceRoleKey === "PASTE_YOUR_SERVICE_ROLE_KEY_HERE";

	if (!url || !serviceRoleKey || isPlaceholder) {
		if (isPlaceholder) {
			console.error(
				"[supabase.server] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is still set to the placeholder value " +
					"'PASTE_YOUR_SERVICE_ROLE_KEY_HERE'. Please paste your actual service_role key."
			);
		}
		throw new Error(
			"Missing SUPABASE_SERVICE_ROLE_KEY. Server-side admin operations require the service role key. " +
				"Set SUPABASE_SERVICE_ROLE_KEY in your server environment variables."
		);
	}

	return createClient(url, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}

/**
 * Legacy singleton export — kept for backwards compatibility with modules
 * that import { supabaseServer } directly.
 *
 * Deprecated: prefer createServerSupabase() for per-request isolation.
 */
export const supabaseServer: SupabaseClient = new Proxy(
	{} as SupabaseClient,
	{
		get(_target, prop: string | symbol) {
			const client = createServerSupabase();
			const value = (client as any)[prop];
			if (typeof value === "function") {
				return (...args: any[]) => (client as any)[prop](...args);
			}
			return value;
		},
	}
);

/**
 * Reset any cached state. Useful in tests.
 */
export function resetServerSupabase(): void {
	// No-op — we no longer cache a singleton, but keep for API compatibility
}
