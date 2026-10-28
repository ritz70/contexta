'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export function SignupForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          action: mode === 'create' ? 'create_org' : 'join_org',
          orgName: mode === 'create' ? orgName : undefined,
          inviteCode: mode === 'join' ? inviteCode : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Signup failed');
        setLoading(false);
        return;
      }

      // Sign in after signup via server session endpoint
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();

      if (!loginRes.ok || !loginData.success) {
        setError('Account created! Please sign in with your credentials.');
        setLoading(false);
        return;
      }

      window.location.href = loginData.redirectTo || '/app/workspace';
    } catch {
      setError('Signup failed. Please try again.');
      setLoading(false);
    }
  }

  const inputStyle = {
    background: 'var(--background)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={() => setMode('create')}
          className="flex-1 py-2.5 text-small font-medium transition-colors"
          style={{
            background: mode === 'create' ? 'var(--cyan)' : 'var(--card)',
            color: mode === 'create' ? 'var(--background)' : 'var(--muted-foreground)',
          }}
        >
          Create organization
        </button>
        <button
          type="button"
          onClick={() => setMode('join')}
          className="flex-1 py-2.5 text-small font-medium transition-colors"
          style={{
            background: mode === 'join' ? 'var(--cyan)' : 'var(--card)',
            color: mode === 'join' ? 'var(--background)' : 'var(--muted-foreground)',
          }}
        >
          Join with invite code
        </button>
      </div>

      <div className="p-6 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-small font-medium mb-1.5">Full name</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-body outline-none"
              style={inputStyle}
              placeholder="Your full name"
            />
          </div>

          <div>
            <label htmlFor="signup-email" className="block text-small font-medium mb-1.5">Email</label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-body outline-none"
              style={inputStyle}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-small font-medium mb-1.5">Password</label>
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 pr-10 rounded-lg text-body outline-none"
                style={inputStyle}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === 'create' && (
            <div>
              <label htmlFor="orgName" className="block text-small font-medium mb-1.5">Organization name</label>
              <input
                id="orgName"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg text-body outline-none"
                style={inputStyle}
                placeholder="Your company or brand"
              />
              <p className="text-caption mt-1" style={{ color: 'var(--muted-foreground)' }}>
                You&apos;ll become the manager. Your team can join with an invite code.
              </p>
            </div>
          )}

          {mode === 'join' && (
            <div>
              <label htmlFor="inviteCode" className="block text-small font-medium mb-1.5">Invite code</label>
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg text-body outline-none font-mono"
                style={inputStyle}
                placeholder="e.g. NIMBUS-DEMO"
              />
              <p className="text-caption mt-1" style={{ color: 'var(--muted-foreground)' }}>
                You&apos;ll join as a writer. Ask your manager for the code.
              </p>
            </div>
          )}

          {error && (
            <div className="text-small p-3 rounded-lg" style={{ background: 'rgba(255, 93, 108, 0.1)', color: 'var(--red)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-body font-semibold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--cyan)', color: 'var(--background)' }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Creating account…' : mode === 'create' ? 'Create organization' : 'Join organization'}
          </button>
        </div>
      </div>
    </form>
  );
}
