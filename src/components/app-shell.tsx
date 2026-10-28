'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  FileText,
  Shield,
  BarChart3,
  Settings,
  Users,
  BookOpen,
  ClipboardCheck,
  ScrollText,
  Columns3,
  Bell,
  LogOut,
  ChevronDown,
  MessageSquarePlus,
  Menu,
  X,
} from 'lucide-react';

interface AppShellProps {
  user: User;
  profile: {
    id: string;
    org_id: string;
    role: 'writer' | 'manager';
    full_name: string;
    email: string;
  };
  orgName: string;
  children: React.ReactNode;
}

const writerLinks = [
  { href: '/app/workspace', label: 'Documents', icon: FileText },
  { href: '/app/guidelines', label: 'Guidelines', icon: BookOpen },
  { href: '/app/guide', label: 'Guide', icon: ScrollText },
];

const managerLinks = [
  { href: '/app/workspace', label: 'Documents', icon: FileText },
  { href: '/app/reviews', label: 'Reviews', icon: ClipboardCheck },
  { href: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/app/rules', label: 'Rules', icon: Shield },
  { href: '/app/channels', label: 'Channels', icon: Columns3 },
  { href: '/app/brand', label: 'Brand & Team', icon: Users },
  { href: '/app/audit', label: 'Audit', icon: Settings },
  { href: '/app/guide', label: 'Guide', icon: ScrollText },
];

export function AppShell({ user, profile, orgName, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const links = profile.role === 'manager' ? managerLinks : writerLinks;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  async function submitFeedback() {
    if (feedbackRating === 0) return;
    setFeedbackSubmitting(true);
    try {
      const supabase = createClient();
      await supabase.from('feedback').insert({
        org_id: profile.org_id,
        user_id: profile.id,
        rating: feedbackRating,
        comment: feedbackComment || null,
        page: pathname,
      });
      setFeedbackOpen(false);
      setFeedbackRating(0);
      setFeedbackComment('');
    } catch {
      // Silent fail - non-critical feature
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 flex flex-col transform transition-transform duration-200 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#0a1929', borderRight: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <Link href="/app/workspace" className="flex items-center gap-2">
            <Shield size={20} style={{ color: 'var(--cyan)' }} />
            <span className="text-body font-bold" style={{ fontFamily: 'var(--font-heading), system-ui' }}>Contexta</span>
          </Link>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={18} style={{ color: 'var(--muted-foreground)' }} />
          </button>
        </div>

        {/* Org name */}
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-caption font-medium truncate" style={{ color: 'var(--muted-foreground)' }}>{orgName}</p>
          <p className="text-caption capitalize" style={{ color: 'var(--cyan)' }}>{profile.role}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <ul className="space-y-0.5 px-3">
            {links.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-small transition-colors"
                    style={{
                      background: isActive ? 'var(--accent)' : 'transparent',
                      color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
                    }}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon size={16} style={{ color: isActive ? 'var(--cyan)' : 'var(--muted-foreground)' }} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t px-3 py-3" style={{ borderColor: 'var(--border)' }}>
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-small hover:opacity-80 transition-opacity"
              style={{ color: 'var(--foreground)' }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-caption font-bold" style={{ background: 'var(--cyan)', color: 'var(--background)' }}>
                {profile.full_name.charAt(0)}
              </div>
              <div className="flex-1 text-left truncate">
                <p className="text-small font-medium truncate">{profile.full_name}</p>
              </div>
              <ChevronDown size={14} style={{ color: 'var(--muted-foreground)' }} />
            </button>

            {userMenuOpen && (
              <div
                className="absolute bottom-full left-0 right-0 mb-1 rounded-lg shadow-lg py-1 z-50 overflow-hidden"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-small font-semibold text-foreground truncate">{profile.full_name}</p>
                  <p className="text-caption truncate text-muted-foreground">{profile.email}</p>
                  <div className="mt-1.5">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full capitalize bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                      {profile.role}
                    </span>
                  </div>
                </div>

                {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-3 py-2 text-small hover:bg-white/5 transition-colors text-foreground text-left"
                  >
                    <Users size={14} className="text-cyan-400" />
                    <span>Switch demo account</span>
                  </button>
                )}

                <button
                  onClick={() => { setFeedbackOpen(true); setUserMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-small hover:bg-white/5 transition-colors text-foreground text-left"
                >
                  <MessageSquarePlus size={14} />
                  <span>Give feedback</span>
                </button>

                <div style={{ borderTop: '1px solid var(--border)' }} className="my-1" />

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full px-3 py-2 text-small hover:bg-white/5 transition-colors text-left"
                  style={{ color: 'var(--red)' }}
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} style={{ color: 'var(--foreground)' }} />
            </button>
            <h2 className="text-body font-medium" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
              {links.find(l => pathname === l.href || pathname.startsWith(l.href + '/'))?.label ?? 'Contexta'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFeedbackOpen(true)}
              className="px-3 py-1.5 rounded-lg text-small transition-colors hidden sm:flex items-center gap-1.5"
              style={{ color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
            >
              <MessageSquarePlus size={14} />
              Feedback
            </button>
            <NotificationBell profileId={profile.id} role={profile.role} orgId={profile.org_id} />
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>

      {/* Feedback dialog */}
      {feedbackOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="text-h3 font-semibold mb-4" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
              Give feedback
            </h3>
            <div className="mb-4">
              <p className="text-small mb-2" style={{ color: 'var(--muted-foreground)' }}>Rating</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setFeedbackRating(n)}
                    className="w-10 h-10 rounded-lg text-body font-semibold transition-colors"
                    style={{
                      background: feedbackRating >= n ? 'var(--cyan)' : 'var(--background)',
                      color: feedbackRating >= n ? 'var(--background)' : 'var(--foreground)',
                      border: `1px solid ${feedbackRating >= n ? 'var(--cyan)' : 'var(--border)'}`,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <p className="text-small mb-2" style={{ color: 'var(--muted-foreground)' }}>Comment (optional)</p>
              <textarea
                value={feedbackComment}
                onChange={e => setFeedbackComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-body outline-none resize-none"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                placeholder="What could we improve?"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setFeedbackOpen(false)}
                className="px-4 py-2 rounded-lg text-small"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Cancel
              </button>
              <button
                onClick={submitFeedback}
                disabled={feedbackRating === 0 || feedbackSubmitting}
                className="px-4 py-2 rounded-lg text-small font-semibold disabled:opacity-50"
                style={{ background: 'var(--cyan)', color: 'var(--background)' }}
              >
                {feedbackSubmitting ? 'Sending…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Notification bell component
function NotificationBell({ profileId, role, orgId }: { profileId: string; role: string; orgId: string }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; href: string }>>([]);

  async function loadNotifications() {
    try {
      const supabase = createClient();
      if (role === 'manager') {
        // Count pending disputes
        const { count: pending } = await supabase
          .from('disputes')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('status', 'pending');
        setCount(pending ?? 0);
        if (pending && pending > 0) {
          setNotifications([{
            id: 'disputes',
            text: `${pending} dispute${pending > 1 ? 's' : ''} awaiting your review`,
            href: '/app/reviews',
          }]);
        }
      } else {
        // Count unseen decided disputes
        const { count: decided } = await supabase
          .from('disputes')
          .select('*', { count: 'exact', head: true })
          .eq('raised_by', profileId)
          .eq('seen_by_writer', false)
          .in('status', ['upheld', 'overturned']);
        setCount(decided ?? 0);
        if (decided && decided > 0) {
          setNotifications([{
            id: 'decisions',
            text: `${decided} dispute${decided > 1 ? 's' : ''} have been decided`,
            href: '/app/workspace',
          }]);
        }
      }
    } catch {
      // Non-critical
    }
  }

  // Load on mount
  useState(() => { loadNotifications(); });

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) loadNotifications(); }}
        className="relative p-2 rounded-lg transition-colors"
        style={{ color: 'var(--muted-foreground)' }}
        aria-label={`Notifications${count > 0 ? ` (${count} new)` : ''}`}
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-caption flex items-center justify-center font-bold"
            style={{ background: 'var(--red)', color: 'white', fontSize: '10px' }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 rounded-lg shadow-lg z-50"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="text-small font-medium">Notifications</p>
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-small" style={{ color: 'var(--muted-foreground)' }}>No new notifications</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map(n => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 rounded-lg text-small hover:opacity-80"
                  style={{ color: 'var(--foreground)' }}
                >
                  {n.text}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
