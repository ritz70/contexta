'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Users, Shield, BookOpen, Key, CheckCircle2 } from 'lucide-react';

interface BrandProfile {
  id: string;
  name: string;
  voice_summary: string | null;
  values: string[];
  forbidden_claims: string[];
  tone_traits: Record<string, number>;
}

interface Member {
  id: string;
  email: string;
  full_name: string;
  role: 'writer' | 'manager';
}

export default function BrandAndTeamPage() {
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();

    // Load org / brand profile
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)
      .single();

    if (orgData) {
      setBrand({
        id: orgData.id,
        name: orgData.name,
        voice_summary: orgData.brand_voice_summary || 'Authoritative, precise, enterprise-ready, yet approachable.',
        values: orgData.brand_values || ['Security First', 'Clarity', 'Auditable AI', 'Zero Hallucinations'],
        forbidden_claims: orgData.forbidden_claims || ['100% bug-free', 'unhackable', 'instant compliance'],
        tone_traits: orgData.tone_traits || { formality: 8, confidence: 9, empathy: 6 },
      });
    }

    // Load team members
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, role');
    
    setMembers(profiles || []);
    setLoading(false);
  }

  async function handleSaveBrand(e: React.FormEvent) {
    e.preventDefault();
    if (!brand) return;
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('organizations')
      .update({
        name: brand.name,
        brand_voice_summary: brand.voice_summary,
        brand_values: brand.values,
        forbidden_claims: brand.forbidden_claims,
      })
      .eq('id', brand.id);

    if (error) {
      toast.error('Failed to update brand: ' + error.message);
    } else {
      toast.success('Brand profile updated successfully');
    }
    setSaving(false);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-h2 font-bold" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
          Brand Profile & Team Governance
        </h1>
        <p className="text-body" style={{ color: 'var(--muted-foreground)' }}>
          Manage your organization&apos;s overarching brand voice, forbidden claims, and member permissions.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-body" style={{ color: 'var(--muted-foreground)' }}>
          Loading organization details...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Brand Voice & Claims */}
          <div className="lg:col-span-2 space-y-6">
            <form
              onSubmit={handleSaveBrand}
              className="p-6 rounded-xl space-y-5"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <BookOpen size={20} style={{ color: 'var(--cyan)' }} />
                <h2 className="text-body font-bold">Brand Identity Core</h2>
              </div>

              <div>
                <label className="text-small block mb-1" style={{ color: 'var(--muted-foreground)' }}>
                  Organization / Brand Name
                </label>
                <input
                  type="text"
                  value={brand?.name || ''}
                  onChange={(e) => brand && setBrand({ ...brand, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-body outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              </div>

              <div>
                <label className="text-small block mb-1" style={{ color: 'var(--muted-foreground)' }}>
                  Brand Voice Summary (Guides AI Suggestions & Checks)
                </label>
                <textarea
                  value={brand?.voice_summary || ''}
                  onChange={(e) => brand && setBrand({ ...brand, voice_summary: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg text-body outline-none resize-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              </div>

              <div>
                <label className="text-small block mb-1" style={{ color: 'var(--muted-foreground)' }}>
                  Core Values (comma separated)
                </label>
                <input
                  type="text"
                  value={brand?.values.join(', ') || ''}
                  onChange={(e) =>
                    brand &&
                    setBrand({
                      ...brand,
                      values: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg text-body outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              </div>

              <div>
                <label className="text-small block mb-1" style={{ color: 'var(--muted-foreground)' }}>
                  Forbidden Claims (comma separated)
                </label>
                <input
                  type="text"
                  value={brand?.forbidden_claims.join(', ') || ''}
                  onChange={(e) =>
                    brand &&
                    setBrand({
                      ...brand,
                      forbidden_claims: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg text-body outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg text-small font-semibold disabled:opacity-50"
                  style={{ background: 'var(--cyan)', color: 'var(--background)' }}
                >
                  {saving ? 'Saving Changes...' : 'Save Brand Profile'}
                </button>
              </div>
            </form>
          </div>

          {/* Team Members */}
          <div className="space-y-6">
            <div
              className="p-6 rounded-xl space-y-4"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <Users size={20} style={{ color: 'var(--cyan)' }} />
                <h2 className="text-body font-bold">Team Members</h2>
              </div>

              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 rounded-lg flex items-center justify-between"
                    style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
                  >
                    <div>
                      <p className="text-small font-semibold">{member.full_name}</p>
                      <p className="text-caption" style={{ color: 'var(--muted-foreground)' }}>
                        {member.email}
                      </p>
                    </div>
                    <span
                      className="text-caption font-semibold px-2 py-0.5 rounded capitalize"
                      style={{
                        background: member.role === 'manager' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: member.role === 'manager' ? '#c084fc' : '#60a5fa',
                      }}
                    >
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <div
                  className="p-3 rounded-lg text-caption"
                  style={{ background: 'var(--accent)', color: 'var(--muted-foreground)' }}
                >
                  💡 Tip: Role-based permissions allow <strong>Writers</strong> to draft, run checks, and dispute flags, while <strong>Managers</strong> can adjudicate disputes, configure rules, and edit channel policies.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
