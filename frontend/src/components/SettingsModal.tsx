/**
 * Settings modal - UDP listener configuration
 */
import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

interface Feedback {
  type: 'success' | 'error';
  message: string;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('20777');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [trackOverride, setTrackOverride] = useState('');
  const [supportedTracks, setSupportedTracks] = useState<string[]>([]);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [udpRes, trackRes] = await Promise.all([
        fetch('/api/config/udp'),
        fetch('/api/config/track')
      ]);

      if (udpRes.ok) {
        const udpData = await udpRes.json();
        setHost(udpData.udp_host === '0.0.0.0' ? '' : udpData.udp_host);
        setPort(String(udpData.udp_port ?? 20777));
      }
      if (trackRes.ok) {
        const trackData = await trackRes.json();
        setTrackOverride(trackData.track_override || '');
        setSupportedTracks(trackData.supported_tracks || []);
      }
    } catch (e) {
      setFeedback({ type: 'error', message: `读取配置失败: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchConfig();
    }
  }, [open, fetchConfig]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setFeedback({ type: 'error', message: '端口必须是 1-65535 的整数' });
      return;
    }

    setSaving(true);
    try {
      const udpRes = await fetch('/api/config/udp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ udp_host: host.trim(), udp_port: portNum }),
      });
      const trackRes = await fetch('/api/config/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_override: trackOverride }),
      });
      const data = await udpRes.json().catch(() => ({}));
      if (!udpRes.ok || !trackRes.ok) {
        throw new Error(data.detail || '保存失败');
      }
      setFeedback({ type: 'success', message: `已保存并重启监听: ${data.udp_host || '0.0.0.0'}:${data.udp_port}` });
    } catch (err) {
      setFeedback({ type: 'error', message: `保存失败: ${(err as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-f1-dark rounded-lg p-6 w-full max-w-md shadow-2xl border border-f1-gray"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">设置</h2>
          <button onClick={onClose} className="p-1 hover:bg-f1-gray rounded transition-colors" title="关闭">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">UDP 监听 IP</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="留空 = 全接口 0.0.0.0"
              className="w-full px-3 py-2 bg-f1-darker border border-f1-gray rounded text-white focus:outline-none focus:border-race-red"
            />
            <p className="text-xs text-gray-500 mt-1">本机遥测通常填 127.0.0.1，留空监听所有网卡</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">UDP 监听端口</label>
            <input
              type="number"
              min={1}
              max={65535}
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="w-full px-3 py-2 bg-f1-darker border border-f1-gray rounded text-white focus:outline-none focus:border-race-red"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">强制赛道覆盖 (F1 World 模式下需要)</label>
            <select
              value={trackOverride}
              onChange={(e) => setTrackOverride(e.target.value)}
              className="w-full px-3 py-2 bg-f1-darker border border-f1-gray rounded text-white focus:outline-none focus:border-race-red"
            >
              <option value="">-- 自动跟随遥测 (无覆盖) --</option>
              {supportedTracks.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {feedback && (
            <div
              className={`text-sm px-3 py-2 rounded ${
                feedback.type === 'success' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-f1-gray">
            <button
              type="submit"
              disabled={saving || loading}
              className="flex items-center gap-2 px-4 py-2 bg-race-red text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
