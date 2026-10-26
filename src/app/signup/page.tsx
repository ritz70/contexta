import { Metadata } from 'next';
import { SignupForm } from './signup-form';

export const metadata: Metadata = {
  title: 'Sign up',
};

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-h1 font-bold mb-2" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
            Create your account
          </h1>
          <p className="text-body" style={{ color: 'var(--muted-foreground)' }}>
            Start governing your brand content
          </p>
        </div>

        <SignupForm />

        <p className="text-center mt-6 text-small" style={{ color: 'var(--muted-foreground)' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: 'var(--cyan)' }} className="font-medium hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
