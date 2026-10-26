import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/env';
import { runDeterministicRules, resolveRules } from '@/lib/engine';
import type { Rule, RuleOverride, Channel } from '@/lib/engine/types';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: { getAll() { return cookieStore.getAll(); }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });

    const { data: doc } = await supabase.from('documents').select('*').eq('id', id).single();
    if (!doc) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Document not found' } }, { status: 404 });
    if (doc.status === 'published') return NextResponse.json({ error: { code: 'ALREADY_PUBLISHED', message: 'Already published' } }, { status: 400 });
    if (!doc.channel_id) return NextResponse.json({ error: { code: 'NO_CHANNEL', message: 'Select a channel first' } }, { status: 400 });

    // Re-run deterministic gate server-side
    const { data: channel } = await supabase.from('channels').select('*').eq('id', doc.channel_id).single();
    const { data: rulesData } = await supabase.from('rules').select('*').eq('org_id', doc.org_id);
    const { data: overridesData } = await supabase.from('rule_overrides').select('*').eq('org_id', doc.org_id);

    const rules: Rule[] = (rulesData ?? []).map(r => ({ id: r.id, orgId: r.org_id, key: r.key, name: r.name, description: r.description, type: r.type, config: r.config, baseSeverity: r.base_severity, dos: r.dos, donts: r.donts, exceptions: r.exceptions }));
    const overrides: RuleOverride[] = (overridesData ?? []).map(o => ({ id: o.id, orgId: o.org_id, ruleId: o.rule_id, channelId: o.channel_id, severity: o.severity, configPatch: o.config_patch }));
    const ch: Channel = { id: channel!.id, orgId: channel!.org_id, slug: channel!.slug, name: channel!.name, mode: channel!.mode, formality: channel!.formality, llmThreshold: channel!.llm_threshold, description: channel!.description };

    const resolved = resolveRules(rules, overrides, ch);
    const freshFlags = runDeterministicRules(doc.content || '', resolved);
    const hardBlocking = freshFlags.filter(f => f.severity === 'hard');

    // Also check DB for disputed/upheld hard flags
    const { data: dbHardFlags } = await supabase.from('flags').select('id, severity, status').eq('document_id', id).eq('severity', 'hard').in('status', ['open', 'disputed', 'upheld']);

    if (hardBlocking.length > 0 || (dbHardFlags && dbHardFlags.length > 0)) {
      const blockers = [...hardBlocking.map(f => f.category), ...(dbHardFlags ?? []).map(() => 'existing hard flag')];
      return NextResponse.json({
        error: { code: 'BLOCKED', message: `Cannot publish: ${blockers.length} blocking issue(s) remain`, blockers }
      }, { status: 422 });
    }

    // Collect soft overrides for audit
    const { data: softOverrides } = await supabase.from('flags').select('id, category, status').eq('document_id', id).eq('severity', 'soft').eq('status', 'dismissed');

    // Publish
    const now = new Date().toISOString();
    await supabase.from('documents').update({ status: 'published', published_at: now, updated_at: now }).eq('id', id);

    // Audit
    await supabase.from('audit_events').insert({
      org_id: doc.org_id, actor_id: user.id, action: 'document_published',
      entity_type: 'document', entity_id: id,
      metadata: { soft_overrides: (softOverrides ?? []).length },
    });

    return NextResponse.json({ ok: true, published_at: now });
  } catch (err) {
    console.error('Publish error:', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Publish failed' } }, { status: 500 });
  }
}
