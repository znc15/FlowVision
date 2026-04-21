import { useEffect, useMemo, useState } from 'react';
import { getBackendUrl } from '../utils/backend';

function SystemStatusFloat() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [clientCount, setClientCount] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (hidden) return;

    let mounted = true;
    const checkHealth = async () => {
      try {
        const res = await fetch(`${getBackendUrl()}/health`);
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          setBackendStatus('online');
          setClientCount(data.clients ?? 0);
        } else {
          setBackendStatus('offline');
          setClientCount(0);
        }
      } catch {
        if (!mounted) return;
        setBackendStatus('offline');
        setClientCount(0);
      }
    };

    checkHealth();
    const timer = setInterval(checkHealth, 15000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [hidden]);

  const badgeClass = useMemo(() => {
    if (backendStatus === 'online') return 'text-emerald-700 bg-emerald-100';
    if (backendStatus === 'offline') return 'text-rose-600 bg-rose-100';
    return 'text-amber-700 bg-amber-100';
  }, [backendStatus]);

  if (hidden) {
    return (
      <button
        className="system-status-restore"
        onClick={() => setHidden(false)}
        title="显示系统状态"
      >
        <span className="material-symbols-outlined text-sm">monitor_heart</span>
      </button>
    );
  }

  return (
    <aside className="system-status-float">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-on-surface">系统状态</p>
        <button className="icon-button-soft h-6 w-6" onClick={() => setHidden(true)} title="隐藏">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeClass}`}>
          {backendStatus === 'online' ? '在线' : backendStatus === 'offline' ? '离线' : '检测中'}
        </span>
        <span className="text-[10px] text-on-surface-variant">MCP 客户端 {clientCount}</span>
      </div>
    </aside>
  );
}

export default SystemStatusFloat;
