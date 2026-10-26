import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey, getDemoPassword } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const role = body.role === 'manager' ? 'manager' : 'writer';
    const email = role === 'manager' ? 'manager@contexta-demo.com' : 'writer@contexta-demo.com';
    let password = getDemoPassword();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      getSupabaseUrl() || 'http://localhost:54321',
      getSupabaseAnonKey() || 'anon-key',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Server component write guard
            }
          },
        },
      }
    );

    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error && password !== 'Contexta#Demo2026') {
      const retry = await supabase.auth.signInWithPassword({
        email,
        password: 'Contexta#Demo2026',
      });
      if (!retry.error) {
        data = retry.data;
        error = null;
      }
    }

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          hint: 'Make sure you have run the database setup and seed scripts (npm run setup).',
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      redirectTo: '/app/workspace',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Demo sign in failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
