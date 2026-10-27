'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Shield,
  PenTool,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Sliders,
  Zap,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export function LoginForm() {
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<'writer' | 'manager'>('writer');
  const [email, setEmail] = useState('writer@contexta-demo.com');
  const [password, setPassword] = useState('Contexta#Demo2026');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoFastTracking, setDemoFastTracking] = useState<'writer' | 'manager' | null>(null);
  const [error, setError] = useState('');

  // Handle persona switch
  function handlePersonaSwitch(role: 'writer' | 'manager') {
    setActiveRole(role);
    setError('');
    if (role === 'writer') {
      setEmail('writer@contexta-demo.com');
      setPassword('Contexta#Demo2026');
    } else {
      setEmail('manager@contexta-demo.com');
      setPassword('Contexta#Demo2026');
    }
  }

  // Instant 1-Click Fast-Track login via backend demo endpoint
  async function handleFastTrackLogin(role: 'writer' | 'manager') {
    setDemoFastTracking(role);
    setError('');
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.success || data.ok) {
        toast.success(`Welcome back, ${role === 'manager' ? 'Ananya (Manager)' : 'Rohan (Writer)'}!`);
        router.push(data.redirectTo || '/app/workspace');
        router.refresh();
      } else {
        setError(data.error || 'Authentication failed. Please check demo database setup.');
      }
    } catch {
      setError('Unable to authenticate with demo service.');
    } finally {
      setDemoFastTracking(null);
    }
  }

  // Standard form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      toast.success('Signed in successfully');
      router.push('/app/workspace');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Role Selection Tabs */}
      <div
        className="p-1.5 rounded-2xl flex gap-1.5 glass-panel"
        style={{ border: '1px solid rgba(34, 211, 238, 0.2)' }}
      >
        <button
          type="button"
          onClick={() => handlePersonaSwitch('writer')}
          className={`flex-1 py-3 px-4 rounded-xl text-small font-semibold transition-all duration-200 flex items-center justify-center gap-2.5 ${
            activeRole === 'writer'
              ? 'glow-pill-cyan text-background'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          }`}
          style={{
            background: activeRole === 'writer' ? 'var(--cyan)' : 'transparent',
          }}
        >
          <PenTool size={16} />
          <span>Writer Persona</span>
          <span
            className="text-caption px-2 py-0.5 rounded-full font-mono text-[10px]"
            style={{
              background: activeRole === 'writer' ? 'rgba(7, 18, 31, 0.2)' : 'var(--surface-2)',
            }}
          >
            Rohan
          </span>
        </button>

        <button
          type="button"
          onClick={() => handlePersonaSwitch('manager')}
          className={`flex-1 py-3 px-4 rounded-xl text-small font-semibold transition-all duration-200 flex items-center justify-center gap-2.5 ${
            activeRole === 'manager'
              ? 'glow-pill-purple text-background'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          }`}
          style={{
            background: activeRole === 'manager' ? 'var(--violet)' : 'transparent',
          }}
        >
          <Shield size={16} />
          <span>Manager Persona</span>
          <span
            className="text-caption px-2 py-0.5 rounded-full font-mono text-[10px]"
            style={{
              background: activeRole === 'manager' ? 'rgba(7, 18, 31, 0.2)' : 'var(--surface-2)',
            }}
          >
            Ananya
          </span>
        </button>
      </div>

      {/* Role Context & Capabilities Banner */}
      <div
        className="p-4 rounded-xl transition-all duration-200"
        style={{
          background:
            activeRole === 'manager'
              ? 'linear-gradient(135deg, rgba(167, 139, 250, 0.12), rgba(13, 31, 54, 0.6))'
              : 'linear-gradient(135deg, rgba(34, 211, 238, 0.12), rgba(13, 31, 54, 0.6))',
          border:
            activeRole === 'manager'
              ? '1px solid rgba(167, 139, 250, 0.25)'
              : '1px solid rgba(34, 211, 238, 0.25)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{
              background:
                activeRole === 'manager'
                  ? 'rgba(167, 139, 250, 0.2)'
                  : 'rgba(34, 211, 238, 0.2)',
              color: activeRole === 'manager' ? 'var(--violet)' : 'var(--cyan)',
            }}
          >
            {activeRole === 'manager' ? <Sliders size={18} /> : <Zap size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-small font-bold text-foreground">
                {activeRole === 'manager' ? 'Brand Governance & Review' : 'Adaptive Copy Authoring'}
              </h4>
              <span
                className="text-[11px] font-mono px-2 py-0.5 rounded-full"
                style={{
                  background:
                    activeRole === 'manager'
                      ? 'rgba(167, 139, 250, 0.15)'
                      : 'rgba(34, 211, 238, 0.15)',
                  color: activeRole === 'manager' ? 'var(--violet)' : 'var(--cyan)',
                }}
              >
                {activeRole === 'manager' ? 'Role: Manager' : 'Role: Writer'}
              </span>
            </div>
            <p className="text-caption text-muted-foreground mt-1">
              {activeRole === 'manager'
                ? 'Review writer disputes, tune channel risk thresholds (Strict/Balanced/Flexible), manage team roles, and track audit trails.'
                : 'Draft in TipTap editor with instant deterministic checks, inline wave highlights, 1-click fixes, and false-positive disputes.'}
            </p>
          </div>
        </div>
      </div>

      {/* 1-Click Fast-Track Button */}
      <div>
        <button
          type="button"
          onClick={() => handleFastTrackLogin(activeRole)}
          disabled={demoFastTracking !== null}
          className="w-full py-3.5 px-4 rounded-xl text-body font-semibold transition-all duration-200 flex items-center justify-center gap-2 group hover:opacity-95 disabled:opacity-50"
          style={{
            background:
              activeRole === 'manager'
                ? 'linear-gradient(135deg, var(--violet), #8b5cf6)'
                : 'linear-gradient(135deg, var(--cyan), #06b6d4)',
            color: '#07121f',
            boxShadow:
              activeRole === 'manager'
                ? '0 10px 25px -5px rgba(167, 139, 250, 0.35)'
                : '0 10px 25px -5px rgba(34, 211, 238, 0.35)',
          }}
        >
          {demoFastTracking ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Authenticating {activeRole}...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>
                1-Click Instant Login as {activeRole === 'manager' ? 'Manager (Ananya)' : 'Writer (Rohan)'}
              </span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </div>

      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-border" />
        <span
          className="absolute px-3 text-caption text-muted-foreground uppercase tracking-wider"
          style={{ background: 'var(--card)' }}
        >
          Or sign in with email
        </span>
      </div>

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            className="p-3.5 rounded-xl text-small flex items-start gap-2.5 animate-in fade-in"
            style={{
              background: 'rgba(255, 93, 108, 0.12)',
              border: '1px solid rgba(255, 93, 108, 0.3)',
              color: 'var(--red)',
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-small font-medium text-foreground mb-1.5">
            Work Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
              <Mail size={16} />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-body outline-none transition-all duration-200 focus:ring-2 focus:ring-cyan-400"
              style={{
                background: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
              placeholder="name@company.com"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-small font-medium text-foreground">
              Password
            </label>
            <span className="text-caption text-cyan-400 font-mono">Demo: Contexta#Demo2026</span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
              <Lock size={16} />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-11 py-2.5 rounded-xl text-body outline-none transition-all duration-200 focus:ring-2 focus:ring-cyan-400 font-mono text-small"
              style={{
                background: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
              placeholder="••••••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl text-small font-semibold transition-all duration-200 flex items-center justify-center gap-2 hover:bg-surface-2"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          <span>{loading ? 'Authenticating…' : 'Sign in with Password'}</span>
        </button>
      </form>

      {/* Security & Organization Badges */}
      <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 size={13} style={{ color: 'var(--green)' }} />
          Tenant Isolation (RLS)
        </span>
        <span className="font-mono text-cyan-400">Org: NimbusPay</span>
        <span>Team Coriolis</span>
      </div>
    </div>
  );
}
