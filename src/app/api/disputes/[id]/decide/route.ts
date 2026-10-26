import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/env';
import { z } from 'zod';


const decisionSchema = z.object({
  decision: z.enum(['uphold', 'overturn']),
  note: z.string().min(1),
  addException: z.string().optional(),
  changeSeverity: z.object({ channelId: z.string(), severity: z.string() }).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: disputeId } = await params;
    const body = decisionSchema.parse(await request.json());
    const cookieStore = await cookies();
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: { getAll() { return cookieStore.getAll(); }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role, org_id').eq('id', user.id).single();
    if (profile?.role !== 'manager') return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Managers only' } }, { status: 403 });

    const { data: dispute } = await supabase.from('disputes').select('*, flags(*)').eq('id', disputeId).single();
    if (!dispute) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Dispute not found' } }, { status: 404 });

    const now = new Date().toISOString();
    const ruleChange: Record<string, unknown> = {};

    // Update dispute
    await supabase.from('disputes').update({
      status: body.decision === 'uphold' ? 'upheld' : 'overturned',
      decided_by: user.id, decision_note: body.note, decided_at: now,
      rule_change: Object.keys(ruleChange).length > 0 ? ruleChange : null,
    }).eq('id', disputeId);

    // Update flag
    await supabase.from('flags').update({
      status: body.decision === 'uphold' ? 'upheld' : 'overturned',
      status_by: user.id, status_at: now, updated_at: now,
    }).eq('id', dispute.flag_id);

    // Apply rule changes
    if (body.addException && dispute.flags?.rule_id) {
      const { data: rule } = await supabase.from('rules').select('exceptions').eq('id', dispute.flags.rule_id).single();
      if (rule) {
        const exceptions = [...(rule.exceptions || []), body.addException];
        await supabase.from('rules').update({ exceptions, updated_at: now }).eq('id', dispute.flags.rule_id);
        ruleChange.addedException = body.addException;
        await supabase.from('audit_events').insert({ org_id: profile.org_id, actor_id: user.id, action: 'rule_updated', entity_type: 'rule', entity_id: dispute.flags.rule_id, metadata: { change: 'added_exception', exception: body.addException } });
      }
    }

    if (body.changeSeverity && dispute.flags?.rule_id) {
      await supabase.from('rule_overrides').upsert({
        org_id: profile.org_id, rule_id: dispute.flags.rule_id,
        channel_id: body.changeSeverity.channelId, severity: body.changeSeverity.severity,
      }, { onConflict: 'rule_id,channel_id' });
      await supabase.from('audit_events').insert({ org_id: profile.org_id, actor_id: user.id, action: 'override_updated', entity_type: 'rule', entity_id: dispute.flags.rule_id, metadata: body.changeSeverity });
    }

    await supabase.from('audit_events').insert({ org_id: profile.org_id, actor_id: user.id, action: 'dispute_decided', entity_type: 'dispute', entity_id: disputeId, metadata: { decision: body.decision, note: body.note } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: { code: 'VALIDATION', message: err.issues?.[0]?.message ?? err.message } }, { status: 400 });
    console.error('Dispute decision error:', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Decision failed' } }, { status: 500 });
  }
}
