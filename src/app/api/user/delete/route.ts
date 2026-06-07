import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Initialize an admin client using the Service Role Key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase env variables. Cannot delete user.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminAuthClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify who this token belongs to using the admin client
    const { data: { user }, error: userError } = await adminAuthClient.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Actually delete the user using the admin API
    const { error: deleteError } = await adminAuthClient.auth.admin.deleteUser(user.id);

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
