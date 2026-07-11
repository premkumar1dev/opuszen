import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined);
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_PUBLISHABLE_KEY : undefined);

let supabaseInstance: ReturnType<typeof createClient> | null = null;

// Use a Proxy to initialize Supabase client lazily on first access.
// This prevents top-level application crashes on the server during build/SSR if env variables are missing.
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop, receiver) {
    if (!supabaseInstance) {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variables');
      }
      supabaseInstance = createClient(supabaseUrl, supabaseKey);
    }
    return Reflect.get(supabaseInstance, prop, receiver);
  }
});