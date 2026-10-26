'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { toast } from 'sonner';
import {
  Shield, AlertTriangle, CheckCircle2, ChevronDown, Play, Send,
  Loader2, ArrowRight, MessageSquare, X, Eye, Sparkles, FileText,
} from 'lucide-react';

interface EditorProps {
  document: { id: string; org_id: string; title: string; content: string; channel_id: string | null; status: string };
  channels: Array<{ id: string; slug: string; name: string; mode: string; formality: number; description: string }>;
  initialFlags: Array<FlagData>;
  rules: Array<{ id: string; key: string; name: string; description: string; type: string; base_severity: string; dos: string[]; donts: string[] }>;
  userId: string;
  userRole: string;
}

interface FlagData {
  id: string; rule_id: string | null; source: string; category: string; severity: string;
  scope: string; quote: string; start_offset: number | null; end_offset: number | null;
  confidence: number | null; explanation: string; suggestions: Array<{ label: string; replacement?: string; insertText?: string }>;
  status: string; status_reason: string | null; fingerprint: string;
}

export function EditorClient({ document: doc, channels, initialFlags, rules, userId, userRole }: EditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(doc.title);
  const [channelId, setChannelId] = useState(doc.channel_id ?? '');
  const [flags, setFlags] = useState<FlagData[]>(initialFlags);
  const [activeFlag, setActiveFlag] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkStage, setCheckStage] = useState('');
  const [aiChecking, setAiChecking] = useState(false);
  const [saved, setSaved] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [disputeFlag, setDisputeFlag] = useState<string | null>(null);
  const [disputeCategory, setDisputeCategory] = useState('false_positive');
  const [disputeReason, setDisputeReason] = useState('');
  const [showPanel, setShowPanel] = useState(true);
  const [panelTab, setPanelTab] = useState<'flags' | 'rules'>('flags');
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isPublished = doc.status === 'published';
  const selectedChannel = channels.find(c => c.id === channelId);

  const blockingFlags = flags.filter(f => f.severity === 'hard' && ['open', 'disputed', 'upheld'].includes(f.status));
  const advisoryFlags = flags.filter(f => f.severity !== 'hard' && f.status === 'open');
  const aiFlags = flags.filter(f => f.source === 'llm' && f.status === 'open');
  const resolvedFlags = flags.filter(f => ['accepted', 'dismissed', 'overturned'].includes(f.status));

  // TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, horizontalRule: false, bulletList: false, orderedList: false, listItem: false }),
      Placeholder.configure({ placeholder: 'Start writing or load a sample draft…' }),
    ],
    content: doc.content ? doc.content.split('\n').filter(Boolean).map(p => `<p>${escapeHtml(p)}</p>`).join('') : '',
    editable: !isPublished,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      setSaved(false);
      debouncedSave(ed.getText());
      debouncedCheck();
    },
  });

  function escapeHtml(text: string) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getCanonicalText(): string {
    if (!editor) return '';
    const doc = editor.state.doc;
    const blocks: string[] = [];
    doc.forEach(node => { blocks.push(node.textContent); });
    return blocks.join('\n');
  }

  // Autosave
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSave = useCallback((text: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const content = getCanonicalText();
      await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, channel_id: channelId || null }),
      });
      setSaved(true);
    }, 1500);
  }, [doc.id, title, channelId]);

  // Save title/channel changes
  useEffect(() => {
    if (isPublished) return;
    const t = setTimeout(async () => {
      await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, channel_id: channelId || null }),
      });
      setSaved(true);
    }, 800);
    return () => clearTimeout(t);
  }, [title, channelId]);

  // Debounced auto-check
  const debouncedCheck = useCallback(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(() => runCheck(), 1200);
  }, [channelId]);

  async function runCheck() {
    if (!channelId || isPublished) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setChecking(true);
    setCheckStage('Running rule checks…');

    // Save content first
    const content = getCanonicalText();
    await fetch(`/api/documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title, channel_id: channelId }),
    });

    try {
      const res = await fetch(`/api/documents/${doc.id}/check/deterministic`, {
        method: 'POST', signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (data.flags) setFlags(data.flags);
      setCheckStage('Asking AI about tone and meaning…');

      // Phase 2: AI check
      setAiChecking(true);
      try {
        const aiRes = await fetch(`/api/documents/${doc.id}/check/ai`, {
          method: 'POST', signal: abortRef.current.signal,
        });
        const aiData = await aiRes.json();
        if (aiData.flags) setFlags(aiData.flags);
        if (aiData.llm_status === 'failed') {
          toast.info('AI tone check unavailable — rule checks still ran');
        }
      } catch {
        // AI failure is non-fatal
      }
      setAiChecking(false);
      setCheckStage('Done');
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast.error('Check failed');
    } finally {
      setChecking(false);
      setTimeout(() => setCheckStage(''), 2000);
    }
  }

  async function handleFlagAction(flagId: string, action: string, extra?: Record<string, unknown>) {
    const res = await fetch(`/api/flags/${flagId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error?.message); return; }
    // Refresh flags
    const fr = await fetch(`/api/documents/${doc.id}/check/deterministic`, { method: 'POST' });
    const fd = await fr.json();
    if (fd.flags) setFlags(fd.flags);
    toast.success(action === 'accept' ? 'Fix applied' : action === 'dismiss' ? 'Flag dismissed' : 'Dispute submitted');
  }

  function applyFixIt(flag: FlagData, suggestion: { replacement?: string; insertText?: string }) {
    if (!editor) return;
    if (suggestion.insertText) {
      // Document-level: append as new paragraph
      editor.chain().focus().command(({ tr, state }) => {
        tr.insert(state.doc.content.size, state.schema.nodes.paragraph.create(null, state.schema.text(suggestion.insertText!)));
        return true;
      }).run();
    } else if (suggestion.replacement !== undefined && flag.start_offset !== null && flag.end_offset !== null) {
      // Span-level: find and replace the text
      const text = getCanonicalText();
      const quote = text.slice(flag.start_offset, flag.end_offset);
      // Simple replacement in editor
      const content = getCanonicalText();
      const newContent = content.slice(0, flag.start_offset) + suggestion.replacement + content.slice(flag.end_offset);
      editor.commands.setContent(newContent.split('\n').filter(Boolean).map(p => `<p>${escapeHtml(p)}</p>`).join(''));
    }
    handleFlagAction(flag.id, 'accept');
  }

  async function handlePublish() {
    setPublishing(true);
    const res = await fetch(`/api/documents/${doc.id}/publish`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error?.message);
      setPublishing(false);
      return;
    }
    toast.success('Document published!');
    router.refresh();
  }

  async function submitDispute() {
    if (!disputeFlag || disputeReason.length < 10) return;
    await handleFlagAction(disputeFlag, 'dispute', { disputeCategory, reason: disputeReason });
    setDisputeFlag(null);
    setDisputeReason('');
  }

  const charCount = getCanonicalText().length;
  const wordCount = getCanonicalText().split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex h-full">
      {/* Main editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="px-6 py-3 border-b flex items-center gap-4 flex-wrap" style={{ borderColor: 'var(--border)' }}>
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); setSaved(false); }}
            disabled={isPublished}
            className="text-h3 font-semibold bg-transparent outline-none flex-1 min-w-48"
            style={{ fontFamily: 'var(--font-heading), system-ui', color: 'var(--foreground)' }}
            placeholder="Document title"
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            {isPublished ? (
              <span className="px-3 py-1 rounded-lg text-small font-medium" style={{ background: 'rgba(61, 220, 151, 0.15)', color: 'var(--green)' }}>Published</span>
            ) : (
              <span className="text-caption" style={{ color: saved ? 'var(--green)' : 'var(--muted-foreground)' }}>{saved ? '✓ Saved' : 'Saving…'}</span>
            )}
          </div>
        </div>

        {/* Channel selector */}
        <div className="px-6 py-2 border-b flex items-center gap-3 flex-wrap" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <select
            value={channelId}
            onChange={e => { setChannelId(e.target.value); setSaved(false); }}
            disabled={isPublished}
            className="px-3 py-1.5 rounded-lg text-small outline-none"
            style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          >
            <option value="">Select channel…</option>
            {['strict', 'balanced', 'flexible'].map(mode => (
              <optgroup key={mode} label={mode.charAt(0).toUpperCase() + mode.slice(1)}>
                {channels.filter(c => c.mode === mode).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {selectedChannel && (
            <span className={`px-2 py-0.5 rounded text-caption mode-${selectedChannel.mode}`}>
              {selectedChannel.mode}
            </span>
          )}
          {selectedChannel && (
            <span className="text-caption" style={{ color: 'var(--muted-foreground)' }}>{selectedChannel.description}</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-caption tabular-nums" style={{ color: 'var(--muted-foreground)' }}>{charCount} chars · {wordCount} words</span>
            {!isPublished && (
              <button
                onClick={() => runCheck()}
                disabled={checking || !channelId}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-small font-medium disabled:opacity-50"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              >
                {checking ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Run check
              </button>
            )}
          </div>
        </div>

        {/* Check progress */}
        {checkStage && (
          <div className="px-6 py-1.5 text-caption" style={{ color: 'var(--cyan)' }} aria-live="polite">
            {checkStage}
          </div>
        )}

        {/* Editor area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 tiptap-editor">
          <EditorContent editor={editor} />
        </div>

        {/* Publish bar */}
        {!isPublished && (
          <div className="px-6 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <div className="flex items-center gap-2">
              {blockingFlags.length > 0 ? (
                <span className="flex items-center gap-1.5 text-small" style={{ color: 'var(--red)' }}>
                  <AlertTriangle size={14} />
                  {blockingFlags.length} blocking issue{blockingFlags.length > 1 ? 's' : ''}
                </span>
              ) : flags.length > 0 ? (
                <span className="flex items-center gap-1.5 text-small" style={{ color: 'var(--green)' }}>
                  <CheckCircle2 size={14} />
                  Ready to publish
                </span>
              ) : null}
            </div>
            <button
              onClick={handlePublish}
              disabled={blockingFlags.length > 0 || publishing || !channelId}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-small font-semibold disabled:opacity-50"
              style={{ background: blockingFlags.length > 0 ? 'var(--muted)' : 'var(--cyan)', color: 'var(--background)' }}
              title={blockingFlags.length > 0 ? `Blocked by: ${blockingFlags.map(f => f.category).join(', ')}` : 'Publish this document'}
            >
              {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Publish
            </button>
          </div>
        )}
      </div>

      {/* Side panel */}
      {showPanel && (
        <div className="w-80 border-l flex flex-col flex-shrink-0 overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <div className="flex items-center border-b" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => setPanelTab('flags')} className="flex-1 py-2.5 text-small font-medium text-center transition-colors" style={{ color: panelTab === 'flags' ? 'var(--foreground)' : 'var(--muted-foreground)', borderBottom: panelTab === 'flags' ? '2px solid var(--cyan)' : '2px solid transparent' }}>
              Flags {flags.filter(f => f.status === 'open').length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-caption" style={{ background: 'var(--red)', color: 'white' }}>{flags.filter(f => f.status === 'open').length}</span>}
            </button>
            <button onClick={() => setPanelTab('rules')} className="flex-1 py-2.5 text-small font-medium text-center transition-colors" style={{ color: panelTab === 'rules' ? 'var(--foreground)' : 'var(--muted-foreground)', borderBottom: panelTab === 'rules' ? '2px solid var(--cyan)' : '2px solid transparent' }}>
              Rules in play
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {panelTab === 'flags' ? (
              <>
                {/* Document-level flags */}
                {flags.filter(f => f.scope === 'document' && f.status === 'open').map(f => (
                  <FlagCard key={f.id} flag={f} active={activeFlag === f.id} onActivate={() => setActiveFlag(f.id)}
                    onApply={(s) => applyFixIt(f, s)} onDismiss={() => handleFlagAction(f.id, 'dismiss')}
                    onDispute={() => setDisputeFlag(f.id)} isPublished={isPublished} />
                ))}
                {/* Blocking */}
                {blockingFlags.filter(f => f.scope === 'span').length > 0 && (
                  <p className="text-caption font-semibold pt-2" style={{ color: 'var(--red)' }}>Blocking ({blockingFlags.filter(f => f.scope === 'span').length})</p>
                )}
                {blockingFlags.filter(f => f.scope === 'span').map(f => (
                  <FlagCard key={f.id} flag={f} active={activeFlag === f.id} onActivate={() => setActiveFlag(f.id)}
                    onApply={(s) => applyFixIt(f, s)} onDismiss={() => {}} onDispute={() => setDisputeFlag(f.id)} isPublished={isPublished} />
                ))}
                {/* Advisory */}
                {advisoryFlags.filter(f => f.source === 'deterministic').length > 0 && (
                  <p className="text-caption font-semibold pt-2" style={{ color: 'var(--amber)' }}>Advisory ({advisoryFlags.filter(f => f.source === 'deterministic').length})</p>
                )}
                {advisoryFlags.filter(f => f.source === 'deterministic').map(f => (
                  <FlagCard key={f.id} flag={f} active={activeFlag === f.id} onActivate={() => setActiveFlag(f.id)}
                    onApply={(s) => applyFixIt(f, s)} onDismiss={() => handleFlagAction(f.id, 'dismiss')}
                    onDispute={() => setDisputeFlag(f.id)} isPublished={isPublished} />
                ))}
                {/* AI */}
                {aiFlags.length > 0 && (
                  <p className="text-caption font-semibold pt-2" style={{ color: 'var(--violet)' }}>AI suggestions ({aiFlags.length})</p>
                )}
                {aiFlags.map(f => (
                  <FlagCard key={f.id} flag={f} active={activeFlag === f.id} onActivate={() => setActiveFlag(f.id)}
                    onApply={(s) => applyFixIt(f, s)} onDismiss={() => handleFlagAction(f.id, 'dismiss')}
                    onDispute={() => setDisputeFlag(f.id)} isPublished={isPublished} />
                ))}
                {/* Resolved */}
                {resolvedFlags.length > 0 && (
                  <p className="text-caption font-semibold pt-2" style={{ color: 'var(--muted-foreground)' }}>Resolved ({resolvedFlags.length})</p>
                )}
                {resolvedFlags.map(f => (
                  <div key={f.id} className="p-2 rounded-lg opacity-50 text-caption" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
                    <span className="capitalize">{f.status}</span>: {f.category}
                  </div>
                ))}
                {flags.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle2 size={32} className="mx-auto mb-2" style={{ color: 'var(--muted-foreground)' }} />
                    <p className="text-small" style={{ color: 'var(--muted-foreground)' }}>
                      {channelId ? 'No issues found. Run a check to start.' : 'Select a channel to enable checking.'}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                {rules.map(r => (
                  <div key={r.id} className="p-3 rounded-lg text-small" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{r.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-caption" style={{
                        background: r.base_severity === 'hard' ? 'rgba(255, 93, 108, 0.15)' : r.base_severity === 'soft' ? 'rgba(255, 179, 71, 0.15)' : 'var(--muted)',
                        color: r.base_severity === 'hard' ? 'var(--red)' : r.base_severity === 'soft' ? 'var(--amber)' : 'var(--muted-foreground)',
                      }}>{r.base_severity}</span>
                    </div>
                    <p className="text-caption" style={{ color: 'var(--muted-foreground)' }}>{r.description}</p>
                    {r.dos.length > 0 && (
                      <div className="mt-1.5">
                        {r.dos.map((d, i) => <p key={i} className="text-caption" style={{ color: 'var(--green)' }}>✓ {d}</p>)}
                        {r.donts.map((d, i) => <p key={i} className="text-caption" style={{ color: 'var(--red)' }}>✗ {d}</p>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dispute dialog */}
      {disputeFlag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="text-h3 font-semibold mb-4">Dispute this flag</h3>
            <div className="mb-3">
              <label className="text-small font-medium block mb-1.5">Category</label>
              <select value={disputeCategory} onChange={e => setDisputeCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-small outline-none" style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                <option value="false_positive">False positive</option>
                <option value="context_exception">Context exception</option>
                <option value="rule_unclear">Rule unclear</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="text-small font-medium block mb-1.5">Reason (min 10 characters)</label>
              <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded-lg text-small outline-none resize-none"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                placeholder="Explain why you disagree with this flag…" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDisputeFlag(null)} className="px-4 py-2 rounded-lg text-small" style={{ color: 'var(--muted-foreground)' }}>Cancel</button>
              <button onClick={submitDispute} disabled={disputeReason.length < 10}
                className="px-4 py-2 rounded-lg text-small font-semibold disabled:opacity-50"
                style={{ background: 'var(--amber)', color: 'var(--background)' }}>Submit dispute</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Flag card component
function FlagCard({ flag, active, onActivate, onApply, onDismiss, onDispute, isPublished }: {
  flag: FlagData; active: boolean; onActivate: () => void;
  onApply: (s: { replacement?: string; insertText?: string }) => void;
  onDismiss: () => void; onDispute: () => void; isPublished: boolean;
}) {
  const borderColor = flag.severity === 'hard' ? 'var(--red)' : flag.source === 'llm' ? 'var(--violet)' : 'var(--amber)';

  return (
    <div
      onClick={onActivate}
      className="p-3 rounded-lg cursor-pointer transition-colors"
      style={{
        background: active ? 'var(--accent)' : 'var(--background)',
        border: `1px solid ${active ? borderColor : 'var(--border)'}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {flag.severity === 'hard' && <Shield size={12} style={{ color: 'var(--red)' }} />}
        {flag.source === 'llm' && <Sparkles size={12} style={{ color: 'var(--violet)' }} />}
        <span className="text-caption font-medium truncate">{flag.category}</span>
        <span className="text-caption px-1 py-0.5 rounded ml-auto" style={{
          background: flag.severity === 'hard' ? 'rgba(255, 93, 108, 0.15)' : flag.source === 'llm' ? 'rgba(167, 139, 250, 0.15)' : 'rgba(255, 179, 71, 0.15)',
          color: borderColor,
        }}>{flag.severity === 'hard' ? 'hard' : flag.source === 'llm' ? 'AI' : 'soft'}</span>
      </div>
      {flag.quote && <p className="text-caption font-mono mb-1.5 truncate" style={{ color: 'var(--muted-foreground)' }}>"{flag.quote}"</p>}
      <p className="text-caption mb-2" style={{ color: 'var(--muted-foreground)' }}>{flag.explanation}</p>

      {!isPublished && flag.status === 'open' && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {flag.suggestions.map((s, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); onApply(s); }}
              className="px-2 py-1 rounded text-caption font-medium hover:opacity-80"
              style={{ background: 'rgba(34, 211, 238, 0.12)', color: 'var(--cyan)' }}
              title={s.label}>{s.label.length > 25 ? s.label.slice(0, 25) + '…' : s.label}</button>
          ))}
          {flag.severity !== 'hard' && (
            <button onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              className="px-2 py-1 rounded text-caption hover:opacity-80"
              style={{ color: 'var(--muted-foreground)' }}>Dismiss</button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDispute(); }}
            className="px-2 py-1 rounded text-caption hover:opacity-80"
            style={{ color: 'var(--amber)' }}>Dispute</button>
        </div>
      )}
      {flag.status === 'disputed' && (
        <span className="text-caption" style={{ color: 'var(--amber)' }}>Disputed — awaiting manager</span>
      )}
    </div>
  );
}
