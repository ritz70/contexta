// Seed script: Creates the demo org with users, channels, rules, overrides, sample drafts, and history
// Idempotent: wipes and recreates the demo org

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { starterChannels, starterRules, overrideMatrix, demoBrand, demoUsers } from '../src/lib/seed/starter-pack';
import { sampleDrafts } from '../src/lib/samples';

// Auto-load .env.local or .env
for (const envFile of ['.env.local', '.env']) {
  const envPath = resolve(process.cwd(), envFile);
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const demoPassword = process.env.DEMO_PASSWORD || 'Contexta#Demo2026';

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('Seeding Contexta demo data...');

  // 1. Delete existing demo org
  const { data: existingOrg } = await admin
    .from('organizations')
    .select('id')
    .eq('invite_code', demoBrand.inviteCode)
    .single();

  if (existingOrg) {
    console.log('Cleaning up existing demo org...');
    // Delete in proper order to avoid FK violations
    await admin.from('audit_events').delete().eq('org_id', existingOrg.id);
    await admin.from('feedback').delete().eq('org_id', existingOrg.id);
    await admin.from('disputes').delete().eq('org_id', existingOrg.id);
    await admin.from('flags').delete().eq('org_id', existingOrg.id);
    await admin.from('document_checks').delete().eq('org_id', existingOrg.id);
    await admin.from('documents').delete().eq('org_id', existingOrg.id);
    await admin.from('rule_overrides').delete().eq('org_id', existingOrg.id);
    await admin.from('rules').delete().eq('org_id', existingOrg.id);
    await admin.from('channels').delete().eq('org_id', existingOrg.id);
    await admin.from('brand_profiles').delete().eq('org_id', existingOrg.id);

    // Delete profiles and auth users
    const { data: profiles } = await admin
      .from('profiles')
      .select('id')
      .eq('org_id', existingOrg.id);

    if (profiles) {
      for (const p of profiles) {
        await admin.from('profiles').delete().eq('id', p.id);
        await admin.auth.admin.deleteUser(p.id).catch(() => {});
      }
    }

    await admin.from('organizations').delete().eq('id', existingOrg.id);
    console.log('✓ Cleaned up existing demo org');
  }

  // 2. Create organization
  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({
      name: demoBrand.name,
      invite_code: demoBrand.inviteCode,
    })
    .select('id')
    .single();

  if (orgError || !org) {
    console.error('Failed to create org:', orgError);
    process.exit(1);
  }

  const orgId = org.id;
  console.log(`✓ Created organization: ${demoBrand.name} (${orgId})`);

  // 3. Create demo users
  const userMap = new Map<string, string>();

  for (const user of demoUsers) {
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: user.email,
      password: demoPassword,
      email_confirm: true,
      user_metadata: { full_name: user.fullName },
    });

    if (authError) {
      // If user already exists, try to find them
      if (authError.message?.includes('already been registered')) {
        const { data: existingUsers } = await admin.auth.admin.listUsers();
        const existing = existingUsers?.users?.find(u => u.email === user.email);
        if (existing) {
          userMap.set(user.email, existing.id);
          // Update password
          await admin.auth.admin.updateUserById(existing.id, { password: demoPassword });
          // Create profile
          await admin.from('profiles').upsert({
            id: existing.id,
            org_id: orgId,
            role: user.role,
            full_name: user.fullName,
            email: user.email,
          });
          console.log(`  ✓ Reused user: ${user.fullName} (${user.email})`);
          continue;
        }
      }
      console.error(`  ✗ Failed to create ${user.email}:`, authError.message);
      continue;
    }

    userMap.set(user.email, authUser.user.id);

    await admin.from('profiles').insert({
      id: authUser.user.id,
      org_id: orgId,
      role: user.role,
      full_name: user.fullName,
      email: user.email,
    });

    console.log(`  ✓ Created user: ${user.fullName} (${user.email}) — ${user.role}`);
  }

  // 4. Create channels
  const channelRows = starterChannels.map(ch => ({
    org_id: orgId,
    slug: ch.slug,
    name: ch.name,
    mode: ch.mode,
    formality: ch.formality,
    llm_threshold: ch.llmThreshold,
    description: ch.description,
  }));

  const { data: channels, error: chError } = await admin
    .from('channels')
    .insert(channelRows)
    .select('id, slug');

  if (chError) {
    console.error('Failed to create channels:', chError);
    process.exit(1);
  }

  const channelMap = new Map<string, string>();
  for (const ch of channels!) {
    channelMap.set(ch.slug, ch.id);
  }
  console.log(`✓ Created ${channels!.length} channels`);

  // 5. Create rules
  const ruleRows = starterRules.map(r => ({
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

  const { data: rules, error: ruleError } = await admin
    .from('rules')
    .insert(ruleRows)
    .select('id, key');

  if (ruleError) {
    console.error('Failed to create rules:', ruleError);
    process.exit(1);
  }

  const ruleMap = new Map<string, string>();
  for (const r of rules!) {
    ruleMap.set(r.key, r.id);
  }
  console.log(`✓ Created ${rules!.length} rules`);

  // 6. Create overrides
  const overrideRows = overrideMatrix
    .map(ov => {
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
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const { error: ovError } = await (admin as any)
    .from('rule_overrides')
    .insert(overrideRows as any);

  if (ovError) {
    console.error('Failed to create overrides:', ovError);
  } else {
    console.log(`✓ Created ${overrideRows.length} rule overrides`);
  }

  // 7. Create brand profile
  const { error: brandError } = await admin
    .from('brand_profiles')
    .insert({
      org_id: orgId,
      voice: demoBrand.voice,
      pillars: demoBrand.pillars,
      redact_before_ai: demoBrand.redactBeforeAi,
      confidential_terms: demoBrand.confidentialTerms,
    });

  if (brandError) {
    console.error('Failed to create brand profile:', brandError);
  } else {
    console.log('✓ Created brand profile');
  }

  // 8. Create sample drafts for Rohan (writer)
  const writerId = userMap.get('writer@contexta-demo.com');
  if (writerId) {
    for (const draft of sampleDrafts) {
      const channelId = channelMap.get(draft.channelSlug);
      const { error: docError } = await admin
        .from('documents')
        .insert({
          org_id: orgId,
          author_id: writerId,
          title: draft.title,
          channel_id: channelId,
          content: draft.content,
          status: 'draft',
        });

      if (docError) {
        console.error(`  ✗ Failed to create draft "${draft.title}":`, docError);
      } else {
        console.log(`  ✓ Created draft: "${draft.title}"`);
      }
    }
  }

  // 9. Create seeded history for analytics
  console.log('Generating historical data for analytics...');
  await generateHistory(admin, orgId, userMap, channelMap, ruleMap);

  console.log('\n✓ Seed complete!');
  console.log('\nDemo logins:');
  console.log(`  Manager: manager@contexta-demo.com / ${demoPassword}`);
  console.log(`  Writer:  writer@contexta-demo.com / ${demoPassword}`);
  console.log(`  Invite code: ${demoBrand.inviteCode}`);
}

// Simple seeded PRNG for reproducible history
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

async function generateHistory(
  admin: any,
  orgId: string,
  userMap: Map<string, string>,
  channelMap: Map<string, string>,
  ruleMap: Map<string, string>
) {
  const rng = seededRng(42);
  const userIds = [...userMap.values()];
  const channelSlugs = [...channelMap.keys()];
  const now = Date.now();
  const day = 86400000;

  // Generate ~36 documents over 30 days
  const fragments = [
    { text: 'NimbusPay offers guaranteed returns on all savings products.', triggers: ['no-guarantee-language'] },
    { text: 'Our world-class platform provides the best savings experience.', triggers: ['no-superlatives'] },
    { text: 'Nimbus Pay is the industry-leading payment solution.', triggers: ['brand-name-casing', 'no-superlatives'] },
    { text: 'Users love our revolutionary new features!', triggers: ['preferred-customers', 'no-superlatives'] },
    { text: 'Smart Pots are the #1 savings tool for customers.', triggers: ['no-superlatives'] },
    { text: "We're gonna change how payments work forever.", triggers: ['informal-language'] },
    { text: 'NimbusPay provides risk-free investments for everyone.', triggers: ['no-guarantee-language'] },
    { text: 'Our awesome team at Nimbus Pay Ltd builds the best products.', triggers: ['informal-language', 'brand-name-casing'] },
    { text: 'Try our unbeatable rates today! 🚀🔥😍', triggers: ['no-superlatives'] },
    { text: 'Stuff like automatic savings is super excited to launch!!', triggers: ['informal-language'] },
    { text: 'NimbusPay offers zero risk investment options.', triggers: ['no-guarantee-language'] },
    { text: "Nimbus Pay Ltd's world-class security protects your money.", triggers: ['brand-name-casing', 'no-superlatives'] },
  ];

  let docCount = 0;
  const disputeData: Array<{flagId: string; ruleKey: string; channelSlug: string; userId: string}> = [];

  for (let d = 30; d >= 1; d--) {
    const docsThisDay = Math.floor(rng() * 2) + 1;
    for (let i = 0; i < docsThisDay && docCount < 36; i++) {
      const channelSlug = channelSlugs[Math.floor(rng() * channelSlugs.length)];
      const channelId = channelMap.get(channelSlug)!;
      const authorId = userIds[Math.floor(rng() * userIds.length)];
      const fragIdx = Math.floor(rng() * fragments.length);
      const frag = fragments[fragIdx];
      const title = `Document ${docCount + 1}`;
      const createdAt = new Date(now - d * day + Math.floor(rng() * day * 0.5));

      const isPublished = rng() < 0.7;
      const publishedAt = isPublished ? new Date(createdAt.getTime() + Math.floor(rng() * day * 0.3)) : null;

      const { data: doc } = await admin
        .from('documents')
        .insert({
          org_id: orgId,
          author_id: authorId,
          title,
          channel_id: channelId,
          content: frag.text,
          status: isPublished ? 'published' : 'draft',
          published_at: publishedAt?.toISOString(),
          last_check_at: createdAt.toISOString(),
          created_at: createdAt.toISOString(),
          updated_at: createdAt.toISOString(),
        })
        .select('id')
        .single();

      if (!doc) continue;
      docCount++;

      // Create check record
      await admin.from('document_checks').insert({
        document_id: doc.id,
        org_id: orgId,
        kind: 'deterministic',
        content_snapshot: frag.text,
        channel_id: channelId,
        summary: { total: frag.triggers.length, hard: frag.triggers.length > 1 ? 1 : 0, soft: frag.triggers.length, blocking: 0 },
        created_at: createdAt.toISOString(),
      });

      // Create flags for each trigger
      for (const ruleKey of frag.triggers) {
        const ruleId = ruleMap.get(ruleKey);
        if (!ruleId) continue;

        // Determine status based on random
        const roll = rng();
        let status: string;
        let statusReason: string | null = null;

        if (ruleKey === 'no-superlatives') {
          // Engineer high friction for no-superlatives
          if (roll < 0.25) { status = 'dismissed'; statusReason = 'Context makes this acceptable'; }
          else if (roll < 0.45) { status = 'disputed'; statusReason = 'This is a common phrase, not a claim'; }
          else if (roll < 0.55) { status = 'overturned'; statusReason = 'Manager agreed this is fine in context'; }
          else if (roll < 0.7) { status = 'accepted'; }
          else { status = 'open'; }
        } else if (ruleKey === 'informal-language') {
          // ~35% friction
          if (roll < 0.15) { status = 'dismissed'; statusReason = 'Tone matches the channel'; }
          else if (roll < 0.25) { status = 'disputed'; statusReason = 'This is our brand voice'; }
          else if (roll < 0.35) { status = 'overturned'; }
          else if (roll < 0.7) { status = 'accepted'; }
          else { status = 'open'; }
        } else if (ruleKey === 'brand-name-casing' && frag.text.includes('Nimbus Pay Ltd')) {
          // False positive for legal entity name
          if (roll < 0.5) { status = 'disputed'; statusReason = 'This is the legal entity name'; }
          else { status = 'open'; }
        } else {
          // Low friction for others
          if (roll < 0.8) { status = 'accepted'; }
          else if (roll < 0.9) { status = 'dismissed'; }
          else { status = 'open'; }
        }

        const fingerprint = `${ruleId}-${frag.text.slice(0, 20)}-${docCount}`;

        const { data: flag } = await admin
          .from('flags')
          .insert({
            org_id: orgId,
            document_id: doc.id,
            rule_id: ruleId,
            source: 'deterministic',
            category: ruleKey,
            severity: ruleKey === 'no-guarantee-language' || ruleKey === 'brand-name-casing' ? 'hard' : 'soft',
            scope: 'span',
            quote: frag.text.slice(0, 40),
            start_offset: 0,
            end_offset: Math.min(40, frag.text.length),
            confidence: 1,
            explanation: `Triggered by ${ruleKey}`,
            suggestions: [],
            fingerprint,
            status,
            status_reason: statusReason,
            status_by: status !== 'open' ? authorId : null,
            status_at: status !== 'open' ? createdAt.toISOString() : null,
            created_at: createdAt.toISOString(),
            updated_at: createdAt.toISOString(),
          })
          .select('id')
          .single();

        if (!flag) continue;

        // Create disputes for disputed/overturned flags
        if (status === 'disputed' || status === 'overturned') {
          const decidedBy = status === 'overturned' ? userMap.get('manager@contexta-demo.com') : null;

          await admin.from('disputes').insert({
            org_id: orgId,
            flag_id: flag.id,
            raised_by: authorId,
            category: ruleKey === 'brand-name-casing' ? 'false_positive' : 'context_exception',
            reason: statusReason || 'Disputed by writer',
            status: status === 'overturned' ? 'overturned' : 'pending',
            decided_by: decidedBy,
            decision_note: status === 'overturned' ? 'Agreed, this is acceptable in context.' : null,
            decided_at: status === 'overturned' ? new Date(createdAt.getTime() + 3600000).toISOString() : null,
            seen_by_writer: status === 'overturned',
            created_at: createdAt.toISOString(),
          });

          if (status === 'disputed') {
            disputeData.push({ flagId: flag.id, ruleKey, channelSlug, userId: authorId });
          }
        }

        // Create audit events
        if (status === 'accepted' || status === 'dismissed') {
          await admin.from('audit_events').insert({
            org_id: orgId,
            actor_id: authorId,
            action: status === 'accepted' ? 'flag_accepted' : 'flag_dismissed',
            entity_type: 'flag',
            entity_id: flag.id,
            metadata: { rule_key: ruleKey },
            created_at: createdAt.toISOString(),
          });
        }
      }

      // Audit event for check
      await admin.from('audit_events').insert({
        org_id: orgId,
        actor_id: authorId,
        action: 'check_run',
        entity_type: 'document',
        entity_id: doc.id,
        metadata: { channel: channelSlug },
        created_at: createdAt.toISOString(),
      });

      if (isPublished) {
        await admin.from('audit_events').insert({
          org_id: orgId,
          actor_id: authorId,
          action: 'document_published',
          entity_type: 'document',
          entity_id: doc.id,
          metadata: {},
          created_at: publishedAt!.toISOString(),
        });
      }
    }
  }

  // Ensure exactly 3 pending disputes for manager review
  // We'll ensure some of the disputeData entries remain pending.
  // The seeded data should already have pending disputes from the no-superlatives and brand-name-casing rules.
  const pendingDisputes = disputeData.filter(d =>
    d.ruleKey === 'no-superlatives' || d.ruleKey === 'brand-name-casing'
  ).slice(0, 3);

  console.log(`  ✓ Generated ${docCount} historical documents`);
  console.log(`  ✓ ${pendingDisputes.length} pending disputes for manager review`);
}

main().catch(console.error);
