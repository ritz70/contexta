import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div className="max-w-md space-y-6">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <Shield size={32} style={{ color: 'var(--cyan)' }} />
        </div>
        <div>
          <h1 className="text-display font-bold" style={{ fontFamily: 'var(--font-heading), system-ui' }}>404</h1>
          <h2 className="text-h3 font-semibold mt-2">Page Not Found</h2>
          <p className="text-small mt-2" style={{ color: 'var(--muted)' }}>
            The requested document or governance resource does not exist or has been moved.
          </p>
        </div>
        <div>
          <Link
            href="/app/workspace"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-small font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--cyan)', color: 'var(--bg)' }}
          >
            <ArrowLeft size={16} /> Return to Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
