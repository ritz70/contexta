import { createAdminClient } from '@/lib/supabase/admin';
import { starterChannels, starterRules, demoUsers } from './starter-pack';
import { sampleDrafts } from '../samples';

// Simple seeded PRNG for reproducible analytics history
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export async function resetDemoOrgData(orgId: string, callerUserId: string): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  // 1. Verify org exists and is marked as is_demo
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('id, name, is_demo')
    .eq('id', orgId)
    .single();

  if (orgErr || !org) {
    return { success: false, error: 'Organization not found' };
  }

  if (!org.is_demo) {
    return { success: false, error: 'Reset is only permitted for demo organizations' };
  }

  // 2. Check rate limit: maximum 3 resets per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countErr } = await admin
    .from('audit_events')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('action', 'reset_demo_data')
    .gte('created_at', oneHourAgo);

  if (!countErr && (count ?? 0) >= 3) {
    return {
      success: false,
      error: 'Rate limit exceeded: demo reset is limited to 3 times per hour',
    };
  }

  // 3. Wipe that org's documents, checks, flags, disputes, audit events
  await admin.from('disputes').delete().eq('org_id', orgId);
  await admin.from('flags').delete().eq('org_id', orgId);
  await admin.from('document_checks').delete().eq('org_id', orgId);
  await admin.from('documents').delete().eq('org_id', orgId);
  await admin.from('audit_events').delete().eq('org_id', orgId);

  // 4. Resolve the 4 baseline demo users (clean up non-demo signups for this org)
  const demoEmails = new Set(demoUsers.map((u) => u.email.toLowerCase()));
  const { data: orgProfiles } = await admin
    .from('profiles')
    .select('id, email')
    .eq('org_id', orgId);

  const userMap = new Map<string, string>();

  if (orgProfiles) {
    for (const profile of orgProfiles) {
      if (demoEmails.has(profile.email.toLowerCase())) {
        userMap.set(profile.email.toLowerCase(), profile.id);
      } else {
        // Delete transient signup profiles and auth users to restore pristine workspace
        await admin.from('profiles').delete().eq('id', profile.id);
        await admin.auth.admin.deleteUser(profile.id).catch(() => {});
      }
    }
  }

  // Ensure all 4 demo users are present in userMap
  for (const demoUser of demoUsers) {
    const key = demoUser.email.toLowerCase();
    if (!userMap.has(key)) {
      const { data: existingAuth } = await admin.auth.admin.listUsers();
      const match = existingAuth?.users?.find((u) => u.email?.toLowerCase() === key);
      if (match) {
        userMap.set(key, match.id);
        await admin.from('profiles').upsert({
          id: match.id,
          org_id: orgId,
          role: demoUser.role,
          full_name: demoUser.fullName,
          email: demoUser.email,
        });
      }
    }
  }

  // 5. Channels and Rules lookup
  const { data: channels } = await admin
    .from('channels')
    .select('id, slug')
    .eq('org_id', orgId);

  const channelMap = new Map<string, string>();
  if (channels) {
    for (const ch of channels) {
      channelMap.set(ch.slug, ch.id);
    }
  }

  const { data: rules } = await admin
    .from('rules')
    .select('id, key')
    .eq('org_id', orgId);

  const ruleMap = new Map<string, string>();
  if (rules) {
    for (const r of rules) {
      ruleMap.set(r.key, r.id);
    }
  }

  // 6. Re-seed sample drafts for Rohan (writer)
  const rohanId = userMap.get('writer@contexta-demo.com');
  if (rohanId) {
    for (const draft of sampleDrafts) {
      const channelId = channelMap.get(draft.channelSlug);
      await admin.from('documents').insert({
        org_id: orgId,
        author_id: rohanId,
        title: draft.title,
        channel_id: channelId,
        content: draft.content,
        status: 'draft',
      });
    }
  }

  // 7. Re-generate historical documents and analytics
  const rng = seededRng(42);
  const userIds = [...userMap.values()];
  const channelSlugs = [...channelMap.keys()];
  const now = Date.now();
  const day = 86400000;

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
  for (let d = 30; d >= 1; d--) {
    const docsThisDay = Math.floor(rng() * 2) + 1;
    for (let i = 0; i < docsThisDay && docCount < 36; i++) {
      const channelSlug = channelSlugs[Math.floor(rng() * channelSlugs.length)] || 'blog';
      const channelId = channelMap.get(channelSlug);
      const authorId = userIds[Math.floor(rng() * userIds.length)] || rohanId;
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

      if (doc && frag.triggers.length > 0) {
        for (const ruleKey of frag.triggers) {
          const ruleId = ruleMap.get(ruleKey);
          await admin.from('flags').insert({
            org_id: orgId,
            document_id: doc.id,
            rule_id: ruleId,
            source: 'deterministic',
            category: ruleKey,
            severity: 'soft',
            scope: 'span',
            quote: frag.text.split(' ')[0] || 'term',
            explanation: `Flagged under rule ${ruleKey}`,
            fingerprint: `${doc.id}-${ruleKey}`,
            status: isPublished ? 'dismissed' : 'open',
            created_at: createdAt.toISOString(),
            updated_at: createdAt.toISOString(),
          });
        }
      }
      docCount++;
    }
  }

  // 8. Record audit event
  await admin.from('audit_events').insert({
    org_id: orgId,
    actor_id: callerUserId,
    action: 'reset_demo_data',
    metadata: {
      source: 'brand_team_settings',
      timestamp: new Date().toISOString(),
    },
  });

  return { success: true };
}
