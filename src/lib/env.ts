// Environment variable utilities — never throw at build time
// Server-only variables are gated behind functions, not top-level reads

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
}

export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
}

export function getSupabaseServiceRoleKey(): string {
  if (typeof window !== 'undefined') {
    throw new Error('Service role key must not be used in the browser');
  }
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
}

export function getLlmConfig() {
  if (typeof window !== 'undefined') {
    throw new Error('LLM config must not be used in the browser');
  }
  return {
    provider: (process.env.LLM_PROVIDER ?? 'gemini') as 'gemini' | 'openai' | 'anthropic',
    apiKey: process.env.LLM_API_KEY ?? '',
    model: process.env.LLM_MODEL || 'gemini-3.8-flash',
    baseUrl: process.env.LLM_BASE_URL ?? '',
  };
}

export function isLlmConfigured(): boolean {
  return typeof process !== 'undefined' && !!process.env.LLM_API_KEY;
}

export function getDemoPassword(): string {
  if (typeof window !== 'undefined') {
    throw new Error('Demo password must not be used in the browser');
  }
  return process.env.DEMO_PASSWORD ?? 'Contexta#Demo2026';
}

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

export interface MissingEnvVar {
  name: string;
  description: string;
  required: boolean;
}

export function getMissingEnvVars(): MissingEnvVar[] {
  const missing: MissingEnvVar[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push({
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      description: 'Your Supabase project URL (e.g. https://xyz.supabase.co)',
      required: true,
    });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push({
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      description: 'Supabase publishable/anon key',
      required: true,
    });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push({
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      description: 'Supabase secret/service_role key (server-only)',
      required: true,
    });
  }

  return missing;
}

export function isSetupComplete(): boolean {
  return getMissingEnvVars().filter((v) => v.required).length === 0;
}
