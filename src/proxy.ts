import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js 16 Proxy for Supabase SSR Session Refresh & OAuth PKCE Routing.
 *
 * 1. Forwards root OAuth PKCE redirects (`/?code=...`) to `/auth/callback` so
 *    session cookies are exchanged cleanly on the server even when only the
 *    root origin URL is whitelisted in Supabase Auth.
 * 2. Refreshes `sb-*` auth cookies using the modern `getAll`/`setAll` API and
 *    applies `@supabase/ssr` anti-caching headers whenever tokens rotate.
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Forward PKCE code landing on '/' to '/auth/callback' for server-side cookie exchange
  if (pathname === '/' && searchParams.has('code')) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = '/auth/callback';
    return NextResponse.redirect(callbackUrl);
  }

  let response = NextResponse.next({
    request,
  });

  const hasSupabaseCookie = request.cookies.getAll().some(c => c.name.startsWith('sb-'));
  if (!hasSupabaseCookie) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect already-authenticated users away from /login
  if (user && pathname === '/login') {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/';
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
