import { useEffect, useState, type CSSProperties } from 'react';

interface WindowTitleBarProps {
  onOpenSettings: () => void;
}

function WindowTitleBar({ onOpenSettings }: WindowTitleBarProps) {
  const isElectron = Boolean(window.electron?.isElectron);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!isElectron || !window.electron?.window) return;

    window.electron.window.isMaximized().then(setMaximized).catch(() => undefined);
    const dispose = window.electron.window.onMaximizedChanged((value) => setMaximized(value));
    return () => {
      dispose();
    };
  }, [isElectron]);

  return (
    <header className="window-titlebar">
      <div className="window-titlebar-drag" style={{ WebkitAppRegion: 'drag' } as CSSProperties}>
        <div className="window-titlebar-brand">
          <img src="/logo/logo_32.png" alt="FlowVision" className="window-titlebar-logo" />
          <div className="min-w-0">
            <p className="window-titlebar-title">FlowVision</p>
            <p className="window-titlebar-subtitle">交互式流程图工具</p>
          </div>
        </div>
      </div>

      <div className="window-titlebar-actions" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
        <button className="window-titlebar-btn" onClick={onOpenSettings} title="设置">
          <span className="material-symbols-outlined text-[18px]">settings</span>
        </button>
        {isElectron && window.electron?.window && (
          <>
            <button className="window-titlebar-btn" onClick={() => window.electron?.window?.minimize()} title="最小化">
              <span className="material-symbols-outlined text-[18px]">remove</span>
            </button>
            <button className="window-titlebar-btn" onClick={() => window.electron?.window?.toggleMaximize()} title={maximized ? '还原' : '最大化'}>
              <span className="material-symbols-outlined text-[18px]">{maximized ? 'filter_none' : 'crop_square'}</span>
            </button>
            <button className="window-titlebar-btn window-titlebar-btn-close" onClick={() => window.electron?.window?.close()} title="关闭">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export default WindowTitleBar;
