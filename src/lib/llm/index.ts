// LLM provider wrapper — server-only, plain fetch, no heavy SDKs
// Adapters: gemini (default), openai-compatible, anthropic

import { getLlmConfig } from '@/lib/env';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
}

export interface LlmResponse {
  text: string;
  model: string;
  provider: string;
}

/**
 * Send a request to the configured LLM provider.
 * Server-only. Uses plain fetch with AbortController for timeouts.
 */
export async function llmChat(
  messages: LlmMessage[],
  options: LlmOptions = {}
): Promise<LlmResponse> {
  const config = getLlmConfig();

  if (!config.apiKey) {
    throw new LlmError('LLM_API_KEY is not configured', 'no_key');
  }

  const { temperature = 0.2, maxTokens = 2048, jsonMode = false, timeoutMs = 20000 } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    switch (config.provider) {
      case 'gemini':
        return await callGemini(config, messages, { temperature, maxTokens, jsonMode }, controller.signal);
      case 'openai':
        return await callOpenAI(config, messages, { temperature, maxTokens, jsonMode }, controller.signal);
      case 'anthropic':
        return await callAnthropic(config, messages, { temperature, maxTokens, jsonMode }, controller.signal);
      default:
        throw new LlmError(`Unknown provider: ${config.provider}`, 'unknown_provider');
    }
  } catch (err) {
    if (err instanceof LlmError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new LlmError('LLM request timed out', 'timeout');
    }
    throw new LlmError(
      `LLM request failed: ${err instanceof Error ? err.message : String(err)}`,
      'provider_error'
    );
  } finally {
    clearTimeout(timeout);
  }
}

export class LlmError extends Error {
  constructor(
    message: string,
    public code: 'no_key' | 'timeout' | 'provider_error' | 'unknown_provider' | 'invalid_response' | 'rate_limit'
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

// ============================================================
// Gemini adapter
// ============================================================

async function callGemini(
  config: ReturnType<typeof getLlmConfig>,
  messages: LlmMessage[],
  opts: { temperature: number; maxTokens: number; jsonMode: boolean },
  signal: AbortSignal
): Promise<LlmResponse> {
  const model = config.model || 'gemini-3.8-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

  // Convert messages to Gemini format
  const systemInstruction = messages.find(m => m.role === 'system');
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: opts.temperature,
      maxOutputTokens: opts.maxTokens,
      ...(opts.jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    // If model is retired, try to list models and pick flash
    if (res.status === 404 || errText.includes('not found')) {
      console.warn(`Model ${model} not found, attempting fallback...`);
      const fallbackModel = await findFlashModel(config.apiKey);
      if (fallbackModel && fallbackModel !== model) {
        console.log(`Falling back to model: ${fallbackModel}`);
        const fallbackConfig = { ...config, model: fallbackModel };
        return callGemini(fallbackConfig, messages, opts, signal);
      }
    }
    throw new LlmError(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`, 'provider_error');
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) {
    throw new LlmError('Empty response from Gemini', 'invalid_response');
  }

  return { text, model, provider: 'gemini' };
}

async function findFlashModel(apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET' }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const models = data?.models ?? [];
    // Look for a flash model that isn't retired
    const flash = models.find((m: { name: string }) =>
      m.name.includes('flash') && !m.name.includes('2.5') && !m.name.includes('2.0') && !m.name.includes('1.5')
    );
    if (flash) return flash.name.replace('models/', '');
    // Fall back to any flash-lite
    const lite = models.find((m: { name: string }) => m.name.includes('flash-lite'));
    if (lite) return lite.name.replace('models/', '');
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// OpenAI-compatible adapter
// ============================================================

async function callOpenAI(
  config: ReturnType<typeof getLlmConfig>,
  messages: LlmMessage[],
  opts: { temperature: number; maxTokens: number; jsonMode: boolean },
  signal: AbortSignal
): Promise<LlmResponse> {
  const model = config.model || 'gpt-4o-mini';
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';

  const body: Record<string, unknown> = {
    model,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
  };

  if (opts.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new LlmError(`OpenAI API error ${res.status}: ${errText.slice(0, 200)}`, 'provider_error');
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  if (!text) {
    throw new LlmError('Empty response from OpenAI-compatible API', 'invalid_response');
  }

  return { text, model, provider: 'openai' };
}

// ============================================================
// Anthropic adapter
// ============================================================

async function callAnthropic(
  config: ReturnType<typeof getLlmConfig>,
  messages: LlmMessage[],
  opts: { temperature: number; maxTokens: number; jsonMode: boolean },
  signal: AbortSignal
): Promise<LlmResponse> {
  const model = config.model || 'claude-sonnet-4-20250514';

  const systemMsg = messages.find(m => m.role === 'system');
  const nonSystemMsgs = messages.filter(m => m.role !== 'system');

  const body: Record<string, unknown> = {
    model,
    messages: nonSystemMsgs.map(m => ({ role: m.role, content: m.content })),
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
  };

  if (systemMsg) {
    body.system = systemMsg.content;
  }

  // Anthropic doesn't have a json_mode; we instruct via prompt
  // If jsonMode, add instruction to system
  if (opts.jsonMode && systemMsg) {
    body.system = systemMsg.content + '\n\nYou MUST respond with valid JSON only. No markdown, no explanation.';
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new LlmError(`Anthropic API error ${res.status}: ${errText.slice(0, 200)}`, 'provider_error');
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text ?? '';
  if (!text) {
    throw new LlmError('Empty response from Anthropic', 'invalid_response');
  }

  return { text, model, provider: 'anthropic' };
}
