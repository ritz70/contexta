'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Columns3, Plus, Shield, Sliders, CheckCircle2 } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  mode: 'strict' | 'balanced' | 'flexible';
  tone_guidelines: string | null;
  word_count_min: number | null;
  word_count_max: number | null;
  is_active: boolean;
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    loadChannels();
  }, []);

  async function loadChannels() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('name');
    if (error) {
      toast.error('Failed to load channels: ' + error.message);
    } else {
      setChannels(data || []);
    }
    setLoading(false);
  }

  async function handleSaveChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!editingChannel) return;
    setSaveLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('channels')
      .update({
        mode: editingChannel.mode,
        description: editingChannel.description,
        tone_guidelines: editingChannel.tone_guidelines,
        word_count_min: editingChannel.word_count_min,
        word_count_max: editingChannel.word_count_max,
        is_active: editingChannel.is_active,
      })
      .eq('id', editingChannel.id);

    if (error) {
      toast.error('Failed to update channel: ' + error.message);
    } else {
      toast.success('Channel updated successfully');
      setEditingChannel(null);
      loadChannels();
    }
    setSaveLoading(false);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-bold" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
            Channels & Enforcement Matrix
          </h1>
          <p className="text-body" style={{ color: 'var(--muted-foreground)' }}>
            Configure destination channels, default enforcement modes, and length/tone constraints.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-body" style={{ color: 'var(--muted-foreground)' }}>
          Loading channels...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel) => {
            const modeColors: Record<string, { bg: string; text: string; border: string }> = {
              strict: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', border: '#ef4444' },
              balanced: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: '#f59e0b' },
              flexible: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', border: '#3b82f6' },
            };
            const style = modeColors[channel.mode] || modeColors.balanced;

            return (
              <div
                key={channel.id}
                className="p-5 rounded-xl flex flex-col justify-between"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Columns3 size={18} style={{ color: 'var(--cyan)' }} />
                      <h3 className="text-body font-bold">{channel.name}</h3>
                    </div>
                    <span
                      className="text-caption font-semibold px-2.5 py-0.5 rounded-full capitalize"
                      style={{
                        background: style.bg,
                        color: style.text,
                        border: `1px solid ${style.border}`,
                      }}
                    >
                      {channel.mode}
                    </span>
                  </div>

                  <p className="text-small mb-4" style={{ color: 'var(--muted-foreground)' }}>
                    {channel.description || 'No description provided.'}
                  </p>

                  <div className="space-y-2 text-small mb-4">
                    <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span style={{ color: 'var(--muted-foreground)' }}>Word Target:</span>
                      <span className="font-mono">
                        {channel.word_count_min ?? 0} – {channel.word_count_max ?? '∞'} words
                      </span>
                    </div>
                    {channel.tone_guidelines && (
                      <div className="pt-1">
                        <span className="text-caption block mb-1" style={{ color: 'var(--muted-foreground)' }}>Tone Guidelines:</span>
                        <p className="text-caption italic" style={{ color: 'var(--foreground)' }}>
                          &ldquo;{channel.tone_guidelines}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => setEditingChannel(channel)}
                    className="px-3 py-1.5 rounded-lg text-small font-medium transition-colors"
                    style={{ background: 'var(--accent)', color: 'var(--foreground)' }}
                  >
                    Configure
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Channel Modal */}
      {editingChannel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSaveChannel}
            className="w-full max-w-md rounded-xl p-6 space-y-4"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-h3 font-semibold" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
              Configure {editingChannel.name}
            </h3>

            <div>
              <label className="text-small block mb-1" style={{ color: 'var(--muted-foreground)' }}>
                Enforcement Mode
              </label>
              <select
                value={editingChannel.mode}
                onChange={(e) =>
                  setEditingChannel({
                    ...editingChannel,
                    mode: e.target.value as 'strict' | 'balanced' | 'flexible',
                  })
                }
                className="w-full px-3 py-2 rounded-lg text-body outline-none"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              >
                <option value="strict">Strict (Blocks publish on any hard error)</option>
                <option value="balanced">Balanced (Flags warnings, blocks critical compliance)</option>
                <option value="flexible">Flexible (Advisory checks, social speed)</option>
              </select>
            </div>

            <div>
              <label className="text-small block mb-1" style={{ color: 'var(--muted-foreground)' }}>
                Description
              </label>
              <input
                type="text"
                value={editingChannel.description || ''}
                onChange={(e) =>
                  setEditingChannel({ ...editingChannel, description: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg text-body outline-none"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-small block mb-1" style={{ color: 'var(--muted-foreground)' }}>
                  Min Words
                </label>
                <input
                  type="number"
                  value={editingChannel.word_count_min ?? ''}
                  onChange={(e) =>
                    setEditingChannel({
                      ...editingChannel,
                      word_count_min: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg text-body outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              </div>
              <div>
                <label className="text-small block mb-1" style={{ color: 'var(--muted-foreground)' }}>
                  Max Words
                </label>
                <input
                  type="number"
                  value={editingChannel.word_count_max ?? ''}
                  onChange={(e) =>
                    setEditingChannel({
                      ...editingChannel,
                      word_count_max: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg text-body outline-none"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              </div>
            </div>

            <div>
              <label className="text-small block mb-1" style={{ color: 'var(--muted-foreground)' }}>
                Tone Guidelines
              </label>
              <textarea
                value={editingChannel.tone_guidelines || ''}
                onChange={(e) =>
                  setEditingChannel({ ...editingChannel, tone_guidelines: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-body outline-none resize-none"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingChannel(null)}
                className="px-4 py-2 rounded-lg text-small"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveLoading}
                className="px-4 py-2 rounded-lg text-small font-semibold disabled:opacity-50"
                style={{ background: 'var(--cyan)', color: 'var(--background)' }}
              >
                {saveLoading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
