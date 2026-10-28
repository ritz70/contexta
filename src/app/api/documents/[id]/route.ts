import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/env';

async function getClient() {
  const cookieStore = await cookies();
  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} },
    },
  });
}

// Get document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });

    const { data: doc, error } = await supabase.from('documents').select('*').eq('id', id).single();
    if (error || !doc) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Document not found' } }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: doc });
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to load document' } }, { status: 500 });
  }
}

// Save document (autosave)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await getClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });

    // Verify document exists and is accessible under RLS
    const { data: doc } = await supabase.from('documents').select('id, org_id, author_id').eq('id', id).single();
    if (!doc) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Document not found' } }, { status: 404 });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) update.title = body.title;
    if (body.content !== undefined) update.content = body.content;
    if (body.channel_id !== undefined) update.channel_id = body.channel_id;

    const { error } = await supabase.from('documents').update(update).eq('id', id);
    if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Save failed' } }, { status: 500 });
  }
}

// Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });

    // Verify document exists and is accessible under RLS
    const { data: doc } = await supabase.from('documents').select('id, org_id, author_id').eq('id', id).single();
    if (!doc) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Document not found' } }, { status: 404 });
    }

    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Delete failed' } }, { status: 500 });
  }
}
