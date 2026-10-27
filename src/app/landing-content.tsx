'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, GitBranch, CheckCircle2, FileText, Eye, Send, ArrowRight, Zap, Lock, BarChart3 } from 'lucide-react';

export function LandingContent() {
  const router = useRouter();
  const [demoLoading, setDemoLoading] = useState<'writer' | 'manager' | null>(null);

  async function handleDemoLogin(role: 'writer' | 'manager') {
    setDemoLoading(role);
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.ok || data.success) {
        window.location.href = data.redirectTo || '/app/workspace';
      } else {
        alert(data.error?.message || data.error || 'Demo login failed');
      }
    } catch {
      alert('Demo login failed. Make sure the database is seeded.');
    } finally {
      setDemoLoading(null);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Shield size={24} style={{ color: 'var(--cyan)' }} />
          <span className="text-h3 font-bold" style={{ fontFamily: 'var(--font-heading), system-ui', color: 'var(--text)' }}>
            Contexta
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/guide" className="text-small px-3 py-1.5 rounded-lg transition-colors hover:opacity-80" style={{ color: 'var(--muted)' }}>
            Guide
          </a>
          <a href="/login" className="text-small px-4 py-2 rounded-lg transition-colors" style={{ color: 'var(--text)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            Sign in
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-8 py-24">
        {/* Glass panes - CSS-only decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-3xl rotate-12 opacity-10"
            style={{ background: 'linear-gradient(135deg, var(--cyan), transparent)', border: '1px solid var(--cyan)' }} />
          <div className="absolute top-48 -left-24 w-80 h-80 rounded-3xl -rotate-6 opacity-8"
            style={{ background: 'linear-gradient(225deg, var(--amber), transparent)', border: '1px solid var(--amber)', opacity: 0.06 }} />
          <div className="absolute bottom-12 right-24 w-64 h-64 rounded-3xl rotate-45 opacity-5"
            style={{ background: 'linear-gradient(315deg, var(--violet), transparent)', border: '1px solid var(--violet)', opacity: 0.04 }} />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <p className="text-small font-medium mb-4 tracking-wider uppercase" style={{ color: 'var(--cyan)' }}>
            Brand Sovereign
          </p>
          <h1 className="text-display font-bold mb-6" style={{ fontFamily: 'var(--font-heading), system-ui', color: 'var(--text)', lineHeight: '1.15' }}>
            Brand governance that{' '}
            <span style={{ color: 'var(--cyan)' }}>adapts</span>{' '}
            to the destination
          </h1>
          <p className="text-h3 mb-10 max-w-2xl mx-auto" style={{ color: 'var(--muted)', fontWeight: 400 }}>
            One brand system, three enforcement modes chosen by channel risk. Strict for legal. Balanced for blogs. Flexible for social. Your rules everywhere, tuned to each context.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => handleDemoLogin('writer')}
              disabled={demoLoading !== null}
              className="px-6 py-3 rounded-lg text-body font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--cyan)', color: 'var(--bg)' }}
            >
              {demoLoading === 'writer' ? 'Signing in…' : 'Try as Writer'}
              {!demoLoading && <ArrowRight size={16} className="inline ml-2" />}
            </button>
            <button
              onClick={() => handleDemoLogin('manager')}
              disabled={demoLoading !== null}
              className="px-6 py-3 rounded-lg text-body font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              {demoLoading === 'manager' ? 'Signing in…' : 'Try as Manager'}
              {!demoLoading && <ArrowRight size={16} className="inline ml-2" />}
            </button>
          </div>
        </div>
      </section>

      {/* Three Modes */}
      <section className="px-8 py-20" style={{ background: 'var(--surface)' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-h1 font-bold text-center mb-4" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
            Three modes, one system
          </h2>
          <p className="text-body text-center mb-12 max-w-2xl mx-auto" style={{ color: 'var(--muted)' }}>
            Not every channel needs the same rules. Press releases demand precision. Social posts need personality. Contexta knows the difference.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                mode: 'Strict',
                badgeClass: 'mode-strict',
                channels: 'Press releases · Legal · Whitepapers',
                description: 'Hard compliance checks. Precise terminology required. Every word matters.',
                icon: Shield,
              },
              {
                mode: 'Balanced',
                badgeClass: 'mode-balanced',
                channels: 'Blogs · Website · Newsletters',
                description: 'Brand pillars preserved. Style and personality allowed. The sweet spot.',
                icon: GitBranch,
              },
              {
                mode: 'Flexible',
                badgeClass: 'mode-flexible',
                channels: 'Social · Memes · Ad copy',
                description: 'Colloquialisms and emojis welcome. Brand safety still protected.',
                icon: Zap,
              },
            ].map(({ mode, badgeClass, channels, description, icon: Icon }) => (
              <div
                key={mode}
                className="p-6 rounded-xl"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Icon size={20} style={{ color: 'var(--cyan)' }} />
                  <span className={`px-2.5 py-1 rounded-md text-small ${badgeClass}`}>
                    {mode}
                  </span>
                </div>
                <p className="text-caption mb-3 font-medium" style={{ color: 'var(--muted)' }}>
                  {channels}
                </p>
                <p className="text-body" style={{ color: 'var(--text)' }}>
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-8 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-h1 font-bold text-center mb-12" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
            How it works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { step: 1, label: 'Choose', desc: 'Select your channel and enforcement mode', icon: FileText },
              { step: 2, label: 'Resolve', desc: 'Rules adapt to the channel context', icon: GitBranch },
              { step: 3, label: 'Check', desc: 'Instant rule checks + AI tone analysis', icon: CheckCircle2 },
              { step: 4, label: 'Review', desc: 'Accept, dismiss, or dispute each flag', icon: Eye },
              { step: 5, label: 'Publish', desc: 'Hard issues resolved, copy goes live', icon: Send },
            ].map(({ step, label, desc, icon: Icon }) => (
              <div key={step} className="text-center p-4">
                <div className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <Icon size={18} style={{ color: 'var(--cyan)' }} />
                </div>
                <div className="text-caption font-bold mb-1" style={{ color: 'var(--cyan)' }}>Step {step}</div>
                <div className="text-body font-semibold mb-1">{label}</div>
                <div className="text-small" style={{ color: 'var(--muted)' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Principles */}
      <section className="px-8 py-20" style={{ background: 'var(--surface)' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-h1 font-bold text-center mb-12" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
            Built on principles that matter
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'Deterministic gates decide; AI advises', desc: 'Only hard rules can block publishing. AI flags are always advisory — because AI is fallible.', icon: Shield },
              { title: 'The AI suggests; the writer decides', desc: 'Writers accept, dismiss, or dispute each flag. They stay in control of their words.', icon: FileText },
              { title: 'Disputes become learning signals', desc: 'Overrides and disputes feed analytics, friction alerts, and smarter rules over time.', icon: BarChart3 },
              { title: 'Privacy by design', desc: 'Tenant isolation via RLS. Server-side-only LLM calls. Optional redaction before AI.', icon: Lock },
            ].map(({ title, desc, icon: Icon }) => (
              <div key={title} className="p-5 rounded-xl flex gap-4" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="flex-shrink-0 mt-0.5">
                  <Icon size={18} style={{ color: 'var(--cyan)' }} />
                </div>
                <div>
                  <h3 className="text-body font-semibold mb-1">{title}</h3>
                  <p className="text-small" style={{ color: 'var(--muted)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-8 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield size={16} style={{ color: 'var(--cyan)' }} />
            <span className="text-small font-semibold">Contexta</span>
            <span className="text-caption" style={{ color: 'var(--muted)' }}>
              — Brand Sovereign: the secure, adaptive brand governance ecosystem for Enterprise AI
            </span>
          </div>
          <div className="text-caption" style={{ color: 'var(--muted)' }}>
            Team Coriolis · Narula Institute of Technology
          </div>
        </div>
      </footer>
    </div>
  );
}
