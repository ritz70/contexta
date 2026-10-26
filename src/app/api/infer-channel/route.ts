import { NextRequest, NextResponse } from 'next/server';
import { getLlmConfig, isLlmConfigured } from '@/lib/env';
import { llmChat } from '@/lib/llm';
import { z } from 'zod';

const RequestSchema = z.object({
  text: z.string().min(5),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { text } = RequestSchema.parse(json);

    // If LLM configured, ask model
    if (isLlmConfigured()) {
      try {
        const config = getLlmConfig();
        const prompt = `Analyze this text and classify which publishing channel it is best suited for among:
1. "press-release" (formal corporate announcements, financial/legal compliance, strict tone)
2. "blog-post" (informative, thought leadership, medium length, balanced tone)
3. "twitter-x" (short, punchy, hashtags, flexible, <280 chars)
4. "newsletter" (direct, conversational, community-oriented)
5. "internal-slack" (informal, team updates)

Return ONLY valid JSON with keys:
- "channel_slug": string
- "confidence": number (between 0 and 1)
- "reason": string

Text:
"""${text.slice(0, 1000)}"""`;

        const response = await llmChat([
          { role: 'system', content: 'You are an expert marketing channel classifier. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ]);

        const parsed = JSON.parse(response.text.replace(/```json|```/g, '').trim());
        return NextResponse.json({ ok: true, ...parsed });
      } catch {
        // Fall back to heuristic
      }
    }

    // Deterministic heuristic fallback
    const wordCount = text.trim().split(/\s+/).length;
    let channelSlug = 'blog-post';
    let reason = 'Balanced length and tone';

    if (wordCount < 40 || text.includes('#') || text.length < 280) {
      channelSlug = 'twitter-x';
      reason = 'Short length and social format';
    } else if (text.toLowerCase().includes('for immediate release') || text.toLowerCase().includes('forward-looking statements') || text.toLowerCase().includes('quarter ended')) {
      channelSlug = 'press-release';
      reason = 'Formal corporate disclosures and structure';
    } else if (wordCount > 500) {
      channelSlug = 'blog-post';
      reason = 'Long-form editorial thought leadership';
    }

    return NextResponse.json({
      ok: true,
      channel_slug: channelSlug,
      confidence: 0.85,
      reason,
      heuristic: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Channel inference failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
