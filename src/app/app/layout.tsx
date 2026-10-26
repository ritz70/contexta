import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.org_id)
    .single();

  return (
    <AppShell
      user={user}
      profile={profile}
      orgName={org?.name ?? 'Unknown'}
    >
      <main id="main-content">
        {children}
      </main>
    </AppShell>
  );
}
