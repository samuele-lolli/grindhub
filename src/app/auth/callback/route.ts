import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const rawNext = requestUrl.searchParams.get('next') ?? '/';
  // Prevent open redirect attacks: only allow internal relative paths
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  if (code) {
    const cookieStore = await cookies();
    const pendingHeaders: Record<string, string> = {};

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet, headers) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
            Object.assign(pendingHeaders, headers);
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const redirectResponse = NextResponse.redirect(new URL(next, request.url));
      Object.entries(pendingHeaders).forEach(([key, value]) => {
        redirectResponse.headers.set(key, value);
      });
      return redirectResponse;
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
}
