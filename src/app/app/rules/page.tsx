'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Shield, Plus, Pencil, Trash2 } from 'lucide-react';

export default function RulesPage() {
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRules(); }, []);

  async function loadRules() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from('rules').select('*').order('key');
    setRules(data ?? []);
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-h1 font-bold" style={{ fontFamily: 'var(--font-heading), system-ui' }}>Rules</h1>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--card)' }} />)}</div>
      ) : (
        <div className="space-y-2">
          {rules.map(r => {
            const rule = r as { id: string; key: string; name: string; description: string; type: string; base_severity: string; dos: string[]; donts: string[]; exceptions: string[] };
            return (
              <div key={rule.id} className="p-4 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-body font-medium">{rule.name}</span>
                  <span className="px-2 py-0.5 rounded text-caption" style={{
                    background: rule.base_severity === 'hard' ? 'rgba(255, 93, 108, 0.15)' : rule.base_severity === 'off' ? 'var(--muted)' : 'rgba(255, 179, 71, 0.15)',
                    color: rule.base_severity === 'hard' ? 'var(--red)' : rule.base_severity === 'off' ? 'var(--muted-foreground)' : 'var(--amber)',
                  }}>{rule.base_severity}</span>
                  <span className="px-2 py-0.5 rounded text-caption" style={{ background: 'var(--accent)', color: 'var(--muted-foreground)' }}>{rule.type.replace('_', ' ')}</span>
                </div>
                <p className="text-small mb-2" style={{ color: 'var(--muted-foreground)' }}>{rule.description}</p>
                <div className="flex gap-4 text-caption">
                  {rule.dos?.slice(0, 2).map((d: string, i: number) => <span key={i} style={{ color: 'var(--green)' }}>✓ {d}</span>)}
                  {rule.donts?.slice(0, 2).map((d: string, i: number) => <span key={i} style={{ color: 'var(--red)' }}>✗ {d}</span>)}
                </div>
                {rule.exceptions?.length > 0 && (
                  <p className="text-caption mt-1" style={{ color: 'var(--muted-foreground)' }}>Exceptions: {rule.exceptions.join(', ')}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
