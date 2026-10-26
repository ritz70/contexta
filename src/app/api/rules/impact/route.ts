import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/env';
import { z } from 'zod';

const ImpactSchema = z.object({
  ruleId: z.string().optional(),
  pattern: z.string().min(1),
  isRegex: z.boolean().default(false),
  ruleType: z.string().default('forbidden_claim'),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { pattern, isRegex } = ImpactSchema.parse(json);

    const cookieStore = await cookies();
    const supabase = createServerClient(
      getSupabaseUrl() || 'http://localhost:54321',
      getSupabaseAnonKey() || 'anon-key',
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    // Fetch up to 50 recent documents to assess impact
    const { data: docs } = await supabase
      .from('documents')
      .select('id, title, content_plaintext, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    const regex = isRegex ? new RegExp(pattern, 'i') : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const affectedDocs: Array<{ id: string; title: string; matchSample: string }> = [];

    for (const doc of docs || []) {
      const text = doc.content_plaintext || '';
      const match = text.match(regex);
      if (match) {
        const start = Math.max(0, (match.index || 0) - 20);
        const end = Math.min(text.length, (match.index || 0) + match[0].length + 20);
        affectedDocs.push({
          id: doc.id,
          title: doc.title || 'Untitled',
          matchSample: text.slice(start, end),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      totalSampled: (docs || []).length,
      affectedCount: affectedDocs.length,
      impactPercentage: docs?.length ? Math.round((affectedDocs.length / docs.length) * 100) : 0,
      samples: affectedDocs.slice(0, 5),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Impact test failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
