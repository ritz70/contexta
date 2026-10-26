// Supabase middleware — refreshes sessions, protects routes

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/env';

export async function updateSession(request: NextRequest) {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  // If Supabase isn't configured, let the app handle it
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect /app/* routes
  if (pathname.startsWith('/app')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Role-gate manager pages
    const managerPages = ['/app/reviews', '/app/analytics', '/app/rules', '/app/channels', '/app/brand', '/app/audit'];
    const isManagerPage = managerPages.some(p => pathname.startsWith(p));

    if (isManagerPage) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'manager') {
        const url = request.nextUrl.clone();
        url.pathname = '/app/workspace';
        return NextResponse.redirect(url);
      }
    }
  }

  // Redirect authenticated users away from login/signup
  if ((pathname === '/login' || pathname === '/signup') && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/app/workspace';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
