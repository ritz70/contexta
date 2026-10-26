// Supabase browser client — used in client components
// Uses @supabase/ssr with cookie-based sessions

import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/env';

export function createClient() {
  return createBrowserClient(
    getSupabaseUrl(),
    getSupabaseAnonKey()
  );
}
