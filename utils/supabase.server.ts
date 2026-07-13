/**
 * Server-side Supabase client using the SERVICE ROLE key.
 * This bypasses RLS and should ONLY be used in server loaders/actions.
 *
 * Env var required: SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serverInstance: SupabaseClient | null = null;

function getServerSupabaseClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.warn(
      "[supabase.server] Missing SUPABASE_SERVICE_ROLE_KEY — falling back to publishable key.\n" +
        "Set SUPABASE_SERVICE_ROLE_KEY in your server environment for proper admin access."
    );
    // Fallback: use the publishable key (less secure, relies on RLS)
    const pubKey =
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !pubKey) {
      throw new Error(
        "Missing Supabase credentials. Set VITE_SUPABASE_URL and either " +
          "SUPABASE_SERVICE_ROLE_KEY (preferred) or VITE_SUPABASE_PUBLISHABLE_KEY."
      );
    }
    return createClient(url, pubKey);
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Get the server-side Supabase client (singleton).
 * Uses the service role key for admin operations.
 */
export function getServerSupabase(): SupabaseClient {
  if (!serverInstance) {
    serverInstance = getServerSupabaseClient();
  }
  return serverInstance;
}

/**
 * Proxy export for drop-in replacement in server modules.
 * Usage:  import { supabaseServer } from "~/utils/supabase.server";
 */
export const supabaseServer: SupabaseClient = new Proxy(
  {} as SupabaseClient,
  {
    get(_target, prop: string | symbol) {
      const client = getServerSupabase();
      const value = (client as any)[prop];
      if (typeof value === "function") {
        return (...args: any[]) => (client as any)[prop](...args);
      }
      return value;
    },
  }
);
