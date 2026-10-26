import { createServerSupabase } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { EditorClient } from './editor-client';

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: doc } = await supabase.from('documents').select('*').eq('id', id).single();
  if (!doc) notFound();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const { data: channels } = await supabase.from('channels').select('*').order('mode');
  const { data: flags } = await supabase.from('flags').select('*').eq('document_id', id).neq('status', 'auto_resolved').order('start_offset');
  const { data: rulesData } = await supabase.from('rules').select('id, key, name, description, type, base_severity, dos, donts').eq('org_id', doc.org_id);

  return (
    <EditorClient
      document={doc}
      channels={channels ?? []}
      initialFlags={flags ?? []}
      rules={rulesData ?? []}
      userId={user.id}
      userRole={profile?.role ?? 'writer'}
    />
  );
}
