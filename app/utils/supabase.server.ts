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
 const isPlaceholder = serviceRoleKey === "PASTE_YOUR_SERVICE_ROLE_KEY_HERE";

 if (!url || !serviceRoleKey || isPlaceholder) {
 if (isPlaceholder) {
 console.error(
 "[supabase.server] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is still set to the placeholder value " +
 "'PASTE_YOUR_SERVICE_ROLE_KEY_HERE' in your .env file. Please paste your actual service_role key."
 );
 }
 // No fallback — require the service role key for admin operations
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
 * Get the server-side Supabase client (singleton).
 * Uses the service role key for admin operations.
 */
export function getServerSupabase(): SupabaseClient {
 if (!serverInstance) {
 serverInstance = getServerSupabaseClient();
 }
 return serverInstance;
}

export function resetServerSupabase(): void {
 serverInstance = null;
}

/**
 * Proxy export for drop-in replacement in server modules.
 * Usage: import { supabaseServer } from "~/utils/supabase.server";
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
