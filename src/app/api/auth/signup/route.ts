import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { starterChannels, starterRules, overrideMatrix } from '@/lib/seed/starter-pack';


const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  action: z.enum(['create_org', 'join_org']),
  orgName: z.string().optional(),
  inviteCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION', message: parsed.error.issues?.[0]?.message ?? parsed.error.message ?? 'Invalid input' } },
        { status: 400 }
      );
    }

    const { email, password, fullName, action, orgName, inviteCode } = parsed.data;
    const admin = createAdminClient();

    // Determine org
    let orgId: string;
    let role: 'writer' | 'manager';

    if (action === 'create_org') {
      if (!orgName) {
        return NextResponse.json(
          { error: { code: 'VALIDATION', message: 'Organization name is required' } },
          { status: 400 }
        );
      }

      // Create organization
      const code = orgName.toUpperCase().replace(/\s+/g, '-').slice(0, 12) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      const { data: org, error: orgError } = await admin
        .from('organizations')
        .insert({ name: orgName, invite_code: code })
        .select('id')
        .single();

      if (orgError) {
        return NextResponse.json(
          { error: { code: 'DB_ERROR', message: 'Failed to create organization' } },
          { status: 500 }
        );
      }

      orgId = org.id;
      role = 'manager';

      // Create starter pack for new org
      await createStarterPack(admin, orgId);
    } else {
      if (!inviteCode) {
        return NextResponse.json(
          { error: { code: 'VALIDATION', message: 'Invite code is required' } },
          { status: 400 }
        );
      }

      const { data: org, error: orgError } = await admin
        .from('organizations')
        .select('id')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .single();

      if (orgError || !org) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Invalid invite code' } },
          { status: 404 }
        );
      }

      orgId = org.id;
      role = 'writer';
    }

    // Create user via admin (email already confirmed)
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authError) {
      if (authError.message?.includes('already been registered')) {
        return NextResponse.json(
          { error: { code: 'DUPLICATE', message: 'An account with this email already exists' } },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: authError.message } },
        { status: 500 }
      );
    }

    // Create profile
    const { error: profileError } = await admin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        org_id: orgId,
        role,
        full_name: fullName,
        email,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Clean up auth user
      await admin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: 'Failed to create profile' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      email,
      role,
    });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Signup failed' } },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createStarterPack(admin: any, orgId: string) {
  // Insert channels
  const channelRows = starterChannels.map((ch) => ({
    org_id: orgId,
    slug: ch.slug,
    name: ch.name,
    mode: ch.mode,
    formality: ch.formality,
    llm_threshold: ch.llmThreshold,
    description: ch.description,
  }));

  const { data: channels } = await admin
    .from('channels')
    .insert(channelRows)
    .select('id, slug');

  const channelMap = new Map<string, string>();
  if (channels) {
    for (const ch of channels) {
      channelMap.set(ch.slug, ch.id);
    }
  }

  // Insert rules
  const ruleRows = starterRules.map((r) => ({
    org_id: orgId,
    key: r.key,
    name: r.name,
    description: r.description,
    type: r.type,
    config: r.config,
    base_severity: r.baseSeverity,
    dos: r.dos,
    donts: r.donts,
    exceptions: r.exceptions,
  }));

  const { data: rules } = await admin
    .from('rules')
    .insert(ruleRows)
    .select('id, key');

  const ruleMap = new Map<string, string>();
  if (rules) {
    for (const r of rules) {
      ruleMap.set(r.key, r.id);
    }
  }

  // Insert overrides
  const overrideRows = overrideMatrix
    .map((ov) => {
      const ruleId = ruleMap.get(ov.ruleKey);
      const channelId = channelMap.get(ov.channelSlug);
      if (!ruleId || !channelId) return null;
      return {
        org_id: orgId,
        rule_id: ruleId,
        channel_id: channelId,
        severity: ov.severity,
        config_patch: ov.configPatch ?? {},
      };
    })
    .filter(Boolean);

  if (overrideRows.length > 0) {
    await admin.from('rule_overrides').insert(overrideRows);
  }

  // Insert brand profile
  await admin.from('brand_profiles').insert({
    org_id: orgId,
    voice: 'Clear, calm and confident. We explain things in plain language and never hype. We speak to people, not segments.',
    pillars: ['Transparent', 'Trustworthy', 'Plainspoken', 'Human'],
    redact_before_ai: true,
    confidential_terms: [],
  });
}
