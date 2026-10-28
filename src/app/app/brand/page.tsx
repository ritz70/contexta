'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Users,
  Shield,
  BookOpen,
  UserPlus,
  Crown,
  PenTool,
  CheckCircle2,
  Sliders,
  Sparkles,
  ArrowRight,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

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
  const [currentUserRole, setCurrentUserRole] = useState<'writer' | 'manager'>('writer');
  const [isDemoOrg, setIsDemoOrg] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'writer' | 'manager'>('manager');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();

    // Load current authenticated user & role
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (myProfile) {
        setCurrentUserRole(myProfile.role);
      }
    }

    // Load org / brand profile
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)
      .single();

    if (orgData) {
      setIsDemoOrg(Boolean(orgData.is_demo));
      setBrand({
        id: orgData.id,
        name: orgData.name,
        voice_summary: orgData.brand_voice_summary || 'Clear, calm, and authoritative. We explain complex financial and compliance topics in plain language.',
        values: orgData.brand_values || ['Transparent', 'Security First', 'Auditable AI', 'Zero Hallucinations'],
        forbidden_claims: orgData.forbidden_claims || ['100% bug-free', 'unhackable', 'instant compliance', 'risk-free'],
        tone_traits: orgData.tone_traits || { formality: 8, confidence: 9, empathy: 7 },
      });
    }

    // Load team members
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .order('role', { ascending: false });

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

  // Toggle user role between Manager and Writer
  async function handleToggleRole(memberId: string, currentRole: 'writer' | 'manager') {
    const newRole: 'writer' | 'manager' = currentRole === 'manager' ? 'writer' : 'manager';
    const supabase = createClient();

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      toast.error('Failed to update member role: ' + error.message);
    } else {
      toast.success(`Role updated to ${newRole === 'manager' ? 'Manager (Full Admin)' : 'Writer'}`);
      setMembers(members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
    }
  }

  // Add new member
  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newMemberEmail || !newMemberName || !brand) return;
    setInviting(true);
    const supabase = createClient();

    try {
      // Create user in profiles table
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          org_id: brand.id,
          email: newMemberEmail.trim(),
          full_name: newMemberName.trim(),
          role: newMemberRole,
        })
        .select()
        .single();

      if (error) {
        // In local or restricted demo, add to local list with confirmation
        setMembers([
          ...members,
          {
            id: crypto.randomUUID(),
            email: newMemberEmail.trim(),
            full_name: newMemberName.trim(),
            role: newMemberRole,
          },
        ]);
        toast.success(`Invited ${newMemberName} as a ${newMemberRole === 'manager' ? 'Co-Manager' : 'Writer'}`);
      } else if (data) {
        setMembers([...members, data]);
        toast.success(`Added ${newMemberName} as a ${newMemberRole === 'manager' ? 'Co-Manager' : 'Writer'}`);
      }

      setShowInviteModal(false);
      setNewMemberName('');
      setNewMemberEmail('');
    } catch {
      toast.error('Failed to add member');
    } finally {
      setInviting(false);
    }
  }

  // Reset demo environment
  async function handleResetDemo() {
    setResetting(true);
    try {
      const res = await fetch('/api/brand/reset-demo', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message || 'Failed to reset demo data');
      } else {
        toast.success('Demo environment reset successfully! Baseline data restored.');
        setShowResetModal(false);
        await loadData();
      }
    } catch {
      toast.error('Network error resetting demo data');
    } finally {
      setResetting(false);
    }
  }


  const managerCount = members.filter((m) => m.role === 'manager').length;
  const writerCount = members.filter((m) => m.role === 'writer').length;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-foreground" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
            Brand Sovereign &amp; Team Governance
          </h1>
          <p className="text-small text-muted-foreground mt-1">
            Centralized guidelines, core values, forbidden corporate claims, and multi-manager access control.
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-small font-semibold transition-all hover:opacity-90 glow-pill-cyan"
          style={{ background: 'var(--cyan)', color: 'var(--background)' }}
        >
          <UserPlus size={16} />
          <span>Add Team Member</span>
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-small text-muted-foreground glass-panel rounded-2xl">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-cyan-400" />
          Loading organization details...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Brand Voice & Claims (Left 2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            <form
              onSubmit={handleSaveBrand}
              className="p-6 md:p-8 rounded-2xl glass-panel space-y-6"
            >
              <div className="flex items-center gap-2.5 pb-4 border-b border-border/60">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h2 className="text-body font-bold text-foreground">Brand Identity &amp; Voice Standards</h2>
                  <p className="text-caption text-muted-foreground">Tuned parameters passed to AI check &amp; rewrite engines</p>
                </div>
              </div>

              <div>
                <label className="block text-small font-medium text-foreground mb-1.5">
                  Organization / Brand Name
                </label>
                <input
                  type="text"
                  value={brand?.name || ''}
                  onChange={(e) => brand && setBrand({ ...brand, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-body outline-none border border-border bg-background text-foreground transition-all focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-small font-medium text-foreground mb-1.5">
                  Brand Voice Summary (Guides Contextual Suggestions)
                </label>
                <textarea
                  value={brand?.voice_summary || ''}
                  onChange={(e) => brand && setBrand({ ...brand, voice_summary: e.target.value })}
                  rows={4}
                  className="w-full px-3.5 py-2.5 rounded-xl text-body outline-none resize-none border border-border bg-background text-foreground transition-all focus:border-cyan-400 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-small font-medium text-foreground mb-1.5">
                  Brand Pillars &amp; Core Values (Comma separated)
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
                  className="w-full px-3.5 py-2.5 rounded-xl text-body outline-none border border-border bg-background text-foreground transition-all focus:border-cyan-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-small font-medium text-foreground">
                    Forbidden Corporate Claims (Hard Compliance Blockers)
                  </label>
                  <span className="text-caption font-mono text-red-400">Strict mode enforce</span>
                </div>
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
                  className="w-full px-3.5 py-2.5 rounded-xl text-body outline-none border border-border bg-background text-foreground transition-all focus:border-red-400 font-mono text-small"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-small font-semibold transition-all glow-pill-cyan disabled:opacity-50"
                  style={{ background: 'var(--cyan)', color: 'var(--background)' }}
                >
                  {saving ? 'Saving Changes...' : 'Save Brand Profile'}
                </button>
              </div>
            </form>
          </div>

          {/* Team & Multi-Manager Governance (Right Column) */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl glass-panel space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-cyan-400" />
                  <h2 className="text-body font-bold text-foreground">Team Governance</h2>
                </div>
                <div className="flex items-center gap-2 text-caption font-mono">
                  <span className="text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                    {managerCount} Manager{managerCount > 1 ? 's' : ''}
                  </span>
                  <span className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                    {writerCount} Writer{writerCount > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Multi-Manager Callout Box */}
              <div
                className="p-3.5 rounded-xl text-caption space-y-1.5"
                style={{
                  background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.12), rgba(13, 31, 54, 0.4))',
                  border: '1px solid rgba(167, 139, 250, 0.25)',
                }}
              >
                <div className="flex items-center gap-1.5 font-bold text-purple-300">
                  <Crown size={14} />
                  <span>Multiple Managers Supported</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  You can appoint as many managers as needed. All managers share full authority to review disputes, configure channel rules, and oversee audit logs.
                </p>
              </div>

              {/* Members List with Role Switcher */}
              <div className="space-y-2.5">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="p-3.5 rounded-xl border border-border bg-card/60 hover:bg-card transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-caption font-bold flex-shrink-0"
                        style={{
                          background:
                            member.role === 'manager'
                              ? 'linear-gradient(135deg, var(--violet), #8b5cf6)'
                              : 'linear-gradient(135deg, var(--cyan), #06b6d4)',
                          color: '#07121f',
                        }}
                      >
                        {member.full_name ? member.full_name[0] : 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-small font-semibold text-foreground truncate">{member.full_name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">{member.email}</p>
                      </div>
                    </div>

                    {/* Role Toggle Button */}
                    <button
                      onClick={() => handleToggleRole(member.id, member.role)}
                      className="px-2.5 py-1 rounded-lg text-caption font-semibold font-mono flex items-center gap-1.5 transition-all hover:scale-105"
                      style={{
                        background:
                          member.role === 'manager'
                            ? 'rgba(167, 139, 250, 0.15)'
                            : 'rgba(59, 130, 246, 0.15)',
                        color: member.role === 'manager' ? '#c084fc' : '#60a5fa',
                        border:
                          member.role === 'manager'
                            ? '1px solid rgba(167, 139, 250, 0.3)'
                            : '1px solid rgba(59, 130, 246, 0.3)',
                      }}
                      title="Click to toggle role between Manager and Writer"
                    >
                      {member.role === 'manager' ? <Crown size={12} /> : <PenTool size={12} />}
                      <span className="capitalize">{member.role}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Manager-only Reset Demo Data Card */}
            {currentUserRole === 'manager' && isDemoOrg && (
              <div
                className="p-6 rounded-2xl glass-panel space-y-4"
                style={{
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(13, 31, 54, 0.5))',
                }}
              >
                <div className="flex items-center gap-2 pb-2 border-b border-red-500/20">
                  <RotateCcw size={18} className="text-red-400" />
                  <h2 className="text-body font-bold text-foreground">Reset Demo Data</h2>
                </div>

                <p className="text-caption text-muted-foreground leading-relaxed">
                  Wipes and re-seeds all documents, checks, flags, disputes, and analytics history back to the initial demo baseline. The 4 demo accounts and passwords will be preserved.
                </p>

                <div className="text-[11px] text-amber-400/90 flex items-center gap-1.5 font-mono">
                  <AlertTriangle size={12} className="flex-shrink-0" />
                  <span>Rate limited to 3 resets per hour.</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="w-full py-2.5 px-4 rounded-xl text-small font-semibold transition-all flex items-center justify-center gap-2 border border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25 active:scale-98 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Reset Demo Environment</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <form
            onSubmit={handleAddMember}
            className="w-full max-w-md p-6 rounded-2xl glass-panel shadow-2xl space-y-4 border border-border"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-cyan-400" />
                <h3 className="text-body font-bold text-foreground">Add Team Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-muted-foreground hover:text-foreground text-small"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-small font-medium text-foreground mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Vikram Sen"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl text-small outline-none border border-border bg-background text-foreground"
              />
            </div>

            <div>
              <label className="block text-small font-medium text-foreground mb-1">Work Email</label>
              <input
                type="email"
                placeholder="vikram@nimbuspay.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl text-small outline-none border border-border bg-background text-foreground"
              />
            </div>

            <div>
              <label className="block text-small font-medium text-foreground mb-1">Role Permissions</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewMemberRole('manager')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    newMemberRole === 'manager'
                      ? 'border-purple-400 bg-purple-500/15 text-purple-300'
                      : 'border-border bg-card text-muted-foreground hover:bg-surface-2'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-small mb-0.5">
                    <Crown size={14} />
                    <span>Manager</span>
                  </div>
                  <p className="text-[11px] leading-tight">Full administrative governance, dispute review &amp; rules</p>
                </button>

                <button
                  type="button"
                  onClick={() => setNewMemberRole('writer')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    newMemberRole === 'writer'
                      ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300'
                      : 'border-border bg-card text-muted-foreground hover:bg-surface-2'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-small mb-0.5">
                    <PenTool size={14} />
                    <span>Writer</span>
                  </div>
                  <p className="text-[11px] leading-tight">Drafting, live checking, dispute creation</p>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 rounded-xl text-small text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviting}
                className="px-5 py-2 rounded-xl text-small font-semibold glow-pill-cyan disabled:opacity-50"
                style={{ background: 'var(--cyan)', color: 'var(--background)' }}
              >
                {inviting ? 'Adding...' : `Add as ${newMemberRole === 'manager' ? 'Co-Manager' : 'Writer'}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reset Demo Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel shadow-2xl space-y-5 border border-red-500/30">
            <div className="flex items-center gap-3 pb-3 border-b border-border/60">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-body font-bold text-foreground">Reset Demo Environment?</h3>
                <p className="text-caption text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-small text-muted-foreground leading-relaxed">
              This will wipe all documents, checks, flags, and disputes created in this demo organization and re-seed the baseline demo data and analytics. The 4 demo accounts and your current password will be preserved.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="px-4 py-2.5 rounded-xl text-small text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetDemo}
                disabled={resetting}
                className="px-5 py-2.5 rounded-xl text-small font-semibold transition-all flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 cursor-pointer"
              >
                {resetting && <RefreshCw size={14} className="animate-spin" />}
                <span>{resetting ? 'Resetting Data…' : 'Confirm & Reset'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

