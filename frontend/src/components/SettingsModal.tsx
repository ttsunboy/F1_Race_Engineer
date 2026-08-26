/**
 * Settings modal - UDP listener configuration + theme toggle
 */
import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

interface Feedback {
  type: 'success' | 'error';
  message: string;
}

export function SettingsModal({ open, onClose, darkMode, onToggleDarkMode }: SettingsModalProps) {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('20777');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/config/udp');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      // "0.0.0.0" means all interfaces; show an empty field instead
      setHost(data.udp_host === '0.0.0.0' ? '' : data.udp_host);
      setPort(String(data.udp_port ?? 20777));
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
      const res = await fetch('/api/config/udp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ udp_host: host.trim(), udp_port: portNum }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      setFeedback({ type: 'success', message: `已保存并重启监听: ${data.udp_host}:${data.udp_port}` });
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

          {feedback && (
            <div
              className={`text-sm px-3 py-2 rounded ${
                feedback.type === 'success' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-f1-gray">
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              深色模式: {darkMode ? '开' : '关'}
            </button>
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
