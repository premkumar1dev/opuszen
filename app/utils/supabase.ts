import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Lazy-initialized singleton — avoids SSR/build-time crashes when env vars are missing.
function getSupabaseClient(): SupabaseClient {
 if (!supabaseUrl || !supabaseKey) {
 console.error(
 '[Supabase] Missing environment variables.\n' +
 'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in your .env file.'
 );
 throw new Error(
 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variables. ' +
 'See .env.example for required configuration.'
 );
 }
 return createClient(supabaseUrl, supabaseKey);
}

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
 if (!supabaseInstance) {
 supabaseInstance = getSupabaseClient();
 }
 return supabaseInstance;
}

// Proxy export for backwards compatibility — initializes lazily on first access
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
 get(_target, prop: string | symbol) {
 const client = getSupabase();
 const value = (client as any)[prop];
 if (typeof value === 'function') {
 return (...args: any[]) => (client as any)[prop](...args);
 }
 return value;
 }
});
