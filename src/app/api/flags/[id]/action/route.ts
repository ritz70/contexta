import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/env';
import { z } from 'zod';


const actionSchema = z.object({
  action: z.enum(['accept', 'dismiss', 'dispute']),
  reason: z.string().optional(),
  disputeCategory: z.enum(['false_positive', 'context_exception', 'rule_unclear', 'other']).optional(),
  suggestion: z.object({ replacement: z.string().optional(), insertText: z.string().optional() }).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: flagId } = await params;
    const body = actionSchema.parse(await request.json());
    const cookieStore = await cookies();
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: { getAll() { return cookieStore.getAll(); }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });

    const { data: flag } = await supabase.from('flags').select('*').eq('id', flagId).single();
    if (!flag) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Flag not found' } }, { status: 404 });

    const now = new Date().toISOString();

    if (body.action === 'accept') {
      await supabase.from('flags').update({ status: 'accepted', status_by: user.id, status_at: now, status_reason: body.reason, updated_at: now }).eq('id', flagId);
      await supabase.from('audit_events').insert({ org_id: flag.org_id, actor_id: user.id, action: 'flag_accepted', entity_type: 'flag', entity_id: flagId, metadata: { rule_id: flag.rule_id } });
    } else if (body.action === 'dismiss') {
      if (flag.severity === 'hard') {
        return NextResponse.json({ error: { code: 'CANNOT_DISMISS', message: 'Hard flags cannot be dismissed. Dispute them instead.' } }, { status: 400 });
      }
      await supabase.from('flags').update({ status: 'dismissed', status_by: user.id, status_at: now, status_reason: body.reason || 'Dismissed by writer', updated_at: now }).eq('id', flagId);
      await supabase.from('audit_events').insert({ org_id: flag.org_id, actor_id: user.id, action: 'flag_dismissed', entity_type: 'flag', entity_id: flagId, metadata: { rule_id: flag.rule_id, reason: body.reason } });
    } else if (body.action === 'dispute') {
      if (!body.disputeCategory || !body.reason || body.reason.length < 10) {
        return NextResponse.json({ error: { code: 'VALIDATION', message: 'Dispute requires a category and reason (min 10 chars)' } }, { status: 400 });
      }
      await supabase.from('flags').update({ status: 'disputed', status_by: user.id, status_at: now, updated_at: now }).eq('id', flagId);
      await supabase.from('disputes').insert({ org_id: flag.org_id, flag_id: flagId, raised_by: user.id, category: body.disputeCategory, reason: body.reason });
      await supabase.from('audit_events').insert({ org_id: flag.org_id, actor_id: user.id, action: 'flag_disputed', entity_type: 'flag', entity_id: flagId, metadata: { category: body.disputeCategory } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: { code: 'VALIDATION', message: err.issues?.[0]?.message ?? err.message } }, { status: 400 });
    console.error('Flag action error:', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Action failed' } }, { status: 500 });
  }
}
