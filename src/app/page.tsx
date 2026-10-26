import { Metadata } from 'next';
import { getMissingEnvVars, isSetupComplete } from '@/lib/env';
import { SetupRequired } from '@/components/setup-required';
import { LandingContent } from './landing-content';

export const metadata: Metadata = {
  title: 'Contexta — Brand governance that adapts to the destination',
  description: 'Brand Sovereign — the secure, adaptive brand governance ecosystem for Enterprise AI. One brand system, three enforcement modes chosen by channel risk.',
};

export default function HomePage() {
  if (!isSetupComplete()) {
    const missing = getMissingEnvVars();
    return <SetupRequired missingVars={missing} />;
  }

  return <LandingContent />;
}
