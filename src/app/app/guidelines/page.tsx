'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, Shield, CheckCircle2, XCircle, AlertTriangle, Columns3 } from 'lucide-react';

interface Rule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  rule_type: string;
  dos: string[];
  donts: string[];
  rationale: string | null;
}

interface Channel {
  id: string;
  name: string;
  mode: string;
  description: string;
  tone_guidelines: string;
}

export default function GuidelinesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const [{ data: rulesData }, { data: channelsData }] = await Promise.all([
        supabase.from('rules').select('*').eq('is_active', true).order('severity'),
        supabase.from('channels').select('*').eq('is_active', true).order('name'),
      ]);
      setRules(rulesData || []);
      setChannels(channelsData || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-h2 font-bold" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
          Brand Guidelines & Reference Hub
        </h1>
        <p className="text-body" style={{ color: 'var(--muted-foreground)' }}>
          Quick writer reference for voice standards, channel-specific tone rules, and do&apos;s &amp; don&apos;ts.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-body" style={{ color: 'var(--muted-foreground)' }}>
          Loading brand guidelines...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Channel enforcement modes overview */}
          <section className="space-y-4">
            <h2 className="text-h3 font-semibold flex items-center gap-2">
              <Columns3 size={20} style={{ color: 'var(--cyan)' }} />
              Channel Expectations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  className="p-4 rounded-xl"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-body">{ch.name}</span>
                    <span className="text-caption px-2 py-0.5 rounded capitalize font-mono" style={{ background: 'var(--accent)' }}>
                      {ch.mode}
                    </span>
                  </div>
                  <p className="text-small mb-3" style={{ color: 'var(--muted-foreground)' }}>
                    {ch.description}
                  </p>
                  {ch.tone_guidelines && (
                    <p className="text-caption italic" style={{ color: 'var(--cyan)' }}>
                      &ldquo;{ch.tone_guidelines}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Active Rules & Do's and Don'ts */}
          <section className="space-y-4">
            <h2 className="text-h3 font-semibold flex items-center gap-2">
              <Shield size={20} style={{ color: 'var(--cyan)' }} />
              Rules &amp; Standards
            </h2>
            <div className="space-y-4">
              {rules.map((rule) => {
                const badgeColor =
                  rule.severity === 'error'
                    ? { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' }
                    : rule.severity === 'warning'
                    ? { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' }
                    : { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' };

                return (
                  <div
                    key={rule.id}
                    className="p-5 rounded-xl space-y-3"
                    style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-body">{rule.name}</span>
                        <span
                          className="text-caption font-semibold px-2 py-0.5 rounded uppercase"
                          style={{ background: badgeColor.bg, color: badgeColor.text }}
                        >
                          {rule.severity}
                        </span>
                      </div>
                      <span className="text-caption font-mono" style={{ color: 'var(--muted-foreground)' }}>
                        {rule.rule_type}
                      </span>
                    </div>

                    <p className="text-small" style={{ color: 'var(--muted-foreground)' }}>
                      {rule.description}
                    </p>

                    {rule.rationale && (
                      <p className="text-caption italic" style={{ color: 'var(--foreground)' }}>
                        Why this matters: {rule.rationale}
                      </p>
                    )}

                    {(rule.dos?.length > 0 || rule.donts?.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {rule.dos?.length > 0 && (
                          <div
                            className="p-3 rounded-lg space-y-1.5"
                            style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                          >
                            <span className="text-caption font-bold flex items-center gap-1.5 text-emerald-500">
                              <CheckCircle2 size={14} /> DO:
                            </span>
                            <ul className="text-caption space-y-1 list-disc list-inside">
                              {rule.dos.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {rule.donts?.length > 0 && (
                          <div
                            className="p-3 rounded-lg space-y-1.5"
                            style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                          >
                            <span className="text-caption font-bold flex items-center gap-1.5 text-red-500">
                              <XCircle size={14} /> DON&apos;T:
                            </span>
                            <ul className="text-caption space-y-1 list-disc list-inside">
                              {rule.donts.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
