'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Settings, Shield, Clock, Search, Filter } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  actor_id: string | null;
  actor_email?: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  async function loadAuditLogs() {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  }

  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesSearch =
      search === '' ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.target_type.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(search.toLowerCase());
    return matchesAction && matchesSearch;
  });

  const actionTypes = Array.from(new Set(logs.map((l) => l.action)));

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-h2 font-bold" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
          Audit Trail & Governance Logs
        </h1>
        <p className="text-body" style={{ color: 'var(--muted-foreground)' }}>
          Immutable record of checks, overrides, dispute decisions, and publishing events across your organization.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <Search size={16} style={{ color: 'var(--muted-foreground)' }} />
            <input
              type="text"
              placeholder="Search logs by keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-small w-full"
              style={{ color: 'var(--foreground)' }}
            />
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <Filter size={16} style={{ color: 'var(--muted-foreground)' }} />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-transparent outline-none text-small cursor-pointer"
              style={{ color: 'var(--foreground)' }}
            >
              <option value="all">All Actions</option>
              {actionTypes.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-body" style={{ color: 'var(--muted-foreground)' }}>
          Loading audit trail...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div
          className="p-12 text-center rounded-xl"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <Clock size={36} className="mx-auto mb-3 opacity-40" />
          <p className="text-body font-medium">No audit events found</p>
          <p className="text-small" style={{ color: 'var(--muted-foreground)' }}>
            Events are logged automatically when documents are checked, disputed, or published.
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-small">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--accent)' }}>
                  <th className="p-4 font-semibold">Timestamp</th>
                  <th className="p-4 font-semibold">Action</th>
                  <th className="p-4 font-semibold">Target</th>
                  <th className="p-4 font-semibold">Metadata & Details</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {filteredLogs.map((log) => {
                  const dateStr = new Date(log.created_at).toLocaleString();
                  return (
                    <tr key={log.id} className="hover:bg-accent/40 transition-colors">
                      <td className="p-4 whitespace-nowrap font-mono text-caption" style={{ color: 'var(--muted-foreground)' }}>
                        {dateStr}
                      </td>
                      <td className="p-4">
                        <span
                          className="px-2.5 py-1 rounded-md text-caption font-semibold font-mono"
                          style={{
                            background: log.action.includes('publish')
                              ? 'rgba(16, 185, 129, 0.15)'
                              : log.action.includes('dispute')
                              ? 'rgba(245, 158, 11, 0.15)'
                              : log.action.includes('rule')
                              ? 'rgba(168, 85, 247, 0.15)'
                              : 'var(--accent)',
                            color: log.action.includes('publish')
                              ? '#10b981'
                              : log.action.includes('dispute')
                              ? '#f59e0b'
                              : log.action.includes('rule')
                              ? '#c084fc'
                              : 'var(--foreground)',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 font-medium capitalize">
                        {log.target_type}
                        {log.target_id && (
                          <span className="block text-caption font-mono" style={{ color: 'var(--muted-foreground)' }}>
                            {log.target_id.slice(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <pre
                          className="text-caption p-2 rounded max-h-24 overflow-y-auto font-mono"
                          style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
                        >
                          {JSON.stringify(log.details || {}, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
