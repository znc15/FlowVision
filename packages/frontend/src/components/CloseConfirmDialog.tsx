import { useEffect, useState, useCallback } from 'react';

/** 美化的应用关闭确认对话框 - 替代 Electron 原生 dialog */
function CloseConfirmDialog() {
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const unsub = window.electron?.desktop?.onCloseRequested?.(() => {
      setVisible(true);
      setRemember(false);
      setClosing(false);
    });
    return () => unsub?.();
  }, []);

  const handleResponse = useCallback((action: 'tray' | 'quit' | 'cancel') => {
    if (action === 'cancel') {
      setVisible(false);
      return;
    }
    setClosing(true);
    void window.electron?.desktop?.respondClose({ action, remember });
  }, [remember]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={() => handleResponse('cancel')}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[6px] animate-[fadeIn_150ms_ease-out]" />
      <div
        className="relative w-[380px] rounded-2xl bg-white shadow-[0_24px_60px_rgba(0,0,0,0.18)] overflow-hidden animate-[scaleIn_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部渐变条 */}
        <div className="h-1 bg-gradient-to-r from-primary via-secondary to-tertiary" />

        <div className="px-6 pt-5 pb-6">
          {/* 图标和标题 */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                power_settings_new
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">关闭 FlowVision</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">请选择关闭窗口后的操作</p>
            </div>
          </div>

          {/* 选项按钮 */}
          <div className="space-y-2.5 mb-5">
            <button
              onClick={() => handleResponse('tray')}
              disabled={closing}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-50 hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 transition-all duration-150 group disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-blue-600 text-lg">minimize</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors">最小化到托盘</p>
                <p className="text-[10px] text-slate-400 mt-0.5">隐藏窗口，后台继续运行</p>
              </div>
            </button>

            <button
              onClick={() => handleResponse('quit')}
              disabled={closing}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-50 hover:bg-red-50 hover:ring-1 hover:ring-red-200 transition-all duration-150 group disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-red-600 text-lg">close</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-red-600 transition-colors">退出应用</p>
                <p className="text-[10px] text-slate-400 mt-0.5">完全退出并关闭后端服务</p>
              </div>
            </button>
          </div>

          {/* 记住选择 */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none mb-4">
            <div
              className={`w-4 h-4 rounded-[5px] border-2 flex items-center justify-center transition-all duration-150 ${
                remember ? 'bg-primary border-primary' : 'border-slate-300 hover:border-slate-400'
              }`}
              onClick={() => setRemember((v) => !v)}
            >
              {remember && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
            </div>
            <span className="text-[11px] text-slate-500" onClick={() => setRemember((v) => !v)}>记住我的选择，下次不再询问</span>
          </label>

          {/* 取消按钮 */}
          <button
            onClick={() => handleResponse('cancel')}
            className="w-full py-2.5 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors duration-150"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

export default CloseConfirmDialog;
