import { NextRequest, NextResponse } from 'next/server';
import { getLlmConfig, isLlmConfigured } from '@/lib/env';
import { llmChat } from '@/lib/llm';
import { z } from 'zod';

const FixItSchema = z.object({
  quote: z.string().min(1),
  ruleName: z.string().optional(),
  ruleDescription: z.string().optional(),
  channelMode: z.enum(['strict', 'balanced', 'flexible']).optional().default('balanced'),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { quote, ruleName, ruleDescription, channelMode } = FixItSchema.parse(json);

    if (isLlmConfigured()) {
      try {
        const config = getLlmConfig();
        const prompt = `You are a professional brand editor.
A writer has drafted copy that triggered a brand rule:
- Rule: "${ruleName || 'Brand Compliance'}"
- Rule context: "${ruleDescription || 'Align with enterprise voice'}"
- Channel mode: "${channelMode}"
- Offending phrase/sentence: "${quote}"

Generate 3 high quality, distinct alternative rewrites that fix the violation while preserving the original intent.
Return ONLY valid JSON with a single key "alternatives" containing an array of 3 strings.`;

        const res = await llmChat([
          { role: 'system', content: 'You are an expert copy editor. Output JSON only.' },
          { role: 'user', content: prompt },
        ]);

        const parsed = JSON.parse(res.text.replace(/```json|```/g, '').trim());
        return NextResponse.json({ ok: true, alternatives: parsed.alternatives || [] });
      } catch {
        // Fall back to template-based alternatives
      }
    }

    // Heuristic fallbacks
    const cleanQuote = quote.trim();
    const alternatives = [
      cleanQuote.replace(/100% bug-free|unhackable/gi, 'enterprise-grade and verified'),
      cleanQuote.replace(/best|guaranteed/gi, 'rigorously tested'),
      `Validated implementation: ${cleanQuote}`,
    ];

    return NextResponse.json({
      ok: true,
      alternatives,
      heuristic: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Fix-it failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
