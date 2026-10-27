'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Shield,
  MessageSquare,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  RotateCcw,
} from 'lucide-react';

interface DisputeItem {
  id: string;
  category: string;
  reason: string;
  status: 'pending' | 'upheld' | 'overturned';
  decision_note?: string;
  created_at: string;
  flags: {
    id: string;
    category: string;
    severity: string;
    quote: string;
    explanation: string;
    rule_id: string;
  };
  profiles: {
    full_name: string;
    email?: string;
  };
}

export default function ReviewsPage() {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [selected, setSelected] = useState<DisputeItem | null>(null);
  const [note, setNote] = useState('');
  const [exception, setException] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overturned' | 'upheld'>('all');
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    loadDisputes();
  }, []);

  async function loadDisputes() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('disputes')
      .select('*, flags(*), profiles!disputes_raised_by_fkey(full_name, email)')
      .order('created_at', { ascending: false });

    const formatted = (data ?? []) as DisputeItem[];
    setDisputes(formatted);
    if (formatted.length > 0 && !selected) {
      const firstPending = formatted.find((d) => d.status === 'pending') || formatted[0];
      setSelected(firstPending);
    }
    setLoading(false);
  }

  async function decide(decision: 'uphold' | 'overturn') {
    if (!selected || !note.trim()) {
      toast.error('Please provide a decision note explaining your rationale');
      return;
    }
    setDeciding(true);
    try {
      const res = await fetch(`/api/disputes/${selected.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          note: note.trim(),
          addException: exception.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error?.message || 'Decision failed');
        return;
      }

      toast.success(
        decision === 'overturn'
          ? 'Dispute overturned — rule exception created'
          : 'Dispute upheld — flag confirmed as violation'
      );
      setNote('');
      setException('');
      await loadDisputes();
    } catch {
      toast.error('An error occurred while saving your decision');
    } finally {
      setDeciding(false);
    }
  }

  const pending = disputes.filter((d) => d.status === 'pending');
  const overturned = disputes.filter((d) => d.status === 'overturned');
  const upheld = disputes.filter((d) => d.status === 'upheld');

  const filteredList = disputes.filter((d) => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-h1 font-bold text-foreground" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
              Governance Dispute Reviews
            </h1>
            <span className="text-caption font-mono uppercase px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 font-semibold">
              Manager Adjudication
            </span>
          </div>
          <p className="text-small text-muted-foreground">
            Review writer disputes, adjudicate false positives, and dynamically create calibrated exception phrases.
          </p>
        </div>

        <button
          onClick={() => loadDisputes()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-small font-medium border border-border bg-card hover:bg-surface-2 text-foreground transition-colors"
        >
          <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl glass-panel flex items-center justify-between">
          <div>
            <p className="text-caption text-muted-foreground font-medium uppercase tracking-wider">Awaiting Decision</p>
            <p className="text-h2 font-bold text-amber-400 mt-0.5">{pending.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock size={20} />
          </div>
        </div>

        <div className="p-4 rounded-xl glass-panel flex items-center justify-between">
          <div>
            <p className="text-caption text-muted-foreground font-medium uppercase tracking-wider">Overturned (Exceptions)</p>
            <p className="text-h2 font-bold text-emerald-400 mt-0.5">{overturned.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="p-4 rounded-xl glass-panel flex items-center justify-between">
          <div>
            <p className="text-caption text-muted-foreground font-medium uppercase tracking-wider">Upheld (Violations)</p>
            <p className="text-h2 font-bold text-red-400 mt-0.5">{upheld.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* Queue & Detail Grid */}
      {loading ? (
        <div className="p-16 text-center text-small text-muted-foreground glass-panel rounded-2xl">
          <Clock size={24} className="animate-spin mx-auto mb-3 text-cyan-400" />
          Loading dispute queue...
        </div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-16 rounded-2xl glass-panel p-8">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-400" />
          <h3 className="text-h3 font-semibold text-foreground mb-1">Queue is Clear</h3>
          <p className="text-small text-muted-foreground max-w-sm mx-auto">
            No active disputes logged by writers. When writers flag false positives in the editor, they appear here for your review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Dispute List (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl glass-panel overflow-x-auto mb-2">
              {[
                { id: 'all', label: `All (${disputes.length})` },
                { id: 'pending', label: `Pending (${pending.length})` },
                { id: 'overturned', label: `Overturned (${overturned.length})` },
                { id: 'upheld', label: `Upheld (${upheld.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id as typeof filter)}
                  className={`px-3 py-1 rounded-lg text-caption font-semibold transition-all whitespace-nowrap ${
                    filter === tab.id
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filteredList.map((dispute) => {
                const isSelected = selected?.id === dispute.id;
                const statusStyles = {
                  pending: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                  overturned: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                  upheld: 'text-red-400 bg-red-500/10 border-red-500/20',
                }[dispute.status];

                return (
                  <button
                    key={dispute.id}
                    onClick={() => {
                      setSelected(dispute);
                      setNote(dispute.decision_note || '');
                      setException('');
                    }}
                    className={`w-full text-left p-4 rounded-2xl glass-panel transition-all flex flex-col justify-between border ${
                      isSelected
                        ? 'border-purple-400/60 bg-purple-500/10 shadow-lg'
                        : 'border-border hover:border-border/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-small font-bold text-foreground line-clamp-1">
                          {dispute.flags?.category || 'Rule Violation'}
                        </span>
                        <span className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full border ${statusStyles}`}>
                          {dispute.status}
                        </span>
                      </div>

                      <p className="text-caption font-mono text-cyan-300 line-clamp-1 mb-2 bg-black/30 px-2 py-1 rounded-lg border border-border/40">
                        &ldquo;{dispute.flags?.quote || 'Flagged snippet'}&rdquo;
                      </p>

                      <p className="text-small text-muted-foreground line-clamp-2 mb-2">
                        {dispute.reason}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-caption text-muted-foreground pt-2 border-t border-border/40">
                      <span>By {dispute.profiles?.full_name || 'Writer'}</span>
                      <span className="capitalize font-mono text-[11px]">
                        {dispute.category.replace('_', ' ')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Adjudication Detail Panel (7 cols) */}
          <div className="lg:col-span-7">
            {selected ? (
              <div className="p-6 md:p-8 rounded-2xl glass-panel space-y-6 border border-border sticky top-6">
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <Shield size={18} className="text-purple-400" />
                    <h3 className="text-body font-bold text-foreground">Dispute Adjudication</h3>
                  </div>
                  <span className="text-caption font-mono text-muted-foreground">
                    ID: {selected.id.slice(0, 8)}...
                  </span>
                </div>

                {/* Offending Text Box */}
                <div className="p-4 rounded-xl bg-background border border-border space-y-1.5">
                  <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
                    Flagged Quote Context
                  </p>
                  <p className="text-body font-mono text-cyan-400 bg-cyan-500/5 p-2.5 rounded-lg border border-cyan-500/20">
                    &ldquo;{selected.flags?.quote}&rdquo;
                  </p>
                  <p className="text-caption text-muted-foreground pt-1">
                    Violation Type: <strong className="text-foreground">{selected.flags?.category}</strong> · Severity: <span className="uppercase text-amber-400 font-mono">{selected.flags?.severity}</span>
                  </p>
                  <p className="text-caption text-muted-foreground">{selected.flags?.explanation}</p>
                </div>

                {/* Writer Rationale */}
                <div className="p-4 rounded-xl bg-background border border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
                      Writer&apos;s Objection Rationale
                    </p>
                    <span className="text-caption font-mono text-purple-400 capitalize">
                      {selected.category.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-body text-foreground leading-relaxed">&ldquo;{selected.reason}&rdquo;</p>
                  <p className="text-caption text-muted-foreground pt-1">
                    Submitted by <strong>{selected.profiles?.full_name}</strong>
                  </p>
                </div>

                {/* Decision Form if pending */}
                {selected.status === 'pending' ? (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-small font-medium text-foreground mb-1">
                        Manager Decision Note (Recorded in Audit Trail)
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        className="w-full px-3.5 py-2.5 rounded-xl text-small outline-none resize-none border border-border bg-background text-foreground transition-all focus:border-purple-400 leading-relaxed"
                        placeholder="Provide clear rationale (e.g. 'Approved as technical industry quote; rule exception created.')"
                      />
                    </div>

                    <div>
                      <label className="block text-small font-medium text-foreground mb-1">
                        Add Rule Exception Phrase (Optional)
                      </label>
                      <input
                        type="text"
                        value={exception}
                        onChange={(e) => setException(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl text-small outline-none border border-border bg-background text-foreground font-mono"
                        placeholder="e.g. NimbusPay Enterprise Cloud"
                      />
                      <p className="text-caption text-muted-foreground mt-1">
                        Adding an exception updates the rule in real time so future occurrences won&apos;t be flagged.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => decide('overturn')}
                        disabled={deciding || !note.trim()}
                        className="py-3 px-4 rounded-xl text-small font-bold transition-all flex items-center justify-center gap-2 text-background disabled:opacity-50"
                        style={{
                          background: 'linear-gradient(135deg, var(--green), #10b981)',
                          boxShadow: '0 8px 20px -5px rgba(61, 220, 151, 0.35)',
                        }}
                      >
                        <Check size={16} />
                        <span>{deciding ? 'Processing...' : 'Overturn & Allow (Create Exception)'}</span>
                      </button>

                      <button
                        onClick={() => decide('uphold')}
                        disabled={deciding || !note.trim()}
                        className="py-3 px-4 rounded-xl text-small font-bold transition-all flex items-center justify-center gap-2 text-white disabled:opacity-50"
                        style={{
                          background: 'linear-gradient(135deg, var(--red), #e11d48)',
                          boxShadow: '0 8px 20px -5px rgba(255, 93, 108, 0.35)',
                        }}
                      >
                        <X size={16} />
                        <span>{deciding ? 'Processing...' : 'Uphold (Block Publish)'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-border/80 bg-background/50 space-y-2">
                    <div className="flex items-center gap-2">
                      {selected.status === 'overturned' ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      ) : (
                        <XCircle size={16} className="text-red-400" />
                      )}
                      <span className="text-small font-bold capitalize text-foreground">
                        Adjudicated: {selected.status}
                      </span>
                    </div>
                    {selected.decision_note && (
                      <p className="text-small text-muted-foreground italic">
                        &ldquo;{selected.decision_note}&rdquo;
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-small text-muted-foreground glass-panel rounded-2xl">
                Select a dispute from the queue to inspect and adjudicate.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
