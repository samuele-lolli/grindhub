import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Supabase SSR Middleware
 *
 * Refreshes the user's session token on every server request to prevent
 * silent expiration. This is **required** for any Supabase app using the
 * Next.js App Router with server-side rendering.
 *
 * Without this middleware, the access token delivered via cookies will
 * expire after ~1 hour, and all server-side Supabase calls will fail
 * silently with 401 errors.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Only invoke Supabase SSR token refresh if an auth cookie is actually present.
  // Avoids an unnecessary round-trip to Supabase Auth on every request when session lives in client storage.
  const hasSupabaseCookie = request.cookies.getAll().some(c => c.name.startsWith('sb-'));
  if (!hasSupabaseCookie) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Set the cookie on the request for downstream server components
          request.cookies.set({ name, value, ...options });
          // Also set it on the response so the browser receives the update
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresh the session — this is the critical call.
  // It reads the auth cookies, validates them, and refreshes
  // the access token if it has expired.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, svgs, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
