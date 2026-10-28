import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/env';
import { resetDemoOrgData } from '@/lib/seed/reset-demo';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'manager') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only managers can reset demo data' } },
        { status: 403 }
      );
    }

    const result = await resetDemoOrgData(profile.org_id, user.id);

    if (!result.success) {
      const isRateLimit = result.error?.includes('Rate limit');
      return NextResponse.json(
        { error: { code: isRateLimit ? 'RATE_LIMIT' : 'BAD_REQUEST', message: result.error || 'Reset failed' } },
        { status: isRateLimit ? 429 : 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Demo data has been successfully reset to initial state',
    });
  } catch (err) {
    console.error('Reset demo error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to reset demo data' } },
      { status: 500 }
    );
  }
}
