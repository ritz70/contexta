import { Metadata } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';
import { WorkspaceContent } from './workspace-content';

export const metadata: Metadata = {
  title: 'Documents',
};

export default async function WorkspacePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single();

  // Fetch documents
  const { data: documents } = await supabase
    .from('documents')
    .select(`
      id, title, content, status, channel_id, author_id, last_check_at, created_at, updated_at,
      channels!documents_channel_id_fkey ( name, mode, slug ),
      profiles!documents_author_id_fkey ( full_name )
    `)
    .order('updated_at', { ascending: false });

  // Fetch flag counts per document
  const docIds = documents?.map(d => d.id) ?? [];
  let flagCounts: Record<string, { blocking: number; total: number }> = {};

  if (docIds.length > 0) {
    const { data: flags } = await supabase
      .from('flags')
      .select('document_id, severity, status')
      .in('document_id', docIds)
      .in('status', ['open', 'disputed', 'upheld']);

    if (flags) {
      for (const f of flags) {
        if (!flagCounts[f.document_id]) {
          flagCounts[f.document_id] = { blocking: 0, total: 0 };
        }
        flagCounts[f.document_id].total++;
        if (f.severity === 'hard' && ['open', 'disputed', 'upheld'].includes(f.status)) {
          flagCounts[f.document_id].blocking++;
        }
      }
    }
  }

  // Fetch channels for the "Load sample draft" dropdown
  const { data: channels } = await supabase
    .from('channels')
    .select('id, slug, name, mode')
    .order('mode');

  const formattedDocs = (documents ?? []).map((d: any) => ({
    ...d,
    channels: Array.isArray(d.channels) ? d.channels[0] ?? null : d.channels ?? null,
    profiles: Array.isArray(d.profiles) ? d.profiles[0] ?? null : d.profiles ?? null,
  }));

  return (
    <WorkspaceContent
      documents={formattedDocs}
      flagCounts={flagCounts}
      channels={channels ?? []}
      isManager={profile?.role === 'manager'}
      userId={user.id}
    />
  );
}
