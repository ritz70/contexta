'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { sampleDrafts } from '@/lib/samples';
import {
  Plus,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  content: string;
  status: string;
  channel_id: string | null;
  author_id: string;
  last_check_at: string | null;
  created_at: string;
  updated_at: string;
  channels: { name: string; mode: string; slug: string } | null;
  profiles: { full_name: string } | null;
}

interface Channel {
  id: string;
  slug: string;
  name: string;
  mode: string;
}

interface Props {
  documents: Document[];
  flagCounts: Record<string, { blocking: number; total: number }>;
  channels: Channel[];
  isManager: boolean;
  userId: string;
}

export function WorkspaceContent({ documents, flagCounts, channels, isManager, userId }: Props) {
  const router = useRouter();
  const [showSamples, setShowSamples] = useState(false);
  const [creating, setCreating] = useState(false);

  async function createNewDraft(title?: string, content?: string, channelSlug?: string) {
    setCreating(true);
    try {
      const supabase = createClient();
      const channelId = channelSlug
        ? channels.find(c => c.slug === channelSlug)?.id
        : null;

      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: title || 'Untitled draft',
          content: content || '',
          channel_id: channelId,
          author_id: userId,
          org_id: (await supabase.from('profiles').select('org_id').eq('id', userId).single()).data?.org_id,
        })
        .select('id')
        .single();

      if (error) throw error;
      if (data) router.push(`/app/workspace/${data.id}`);
    } catch {
      alert('Failed to create draft');
    } finally {
      setCreating(false);
      setShowSamples(false);
    }
  }

  function timeAgo(date: string) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h1 font-bold" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
            Documents
          </h1>
          <p className="text-small mt-1" style={{ color: 'var(--muted-foreground)' }}>
            {isManager ? 'All documents in your organization' : 'Your drafts and published documents'}
          </p>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2">
            <button
              onClick={() => createNewDraft()}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-small font-semibold disabled:opacity-50"
              style={{ background: 'var(--cyan)', color: 'var(--background)' }}
            >
              <Plus size={16} />
              New draft
            </button>
            <button
              onClick={() => setShowSamples(!showSamples)}
              className="px-3 py-2 rounded-lg text-small"
              style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {showSamples && (
            <div className="absolute right-0 top-full mt-1 w-72 rounded-lg shadow-lg z-50 py-1"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <p className="px-3 py-1.5 text-caption font-medium" style={{ color: 'var(--muted-foreground)' }}>
                Load sample draft
              </p>
              {sampleDrafts.map(draft => (
                <button
                  key={draft.channelSlug}
                  onClick={() => createNewDraft(draft.title, draft.content, draft.channelSlug)}
                  className="block w-full text-left px-3 py-2 text-small hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--foreground)' }}
                >
                  <span className="font-medium">{draft.title}</span>
                  <span className="block text-caption" style={{ color: 'var(--muted-foreground)' }}>
                    {draft.channelSlug.replace('-', ' ')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <FileText size={40} className="mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
          <h3 className="text-h3 font-semibold mb-2">No documents yet</h3>
          <p className="text-body mb-4" style={{ color: 'var(--muted-foreground)' }}>
            Create a new draft or load a sample to get started.
          </p>
          <button
            onClick={() => createNewDraft()}
            className="px-4 py-2 rounded-lg text-small font-semibold"
            style={{ background: 'var(--cyan)', color: 'var(--background)' }}
          >
            Create your first draft
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => {
            const counts = flagCounts[doc.id] ?? { blocking: 0, total: 0 };
            return (
              <button
                key={doc.id}
                onClick={() => router.push(`/app/workspace/${doc.id}`)}
                className="w-full text-left p-4 rounded-xl transition-colors hover:opacity-90 flex items-center gap-4"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-body font-medium truncate">{doc.title}</h3>
                    {doc.status === 'published' && (
                      <span className="px-2 py-0.5 rounded text-caption font-medium" style={{ background: 'rgba(61, 220, 151, 0.15)', color: 'var(--green)' }}>
                        Published
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-caption" style={{ color: 'var(--muted-foreground)' }}>
                    {doc.channels && (
                      <span className={`px-1.5 py-0.5 rounded text-caption mode-${doc.channels.mode}`}>
                        {doc.channels.name}
                      </span>
                    )}
                    {doc.profiles && isManager && (
                      <span>{doc.profiles.full_name}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {timeAgo(doc.updated_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {counts.blocking > 0 && (
                    <span className="flex items-center gap-1 text-caption font-medium" style={{ color: 'var(--red)' }}>
                      <AlertTriangle size={14} />
                      {counts.blocking} blocking
                    </span>
                  )}
                  {counts.total > 0 && counts.blocking === 0 && (
                    <span className="flex items-center gap-1 text-caption" style={{ color: 'var(--amber)' }}>
                      {counts.total} issue{counts.total > 1 ? 's' : ''}
                    </span>
                  )}
                  {counts.total === 0 && doc.last_check_at && (
                    <span className="flex items-center gap-1 text-caption" style={{ color: 'var(--green)' }}>
                      <CheckCircle2 size={14} />
                      Clean
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
