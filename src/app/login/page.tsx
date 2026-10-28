import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Sparkles, ArrowLeft, BookOpen } from 'lucide-react';
import { LoginForm } from './login-form';
import { isDemoMode, getDemoPassword } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Sign In — Contexta Brand Sovereign',
  description: 'Access your writer workspace or manager brand governance suite.',
};

export default function LoginPage() {
  const demoMode = isDemoMode();
  let demoPassword: string | null = null;
  if (demoMode) {
    try {
      demoPassword = getDemoPassword();
    } catch {
      demoPassword = 'Contexta#Demo2026';
    }
  }

  return (
    <div
      className="min-h-screen relative flex flex-col justify-between ambient-mesh overflow-hidden"
      style={{ background: 'var(--background)' }}
    >
      {/* Decorative ambient blurred blobs */}
      <div className="absolute top-0 -left-40 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      {/* Top Navigation */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <Link
          href="/"
          className="flex items-center gap-2 group text-small text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Home</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20">
            <Shield size={18} style={{ color: 'var(--cyan)' }} />
          </div>
          <span className="font-bold tracking-wider text-h3 text-foreground" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
            CONTEXTA
          </span>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/5 ml-1">
            v2.0
          </span>
        </div>

        <Link
          href="/guide"
          className="flex items-center gap-1.5 text-small px-3.5 py-1.5 rounded-lg border border-border bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground transition-all"
        >
          <BookOpen size={14} className="text-cyan-400" />
          <span>Judge Guide</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          {/* Header Card */}
          <div className="text-center mb-6 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-caption font-medium bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-1">
              <Sparkles size={12} />
              <span>Multi-Role Governance Portal</span>
            </div>
            <h1
              className="text-h1 font-bold tracking-tight text-foreground"
              style={{ fontFamily: 'var(--font-heading), system-ui' }}
            >
              Sign in to your Workspace
            </h1>
            <p className="text-small text-muted-foreground max-w-md mx-auto">
              Sign in with your work email or select a seeded demo account to test role-isolated governance.
            </p>
          </div>

          {/* Glass Card Container */}
          <div
            className="p-6 md:p-8 rounded-2xl glass-panel shadow-2xl relative"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px -5px rgba(34, 211, 238, 0.08)',
            }}
          >
            <LoginForm
              demoMode={demoMode}
              demoPassword={demoPassword}
              demoInviteCode="NIMBUS-DEMO"
            />
          </div>

          {/* Footer note & Signup link */}
          <div className="text-center mt-6 space-y-2">
            <p className="text-small text-muted-foreground">
              Need a separate workspace for your team?{' '}
              <Link href="/signup" className="text-cyan-400 font-semibold hover:underline">
                Register or Join with Invite Code
              </Link>
            </p>
            <p className="text-caption text-muted-foreground/80">
              Team Coriolis · Narula Institute of Technology · Round 2
            </p>
          </div>
        </div>
      </main>

      {/* Subtle bottom line */}
      <footer className="relative z-10 py-4 text-center border-t border-border/40 text-caption text-muted-foreground">
        Contexta Brand Sovereign — Strict · Balanced · Flexible Governance Ecosystem
      </footer>
    </div>
  );
}
