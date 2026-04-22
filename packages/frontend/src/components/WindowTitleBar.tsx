import { useEffect, useState, useMemo, type CSSProperties } from 'react';

function WindowTitleBar() {
  const isElectron = Boolean(window.electron?.isElectron);
  const isMacOS = useMemo(() => window.electron?.platform === 'darwin', []);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!isElectron || !window.electron?.window) return;

    window.electron.window.isMaximized().then(setMaximized).catch(() => undefined);
    const dispose = window.electron.window.onMaximizedChanged((value) => setMaximized(value));
    return () => {
      dispose();
    };
  }, [isElectron]);

  useEffect(() => {
    if (isElectron) return;

    const handleFullscreenChange = () => {
      setMaximized(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isElectron]);

  const handleMinimize = () => {
    if (window.electron?.window) {
      void window.electron.window.minimize();
    }
  };

  const handleToggleMaximize = () => {
    if (window.electron?.window) {
      void window.electron.window.toggleMaximize().then((value) => setMaximized(value)).catch(() => undefined);
    } else {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => undefined);
        setMaximized(true);
      } else {
        document.exitFullscreen().catch(() => undefined);
        setMaximized(false);
      }
    }
  };

  const handleClose = () => {
    if (window.electron?.window) {
      void window.electron.window.close();
    } else {
      window.close();
    }
  };

  // macOS: 系统自带红绿灯按钮在左侧，隐藏自定义窗口控制按钮，品牌文字移到右侧
  if (isMacOS) {
    return (
      <header className="window-titlebar">
        {/* 左侧留白给 macOS 红绿灯 */}
        <div className="window-titlebar-drag" style={{ WebkitAppRegion: 'drag' } as CSSProperties} />
        {/* macOS 品牌文字放右侧 */}
        <div className="window-titlebar-brand" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
          <div className="window-titlebar-logo">F</div>
          <div className="min-w-0">
            <div className="window-titlebar-title">FlowVision</div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="window-titlebar">
      <div className="window-titlebar-brand" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
        <div className="window-titlebar-logo">F</div>
        <div className="min-w-0">
          <div className="window-titlebar-title">FlowVision</div>
        </div>
      </div>

      <div className="window-titlebar-drag" style={{ WebkitAppRegion: 'drag' } as CSSProperties} />

      <div className="window-titlebar-actions" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
        <button type="button" className="window-titlebar-btn" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties} onClick={handleMinimize} title="最小化">
          <span className="material-symbols-outlined text-[18px]">remove</span>
        </button>
        <button type="button" className="window-titlebar-btn" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties} onClick={handleToggleMaximize} title={maximized ? '还原' : '最大化'}>
          <span className="material-symbols-outlined text-[18px]">{maximized ? 'filter_none' : 'crop_square'}</span>
        </button>
        <button type="button" className="window-titlebar-btn window-titlebar-btn-close" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties} onClick={handleClose} title="关闭">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </header>
  );
}

export default WindowTitleBar;
