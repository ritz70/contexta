import { NextResponse } from 'next/server';
import { getSupabaseUrl, getSupabaseAnonKey, getLlmConfig } from '@/lib/env';


export async function GET() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseAnonKey();
  let dbOk = false;

  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      dbOk = res.ok;
    } catch {
      dbOk = false;
    }
  }

  let llmInfo: { configured: boolean; provider: string; model: string } = {
    configured: false,
    provider: '',
    model: '',
  };

  try {
    const config = getLlmConfig();
    llmInfo = {
      configured: !!config.apiKey,
      provider: config.provider,
      model: config.model,
    };
  } catch {
    // Server-only check failed in some edge case
  }

  return NextResponse.json({
    ok: dbOk,
    db: dbOk,
    llm: llmInfo,
    time: new Date().toISOString(),
  });
}
