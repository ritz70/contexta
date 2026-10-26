'use client';

import { AlertTriangle } from 'lucide-react';

interface MissingVar {
  name: string;
  description: string;
  required: boolean;
}

export function SetupRequired({ missingVars }: { missingVars: MissingVar[] }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg w-full" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(255, 179, 71, 0.12)' }}>
              <AlertTriangle size={24} style={{ color: 'var(--amber)' }} />
            </div>
            <div>
              <h1 className="text-h2 font-semibold" style={{ fontFamily: 'var(--font-heading), system-ui', color: 'var(--text)' }}>
                Setup Required
              </h1>
              <p className="text-small" style={{ color: 'var(--muted)' }}>
                Contexta needs a few environment variables to run
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {missingVars.map((v) => (
              <div key={v.name} className="p-3 rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <code className="text-small font-mono" style={{ color: 'var(--cyan)' }}>
                    {v.name}
                  </code>
                  {v.required && (
                    <span className="text-caption px-1.5 py-0.5 rounded" style={{ background: 'rgba(255, 93, 108, 0.15)', color: 'var(--red)' }}>
                      required
                    </span>
                  )}
                </div>
                <p className="text-small mt-1" style={{ color: 'var(--muted)' }}>
                  {v.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <p className="text-small font-medium mb-2" style={{ color: 'var(--text)' }}>
              Quick setup:
            </p>
            <ol className="text-small space-y-1" style={{ color: 'var(--muted)' }}>
              <li>1. Copy <code className="font-mono" style={{ color: 'var(--cyan)' }}>.env.example</code> to <code className="font-mono" style={{ color: 'var(--cyan)' }}>.env.local</code></li>
              <li>2. Fill in your Supabase project credentials</li>
              <li>3. Run <code className="font-mono" style={{ color: 'var(--cyan)' }}>npm run setup</code></li>
              <li>4. Restart the dev server</li>
            </ol>
          </div>

          <p className="text-caption mt-4 text-center" style={{ color: 'var(--muted)' }}>
            See <code className="font-mono">SETUP.md</code> for detailed instructions
          </p>
        </div>
      </div>
    </div>
  );
}
