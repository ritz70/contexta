import { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-h1 font-bold mb-2" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
            Sign in to Contexta
          </h1>
          <p className="text-body" style={{ color: 'var(--muted-foreground)' }}>
            Brand governance that adapts to the destination
          </p>
        </div>

        <LoginForm />

        <div className="mt-6 p-4 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-small font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>
            Demo credentials
          </p>
          <div className="space-y-1 text-small" style={{ color: 'var(--foreground)' }}>
            <p><span style={{ color: 'var(--muted-foreground)' }}>Manager:</span> manager@contexta-demo.com</p>
            <p><span style={{ color: 'var(--muted-foreground)' }}>Writer:</span> writer@contexta-demo.com</p>
            <p><span style={{ color: 'var(--muted-foreground)' }}>Password:</span> <code className="font-mono" style={{ color: 'var(--cyan)' }}>Contexta#Demo2026</code></p>
          </div>
        </div>

        <p className="text-center mt-6 text-small" style={{ color: 'var(--muted-foreground)' }}>
          Don&apos;t have an account?{' '}
          <a href="/signup" style={{ color: 'var(--cyan)' }} className="font-medium hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
