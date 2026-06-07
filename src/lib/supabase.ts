/**
 * Supabase client singleton.
 *
 * Initialises a Supabase JS client from the `NEXT_PUBLIC_SUPABASE_URL` and
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables. Throws at startup
 * if either variable is missing so that configuration errors surface early.
 *
 * @module
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/** Pre-configured Supabase client instance for use throughout the app. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
