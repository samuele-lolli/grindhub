import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function DELETE(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error('Missing Supabase env variables. Cannot delete user.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminAuthClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Resolve authenticated user via Bearer token or SSR cookies
    let verifiedUserId: string | null = null;
    const authHeader = request.headers.get('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: userError } = await adminAuthClient.auth.getUser(token);
      if (!userError && user) {
        verifiedUserId = user.id;
      }
    }

    if (!verifiedUserId) {
      const cookieStore = await cookies();
      const ssrClient = createServerClient(supabaseUrl, anonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      });
      const { data: { user }, error: cookieUserError } = await ssrClient.auth.getUser();
      if (!cookieUserError && user) {
        verifiedUserId = user.id;
      }
    }

    if (!verifiedUserId) {
      return NextResponse.json({ error: 'Invalid or expired authentication session' }, { status: 401 });
    }

    const { error: deleteError } = await adminAuthClient.auth.admin.deleteUser(verifiedUserId);

    if (deleteError) {
      console.error('Failed to delete user via admin API:', deleteError);
      return NextResponse.json({ error: 'Failed to delete user account' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User account deleted successfully' });
  } catch (error) {
    console.error('Unexpected error during user deletion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
