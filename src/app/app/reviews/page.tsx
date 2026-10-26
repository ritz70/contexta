'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Shield, MessageSquare, CheckCircle2, X, AlertTriangle } from 'lucide-react';

export default function ReviewsPage() {
  const [disputes, setDisputes] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [note, setNote] = useState('');
  const [exception, setException] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDisputes(); }, []);

  async function loadDisputes() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('disputes')
      .select('*, flags(*), profiles!disputes_raised_by_fkey(full_name)')
      .order('created_at', { ascending: false });
    setDisputes(data ?? []);
    setLoading(false);
  }

  async function decide(decision: 'uphold' | 'overturn') {
    if (!selected || !note) { toast.error('Please add a note'); return; }
    const res = await fetch(`/api/disputes/${(selected as { id: string }).id}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, note, addException: exception || undefined }),
    });
    if (!res.ok) { const d = await res.json(); toast.error(d.error?.message); return; }
    toast.success(`Dispute ${decision === 'uphold' ? 'upheld' : 'overturned'}`);
    setSelected(null); setNote(''); setException('');
    loadDisputes();
  }

  const pending = disputes.filter(d => (d as { status: string }).status === 'pending');
  const resolved = disputes.filter(d => (d as { status: string }).status !== 'pending');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-h1 font-bold mb-6" style={{ fontFamily: 'var(--font-heading), system-ui' }}>Reviews</h1>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--card)' }} />)}</div>
      ) : pending.length === 0 && resolved.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <CheckCircle2 size={40} className="mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
          <h3 className="text-h3 font-semibold mb-2">No disputes</h3>
          <p className="text-body" style={{ color: 'var(--muted-foreground)' }}>When writers dispute flags, they&apos;ll appear here for your review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List */}
          <div className="space-y-2">
            {pending.length > 0 && <p className="text-caption font-semibold" style={{ color: 'var(--amber)' }}>Pending ({pending.length})</p>}
            {pending.map(d => {
              const dispute = d as { id: string; category: string; reason: string; status: string; flags: { category: string; severity: string; quote: string }; profiles: { full_name: string } };
              return (
                <button key={dispute.id} onClick={() => setSelected(d)} className="w-full text-left p-4 rounded-xl transition-colors"
                  style={{ background: selected === d ? 'var(--accent)' : 'var(--card)', border: `1px solid ${selected === d ? 'var(--amber)' : 'var(--border)'}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={14} style={{ color: dispute.flags?.severity === 'hard' ? 'var(--red)' : 'var(--amber)' }} />
                    <span className="text-small font-medium">{dispute.flags?.category}</span>
                    <span className="ml-auto text-caption capitalize" style={{ color: 'var(--amber)' }}>{dispute.status}</span>
                  </div>
                  <p className="text-caption truncate" style={{ color: 'var(--muted-foreground)' }}>"{dispute.flags?.quote}"</p>
                  <p className="text-caption" style={{ color: 'var(--muted-foreground)' }}>by {dispute.profiles?.full_name} · {dispute.category.replace('_', ' ')}</p>
                </button>
              );
            })}
            {resolved.length > 0 && <p className="text-caption font-semibold mt-4" style={{ color: 'var(--muted-foreground)' }}>Resolved ({resolved.length})</p>}
            {resolved.map(d => {
              const dispute = d as { id: string; status: string; flags: { category: string }; profiles: { full_name: string } };
              return (
                <div key={dispute.id} className="p-3 rounded-xl opacity-60 text-caption" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  {dispute.flags?.category} — {dispute.status} — {dispute.profiles?.full_name}
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          {selected && (() => {
            const s = selected as { id: string; category: string; reason: string; status: string; flags: { category: string; severity: string; quote: string; explanation: string; rule_id: string }; profiles: { full_name: string } };
            return (
              <div className="p-6 rounded-xl sticky top-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-h3 font-semibold">Review dispute</h3>
                  <button onClick={() => setSelected(null)}><X size={18} style={{ color: 'var(--muted-foreground)' }} /></button>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="p-3 rounded-lg" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
                    <p className="text-caption font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Flagged text</p>
                    <p className="text-small font-mono">"{s.flags?.quote}"</p>
                    <p className="text-caption mt-1" style={{ color: 'var(--muted-foreground)' }}>{s.flags?.explanation}</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
                    <p className="text-caption font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Writer&apos;s reason ({s.category.replace('_', ' ')})</p>
                    <p className="text-small">{s.reason}</p>
                    <p className="text-caption mt-1" style={{ color: 'var(--muted-foreground)' }}>— {s.profiles?.full_name}</p>
                  </div>
                </div>
                {s.status === 'pending' && (
                  <>
                    <div className="mb-3">
                      <label className="text-small font-medium block mb-1">Your decision note</label>
                      <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                        className="w-full px-3 py-2 rounded-lg text-small outline-none resize-none"
                        style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                        placeholder="Explain your decision…" />
                    </div>
                    <div className="mb-4">
                      <label className="text-small font-medium block mb-1">Add exception phrase (optional)</label>
                      <input value={exception} onChange={e => setException(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-small outline-none"
                        style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                        placeholder="e.g. Nimbus Pay Ltd" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => decide('overturn')} className="flex-1 py-2 rounded-lg text-small font-semibold" style={{ background: 'var(--green)', color: 'var(--background)' }}>Overturn</button>
                      <button onClick={() => decide('uphold')} className="flex-1 py-2 rounded-lg text-small font-semibold" style={{ background: 'var(--red)', color: 'white' }}>Uphold</button>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
