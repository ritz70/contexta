import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/env';
import { runDeterministicRules, resolveRules, reconcileFlags, computeFingerprint, type ExistingFlag } from '@/lib/engine';
import type { Rule, RuleOverride, Channel, CheckSummary } from '@/lib/engine/types';
import { z } from 'zod';


const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = paramsSchema.parse(await params);

    const cookieStore = await cookies();
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
    }

    // Load document under RLS
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, org_id, content, channel_id, status')
      .eq('id', documentId)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Document not found' } }, { status: 404 });
    }

    if (!doc.channel_id) {
      return NextResponse.json({ error: { code: 'NO_CHANNEL', message: 'Select a channel before running checks' } }, { status: 400 });
    }

    // Load channel
    const { data: channel } = await supabase
      .from('channels')
      .select('*')
      .eq('id', doc.channel_id)
      .single();

    if (!channel) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Channel not found' } }, { status: 404 });
    }

    // Load rules and overrides
    const { data: rulesData } = await supabase
      .from('rules')
      .select('*')
      .eq('org_id', doc.org_id);

    const { data: overridesData } = await supabase
      .from('rule_overrides')
      .select('*')
      .eq('org_id', doc.org_id);

    // Convert to engine types
    const rules: Rule[] = (rulesData ?? []).map(r => ({
      id: r.id,
      orgId: r.org_id,
      key: r.key,
      name: r.name,
      description: r.description,
      type: r.type,
      config: r.config,
      baseSeverity: r.base_severity,
      dos: r.dos,
      donts: r.donts,
      exceptions: r.exceptions,
    }));

    const overrides: RuleOverride[] = (overridesData ?? []).map(o => ({
      id: o.id,
      orgId: o.org_id,
      ruleId: o.rule_id,
      channelId: o.channel_id,
      severity: o.severity,
      configPatch: o.config_patch,
    }));

    const engineChannel: Channel = {
      id: channel.id,
      orgId: channel.org_id,
      slug: channel.slug,
      name: channel.name,
      mode: channel.mode,
      formality: channel.formality,
      llmThreshold: channel.llm_threshold,
      description: channel.description,
    };

    // Resolve rules for this channel
    const resolved = resolveRules(rules, overrides, engineChannel);

    // Run deterministic checks
    const canonicalText = doc.content || '';
    const newFlags = runDeterministicRules(canonicalText, resolved);

    // Load existing flags for reconciliation
    const { data: existingFlags } = await supabase
      .from('flags')
      .select('id, fingerprint, status, quote, start_offset, end_offset')
      .eq('document_id', documentId);

    const existing: ExistingFlag[] = (existingFlags ?? []).map(f => ({
      id: f.id,
      fingerprint: f.fingerprint,
      status: f.status,
      quote: f.quote,
      start_offset: f.start_offset,
      end_offset: f.end_offset,
    }));

    // Reconcile
    const { reconciled, toAutoResolve } = reconcileFlags(newFlags, existing);

    // Auto-resolve old flags
    if (toAutoResolve.length > 0) {
      await supabase
        .from('flags')
        .update({ status: 'auto_resolved', updated_at: new Date().toISOString() })
        .in('id', toAutoResolve);

      // Auto-withdraw pending disputes on auto-resolved flags
      await supabase
        .from('disputes')
        .update({ status: 'withdrawn' })
        .in('flag_id', toAutoResolve)
        .eq('status', 'pending');
    }

    // Upsert new/changed flags
    for (const rf of reconciled) {
      if (rf.action === 'upsert') {
        if (rf.existingId) {
          // Update existing
          await supabase
            .from('flags')
            .update({
              severity: rf.severity,
              quote: rf.quote,
              start_offset: rf.start,
              end_offset: rf.end,
              explanation: rf.explanation,
              suggestions: rf.suggestions,
              status: 'open',
              updated_at: new Date().toISOString(),
            })
            .eq('id', rf.existingId);
        } else {
          // Insert new
          await supabase
            .from('flags')
            .insert({
              org_id: doc.org_id,
              document_id: documentId,
              rule_id: rf.ruleId,
              source: rf.source,
              category: rf.category,
              severity: rf.severity,
              scope: rf.scope,
              quote: rf.quote,
              start_offset: rf.start,
              end_offset: rf.end,
              confidence: rf.confidence,
              explanation: rf.explanation,
              suggestions: rf.suggestions,
              fingerprint: rf.fingerprint,
              status: 'open',
            });
        }
      }
    }

    // Create check record
    const summary: CheckSummary = {
      total: reconciled.filter(f => f.action !== 'keep' || f.existingStatus === 'open').length,
      hard: reconciled.filter(f => f.severity === 'hard').length,
      soft: reconciled.filter(f => f.severity === 'soft').length,
      info: 0,
      blocking: reconciled.filter(f =>
        f.severity === 'hard' && (!f.existingStatus || ['open', 'disputed', 'upheld'].includes(f.existingStatus))
      ).length,
    };

    await supabase.from('document_checks').insert({
      document_id: documentId,
      org_id: doc.org_id,
      kind: 'deterministic',
      content_snapshot: canonicalText,
      channel_id: doc.channel_id,
      summary,
    });

    // Update document last_check_at
    await supabase
      .from('documents')
      .update({ last_check_at: new Date().toISOString() })
      .eq('id', documentId);

    // Audit event
    await supabase.from('audit_events').insert({
      org_id: doc.org_id,
      actor_id: user.id,
      action: 'check_run',
      entity_type: 'document',
      entity_id: documentId,
      metadata: { kind: 'deterministic', summary },
    });

    // Fetch all current flags to return
    const { data: allFlags } = await supabase
      .from('flags')
      .select('*')
      .eq('document_id', documentId)
      .neq('status', 'auto_resolved')
      .order('start_offset', { ascending: true });

    return NextResponse.json({
      flags: allFlags ?? [],
      summary,
      autoResolved: toAutoResolve.length,
    });

  } catch (err) {
    console.error('Deterministic check error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Check failed' } },
      { status: 500 }
    );
  }
}
