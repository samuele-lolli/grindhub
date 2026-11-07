/**
 * Supabase SSR browser client singleton.
 *
 * Initialises a cookie-backed PKCE Supabase client via `@supabase/ssr` so
 * client components, Route Handlers, and Next.js 16 `src/proxy.ts` share the
 * exact same authenticated session.
 *
 * @module
 */

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/** Pre-configured cookie-backed Supabase browser client instance. */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
