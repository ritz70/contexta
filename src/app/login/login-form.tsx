'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  PenTool,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  KeyRound,
  Ticket,
} from 'lucide-react';

interface LoginFormProps {
  demoMode?: boolean;
  demoPassword?: string | null;
  demoInviteCode?: string | null;
}

const DEMO_USERS = [
  {
    name: 'Ananya Mehta',
    email: 'manager@contexta-demo.com',
    role: 'manager' as const,
  },
  {
    name: 'Rohan Verma',
    email: 'writer@contexta-demo.com',
    role: 'writer' as const,
  },
  {
    name: 'Priya Nair',
    email: 'priya@contexta-demo.com',
    role: 'writer' as const,
  },
  {
    name: 'Sam Carter',
    email: 'sam@contexta-demo.com',
    role: 'writer' as const,
  },
];

export function LoginForm({ demoMode = false, demoPassword = null, demoInviteCode = null }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fill credentials into the form from the demo card (real login: user still presses Sign in)
  function handleFill(userEmail: string) {
    setEmail(userEmail);
    setPassword(demoPassword || 'Contexta#Demo2026');
    setError('');
  }

  function handleCopy(text: string, key: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  }

  // Real form submission via server-side login endpoint
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const nextParam = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('next')
        : null;

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          next: nextParam,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Wrong email or password');
        setLoading(false);
        return;
      }

      const target = data.redirectTo || (nextParam && nextParam.startsWith('/app') ? nextParam : '/app/workspace');
      // Hard navigation ensures session cookie is delivered to middleware
      window.location.href = target;
    } catch {
      setError('Wrong email or password');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Real Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Inline Error Message */}
        {error && (
          <div
            className="p-3.5 rounded-xl text-small flex items-start gap-2.5 animate-in fade-in"
            style={{
              background: 'rgba(255, 93, 108, 0.12)',
              border: '1px solid rgba(255, 93, 108, 0.3)',
              color: 'var(--red)',
            }}
          >
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <p className="flex-1 font-medium">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-small font-medium text-foreground mb-1.5">
            Email
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
              autoComplete="email"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-body outline-none transition-all duration-200 focus:ring-2 focus:ring-cyan-400"
              style={{
                background: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
              placeholder="name@example.com"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-small font-medium text-foreground">
              Password
            </label>
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
              autoComplete="current-password"
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
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl text-body font-semibold transition-all duration-200 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
          style={{
            background: 'var(--cyan)',
            color: 'var(--bg)',
          }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>

        <div className="text-center pt-1">
          <p className="text-small text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-cyan-400 font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </form>

      {/* PART 2: Demo accounts card (rendered ONLY when NEXT_PUBLIC_DEMO_MODE=true) */}
      {demoMode && (
        <div
          className="p-5 rounded-2xl glass-panel space-y-4"
          style={{
            border: '1px solid rgba(34, 211, 238, 0.25)',
            background: 'rgba(13, 31, 54, 0.55)',
          }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <KeyRound size={16} style={{ color: 'var(--cyan)' }} />
              <h3 className="text-small font-bold text-foreground">Demo accounts</h3>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              4 Seeded Users
            </span>
          </div>

          {/* Seeded Users List */}
          <div className="space-y-2">
            {DEMO_USERS.map((user) => {
              const isManager = user.role === 'manager';
              return (
                <div
                  key={user.email}
                  className="flex items-center justify-between p-2.5 rounded-xl transition-colors hover:bg-white/5"
                  style={{
                    background: isManager ? 'rgba(167, 139, 250, 0.06)' : 'rgba(34, 211, 238, 0.04)',
                    border: isManager ? '1px solid rgba(167, 139, 250, 0.2)' : '1px solid rgba(34, 211, 238, 0.15)',
                  }}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-small font-semibold text-foreground truncate">{user.name}</span>
                      <span
                        className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: isManager ? 'rgba(167, 139, 250, 0.15)' : 'rgba(34, 211, 238, 0.15)',
                          color: isManager ? 'var(--violet)' : 'var(--cyan)',
                          border: isManager ? '1px solid rgba(167, 139, 250, 0.3)' : '1px solid rgba(34, 211, 238, 0.3)',
                        }}
                      >
                        {isManager ? 'Manager' : 'Writer'}
                      </span>
                    </div>
                    <p className="text-caption font-mono text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFill(user.email)}
                    className="px-3 py-1 rounded-lg text-caption font-semibold transition-all hover:opacity-90 flex-shrink-0"
                    style={{
                      background: isManager ? 'var(--violet)' : 'var(--cyan)',
                      color: 'var(--bg)',
                    }}
                  >
                    Fill
                  </button>
                </div>
              );
            })}
          </div>

          {/* Shared Password & Invite Code Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/40">
            {/* Shared Password */}
            <div
              className="p-2.5 rounded-xl flex items-center justify-between text-caption"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <div className="min-w-0 pr-2">
                <span className="block text-[10px] uppercase font-mono text-muted-foreground">Demo Password</span>
                <span className="font-mono text-foreground font-semibold truncate block">
                  {demoPassword || 'Contexta#Demo2026'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(demoPassword || 'Contexta#Demo2026', 'password')}
                className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                title="Copy password"
              >
                {copiedKey === 'password' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            </div>

            {/* Invite Code */}
            <div
              className="p-2.5 rounded-xl flex items-center justify-between text-caption"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <div className="min-w-0 pr-2">
                <span className="block text-[10px] uppercase font-mono text-muted-foreground">Invite Code</span>
                <span className="font-mono text-cyan-400 font-semibold truncate block">
                  {demoInviteCode || 'NIMBUS-DEMO'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(demoInviteCode || 'NIMBUS-DEMO', 'invite')}
                className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                title="Copy invite code"
              >
                {copiedKey === 'invite' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Explicit requirement: Exactly one line under the card */}
          <p className="text-caption text-center text-muted-foreground pt-1 border-t border-border/40 font-medium">
            Each writer sees only their own documents. The manager sees everyone&apos;s.
          </p>
        </div>
      )}
    </div>
  );
}
