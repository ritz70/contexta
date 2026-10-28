import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey, getDemoPassword } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email?.trim()?.toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

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

    // Attempt sign in with provided password
    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    const next = typeof body.next === 'string' && body.next.startsWith('/app') ? body.next : null;

    // If demo account and password mismatch, retry with demo password
    if (error && (email.endsWith('@contexta-demo.com') || email === 'writer@contexta-demo.com' || email === 'manager@contexta-demo.com')) {
      const demoPw = getDemoPassword();
      const retry = await supabase.auth.signInWithPassword({
        email,
        password: demoPw,
      });
      if (!retry.error) {
        data = retry.data;
        error = null;
      } else if (demoPw !== 'Contexta#Demo2026') {
        const retryDefault = await supabase.auth.signInWithPassword({
          email,
          password: 'Contexta#Demo2026',
        });
        if (!retryDefault.error) {
          data = retryDefault.data;
          error = null;
        }
      }
    }

    if (error || !data?.user) {
      return NextResponse.json(
        { error: 'Wrong email or password' },
        { status: 401 }
      );
    }

    // Determine target redirect based on role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    let redirectTo = profile?.role === 'manager' ? '/app/reviews' : '/app/workspace';
    if (next) {
      const managerPages = ['/app/reviews', '/app/analytics', '/app/rules', '/app/channels', '/app/brand', '/app/audit'];
      const isManagerOnly = managerPages.some((p) => next.startsWith(p));
      if (!isManagerOnly || profile?.role === 'manager') {
        redirectTo = next;
      }
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      redirectTo,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sign in failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
