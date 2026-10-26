'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { AlertTriangle, TrendingUp, FileText, Flag, Users, CheckCircle2 } from 'lucide-react';

export default function AnalyticsPage() {
  const [range, setRange] = useState(30);
  const [stats, setStats] = useState({ docs: 0, flags: 0, disputes: 0, overrides: 0, published: 0 });
  const [flagsByRule, setFlagsByRule] = useState<Array<{ name: string; count: number; disputes: number; overrides: number; friction: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAnalytics(); }, [range]);

  async function loadAnalytics() {
    setLoading(true);
    const supabase = createClient();
    const since = new Date(Date.now() - range * 86400000).toISOString();

    const [docsRes, flagsRes, disputesRes] = await Promise.all([
      supabase.from('documents').select('id, status', { count: 'exact' }).gte('created_at', since),
      supabase.from('flags').select('id, rule_id, category, severity, status').gte('created_at', since),
      supabase.from('disputes').select('id, status').gte('created_at', since),
    ]);

    const docs = docsRes.data ?? [];
    const flags = flagsRes.data ?? [];
    const disputes = disputesRes.data ?? [];

    const publishedCount = docs.filter(d => d.status === 'published').length;
    const overrideCount = flags.filter(f => f.status === 'dismissed').length;

    setStats({
      docs: docs.length,
      flags: flags.length,
      disputes: disputes.length,
      overrides: overrideCount,
      published: publishedCount,
    });

    // Flags by rule with friction
    const ruleMap = new Map<string, { count: number; disputed: number; dismissed: number; overturned: number }>();
    for (const f of flags) {
      const key = f.category || 'Unknown';
      const entry = ruleMap.get(key) || { count: 0, disputed: 0, dismissed: 0, overturned: 0 };
      entry.count++;
      if (f.status === 'disputed') entry.disputed++;
      if (f.status === 'dismissed') entry.dismissed++;
      if (f.status === 'overturned') entry.overturned++;
      ruleMap.set(key, entry);
    }

    const byRule = [...ruleMap.entries()].map(([name, e]) => ({
      name: name.replace(/-/g, ' ').replace(/^./, s => s.toUpperCase()),
      count: e.count,
      disputes: e.disputed,
      overrides: e.dismissed,
      friction: e.count > 0 ? (e.disputed + e.dismissed + e.overturned) / e.count : 0,
    })).sort((a, b) => b.count - a.count);

    setFlagsByRule(byRule);
    setLoading(false);
  }

  const highFriction = flagsByRule.filter(r => r.count >= 6 && r.friction >= 0.4);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-h1 font-bold" style={{ fontFamily: 'var(--font-heading), system-ui' }}>Analytics</h1>
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {[7, 30, 0].map(d => (
            <button key={d} onClick={() => setRange(d || 365)} className="px-3 py-1 rounded-md text-caption font-medium"
              style={{ background: range === (d || 365) ? 'var(--cyan)' : 'transparent', color: range === (d || 365) ? 'var(--background)' : 'var(--muted-foreground)' }}>
              {d === 0 ? 'All' : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          { label: 'Documents checked', value: stats.docs, icon: FileText, color: 'var(--cyan)' },
          { label: 'Flags raised', value: stats.flags, icon: Flag, color: 'var(--amber)' },
          { label: 'Dispute rate', value: stats.flags > 0 ? `${Math.round(stats.disputes / stats.flags * 100)}%` : '0%', icon: AlertTriangle, color: 'var(--red)' },
          { label: 'Override rate', value: stats.flags > 0 ? `${Math.round(stats.overrides / stats.flags * 100)}%` : '0%', icon: Users, color: 'var(--violet)' },
          { label: 'Publish rate', value: stats.docs > 0 ? `${Math.round(stats.published / stats.docs * 100)}%` : '0%', icon: CheckCircle2, color: 'var(--green)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} style={{ color }} />
              <span className="text-caption" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
            </div>
            <p className="text-h2 font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Friction alerts */}
      {highFriction.length > 0 && (
        <div className="mb-8">
          <h2 className="text-h3 font-semibold mb-3" style={{ fontFamily: 'var(--font-heading), system-ui' }}>Friction alerts</h2>
          {highFriction.map(r => (
            <div key={r.name} className="p-4 rounded-xl mb-2 flex items-center gap-4" style={{ background: 'rgba(255, 179, 71, 0.08)', border: '1px solid var(--amber)' }}>
              <AlertTriangle size={18} style={{ color: 'var(--amber)' }} />
              <div className="flex-1">
                <p className="text-small font-medium">{r.name}</p>
                <p className="text-caption" style={{ color: 'var(--muted-foreground)' }}>
                  {r.count} flags · {Math.round(r.friction * 100)}% friction · {r.disputes} disputes · {r.overrides} overrides
                </p>
              </div>
              <a href="/app/rules" className="px-3 py-1.5 rounded-lg text-caption font-medium" style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                Review rule
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h3 className="text-body font-semibold mb-4">Flags by rule</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={flagsByRule.slice(0, 8)} margin={{ left: 0, right: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8fa7c4' }} angle={-30} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 11, fill: '#8fa7c4' }} />
                <Tooltip contentStyle={{ background: '#0d1f36', border: '1px solid #1d3a5c', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h3 className="text-body font-semibold mb-4">Rule friction table</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-caption">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left py-2 pr-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Rule</th>
                  <th className="text-right py-2 px-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>Flags</th>
                  <th className="text-right py-2 px-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>Disputes</th>
                  <th className="text-right py-2 px-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>Overrides</th>
                  <th className="text-right py-2 pl-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>Friction</th>
                </tr>
              </thead>
              <tbody>
                {flagsByRule.map(r => (
                  <tr key={r.name} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 pr-3">{r.name}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{r.count}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{r.disputes}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{r.overrides}</td>
                    <td className="py-2 pl-2 text-right tabular-nums font-medium" style={{ color: r.friction >= 0.4 ? 'var(--amber)' : 'var(--foreground)' }}>
                      {Math.round(r.friction * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
