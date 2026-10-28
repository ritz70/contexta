'use client';

import { useState, useMemo } from 'react';
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
  Search,
  Filter,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Send,
  Sliders,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'strict' | 'balanced' | 'flexible' | 'published'>('all');
  const [managerScope, setManagerScope] = useState<'all' | 'mine'>('all');

  async function createNewDraft(title?: string, content?: string, channelSlug?: string) {
    setCreating(true);
    try {
      const supabase = createClient();
      const channelId = channelSlug
        ? channels.find((c) => c.slug === channelSlug)?.id
        : channels[0]?.id || null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', userId)
        .single();

      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: title || 'Untitled draft',
          content: content || '',
          channel_id: channelId,
          author_id: userId,
          org_id: profile?.org_id,
        })
        .select('id')
        .single();

      if (error) throw error;
      toast.success('New document created');
      if (data) router.push(`/app/workspace/${data.id}`);
    } catch {
      toast.error('Failed to create draft');
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

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.channels?.name && doc.channels.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (doc.profiles?.full_name && doc.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      if (isManager && managerScope === 'mine' && doc.author_id !== userId) return false;

      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'published') return doc.status === 'published';
      return doc.channels?.mode === selectedFilter;
    });
  }, [documents, searchQuery, selectedFilter, isManager, managerScope, userId]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const total = documents.length;
    let published = 0;
    let blockingCount = 0;
    for (const d of documents) {
      if (d.status === 'published') published++;
      const counts = flagCounts[d.id];
      if (counts && counts.blocking > 0) blockingCount += counts.blocking;
    }
    return { total, published, blockingCount };
  }, [documents, flagCounts]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header with Title and Create Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-h1 font-bold text-foreground" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
              Content Workspace
            </h1>
            <span
              className="text-caption px-2.5 py-0.5 rounded-full font-mono uppercase font-semibold"
              style={{
                background: isManager ? 'rgba(168, 85, 247, 0.15)' : 'rgba(34, 211, 238, 0.15)',
                color: isManager ? 'var(--violet)' : 'var(--cyan)',
                border: isManager ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(34, 211, 238, 0.3)',
              }}
            >
              {isManager ? 'Manager View' : 'Writer View'}
            </span>
          </div>
          <p className="text-small text-muted-foreground">
            {isManager
              ? 'Oversee drafts across all channels, verify compliance scores, and review blocking governance flags.'
              : 'Draft and refine destination-aware copy with real-time deterministic and AI rule checks.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 relative">
          <button
            onClick={() => createNewDraft()}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-small font-semibold transition-all hover:opacity-90 disabled:opacity-50 glow-pill-cyan"
            style={{ background: 'var(--cyan)', color: 'var(--background)' }}
          >
            <Plus size={16} />
            <span>New Document</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowSamples(!showSamples)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-small font-medium transition-colors border border-border bg-card hover:bg-surface-2 text-foreground"
            >
              <Sparkles size={15} className="text-cyan-400" />
              <span>Sample Drafts</span>
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>

            {showSamples && (
              <div
                className="absolute right-0 top-full mt-2 w-80 rounded-2xl glass-panel shadow-2xl z-50 p-2 animate-in fade-in"
                style={{ border: '1px solid var(--border)' }}
              >
                <div className="px-3 py-2 border-b border-border/50">
                  <p className="text-caption font-bold text-foreground">Pre-Loaded Test Scenarios</p>
                  <p className="text-[11px] text-muted-foreground">Pick a draft to test distinct enforcement modes</p>
                </div>
                <div className="py-1 space-y-0.5">
                  {sampleDrafts.map((draft) => (
                    <button
                      key={draft.channelSlug}
                      onClick={() => createNewDraft(draft.title, draft.content, draft.channelSlug)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-white/5 transition-colors group flex items-start justify-between"
                    >
                      <div>
                        <p className="text-small font-semibold text-foreground group-hover:text-cyan-400 transition-colors">
                          {draft.title}
                        </p>
                        <span className="text-[11px] font-mono capitalize text-muted-foreground">
                          Channel: {draft.channelSlug.replace('-', ' ')}
                        </span>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all mt-1" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Structured Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl glass-panel flex items-center justify-between">
          <div>
            <p className="text-caption text-muted-foreground font-medium uppercase tracking-wider">Total Documents</p>
            <p className="text-h2 font-bold text-foreground mt-0.5">{metrics.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <FileText size={20} />
          </div>
        </div>

        <div className="p-4 rounded-xl glass-panel flex items-center justify-between">
          <div>
            <p className="text-caption text-muted-foreground font-medium uppercase tracking-wider">Published / Live</p>
            <p className="text-h2 font-bold text-green-400 mt-0.5">{metrics.published}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Send size={18} />
          </div>
        </div>

        <div className="p-4 rounded-xl glass-panel flex items-center justify-between">
          <div>
            <p className="text-caption text-muted-foreground font-medium uppercase tracking-wider">Blocking Hard Flags</p>
            <p className="text-h2 font-bold mt-0.5" style={{ color: metrics.blockingCount > 0 ? 'var(--red)' : 'var(--green)' }}>
              {metrics.blockingCount}
            </p>
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: metrics.blockingCount > 0 ? 'rgba(255, 93, 108, 0.12)' : 'rgba(61, 220, 151, 0.12)',
              border: metrics.blockingCount > 0 ? '1px solid rgba(255, 93, 108, 0.3)' : '1px solid rgba(61, 220, 151, 0.3)',
              color: metrics.blockingCount > 0 ? 'var(--red)' : 'var(--green)',
            }}
          >
            <ShieldAlert size={20} />
          </div>
        </div>
      </div>

      {/* Search & Mode Filter Tabs */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search documents by title, author, or channel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-small outline-none border border-border bg-card text-foreground transition-all focus:border-cyan-400"
          />
        </div>

        {/* Manager-only Author Scope Toggle */}
        {isManager && (
          <div className="flex items-center gap-1 p-1 rounded-xl glass-panel">
            <button
              type="button"
              onClick={() => setManagerScope('all')}
              className={`px-3 py-1.5 rounded-lg text-caption font-semibold transition-all ${
                managerScope === 'all'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
              }`}
            >
              All writers
            </button>
            <button
              type="button"
              onClick={() => setManagerScope('mine')}
              className={`px-3 py-1.5 rounded-lg text-caption font-semibold transition-all ${
                managerScope === 'mine'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
              }`}
            >
              My documents
            </button>
          </div>
        )}

        {/* Mode filter pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl glass-panel overflow-x-auto">
          {[
            { id: 'all', label: 'All Drafts' },
            { id: 'strict', label: '🔴 Strict' },
            { id: 'balanced', label: '🟡 Balanced' },
            { id: 'flexible', label: '🔵 Flexible' },
            { id: 'published', label: '🟢 Published' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as typeof selectedFilter)}
              className={`px-3 py-1.5 rounded-lg text-caption font-semibold transition-all whitespace-nowrap ${
                selectedFilter === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Document Grid / Cards */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-16 rounded-2xl glass-panel p-8">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4 text-cyan-400">
            <FileText size={32} />
          </div>
          <h3 className="text-h3 font-semibold text-foreground mb-1">No documents found</h3>
          <p className="text-small text-muted-foreground mb-6 max-w-sm mx-auto">
            {searchQuery
              ? `No documents match "${searchQuery}". Try clearing the search filter.`
              : 'Get started by creating your first document or loading a pre-configured sample.'}
          </p>
          <button
            onClick={() => (searchQuery ? setSearchQuery('') : createNewDraft())}
            className="px-5 py-2.5 rounded-xl text-small font-semibold transition-all glow-pill-cyan"
            style={{ background: 'var(--cyan)', color: 'var(--background)' }}
          >
            {searchQuery ? 'Clear Search Filter' : 'Create New Document'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map((doc) => {
            const counts = flagCounts[doc.id] ?? { blocking: 0, total: 0 };
            const mode = doc.channels?.mode || 'balanced';

            const modeStyles: Record<string, { badge: string; border: string }> = {
              strict: { badge: 'bg-red-500/15 text-red-400 border-red-500/30', border: 'hover:border-red-500/40' },
              balanced: { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', border: 'hover:border-amber-500/40' },
              flexible: { badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', border: 'hover:border-cyan-500/40' },
            };
            const currentStyle = modeStyles[mode] || modeStyles.balanced;

            return (
              <div
                key={doc.id}
                onClick={() => router.push(`/app/workspace/${doc.id}`)}
                className={`p-5 rounded-2xl glass-panel glass-panel-hover cursor-pointer group flex flex-col justify-between transition-all duration-200 border border-border ${currentStyle.border}`}
              >
                <div>
                  {/* Top Bar inside card */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      {doc.channels && (
                        <span className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${currentStyle.badge} uppercase tracking-wider`}>
                          {doc.channels.name} ({mode})
                        </span>
                      )}
                      {doc.status === 'published' && (
                        <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Published
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                      <Clock size={12} />
                      {timeAgo(doc.updated_at)}
                    </span>
                  </div>

                  {/* Title & Preview */}
                  <h3 className="text-body font-bold text-foreground group-hover:text-cyan-400 transition-colors line-clamp-1 mb-1.5">
                    {doc.title || 'Untitled Draft'}
                  </h3>

                  <p className="text-small text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                    {doc.content
                      ? doc.content.replace(/<[^>]+>/g, '').slice(0, 140)
                      : 'Empty document. Click to begin drafting copy...'}
                  </p>
                </div>

                {/* Bottom Card Footer */}
                <div className="pt-3 border-t border-border/50 flex items-center justify-between text-caption">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-surface-2 flex items-center justify-center text-[10px] font-bold text-foreground border border-border">
                      {doc.profiles?.full_name ? doc.profiles.full_name[0] : 'U'}
                    </span>
                    <span>{doc.profiles?.full_name || 'Author'}</span>
                  </span>

                  {/* Status Indicator Pill */}
                  <div className="flex items-center gap-2">
                    {counts.blocking > 0 ? (
                      <span className="flex items-center gap-1 font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md">
                        <AlertTriangle size={13} />
                        <span>{counts.blocking} blocking</span>
                      </span>
                    ) : counts.total > 0 ? (
                      <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                        <Sliders size={13} />
                        <span>{counts.total} advice</span>
                      </span>
                    ) : doc.last_check_at ? (
                      <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                        <CheckCircle2 size={13} />
                        <span>Compliant</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Unchecked</span>
                    )}

                    <ArrowRight size={14} className="text-muted-foreground group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
