import { useState } from 'react';
import { useLogStore, LogLevel, LogEntry } from '../../store/logStore';

const LEVEL_STYLES: Record<LogLevel, { icon: string; color: string; bg: string }> = {
  info:    { icon: 'info', color: 'text-blue-500', bg: 'bg-blue-50' },
  warn:    { icon: 'warning', color: 'text-amber-500', bg: 'bg-amber-50' },
  error:   { icon: 'error', color: 'text-red-500', bg: 'bg-red-50' },
  success: { icon: 'check_circle', color: 'text-green-500', bg: 'bg-green-50' },
};

/** 尝试将 detail 解析为 JSON 并格式化展示 */
function DetailContent({ detail }: { detail: string }) {
  try {
    const parsed = JSON.parse(detail);
    // 结构化展示 JSON 对象
    return (
      <div className="space-y-1.5">
        {Object.entries(parsed).map(([key, value]) => (
          <div key={key} className="flex items-start gap-2">
            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 mt-0.5">{key}</span>
            <span className="text-[10px] text-slate-600 break-all leading-relaxed">
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  } catch {
    // 非 JSON，直接显示文本
    return (
      <pre className="text-[10px] text-on-surface-variant/60 whitespace-pre-wrap font-mono leading-relaxed break-words">
        {detail}
      </pre>
    );
  }
}

/** 日志详情弹窗 */
function LogDetailDialog({ entry, onClose }: { entry: LogEntry; onClose: () => void }) {
  const style = LEVEL_STYLES[entry.level];
  const time = new Date(entry.timestamp);
  const fullTime = `${time.getFullYear()}-${(time.getMonth()+1).toString().padStart(2,'0')}-${time.getDate().toString().padStart(2,'0')} ${time.getHours().toString().padStart(2,'0')}:${time.getMinutes().toString().padStart(2,'0')}:${time.getSeconds().toString().padStart(2,'0')}.${time.getMilliseconds().toString().padStart(3,'0')}`;

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md mt-12 mx-4 rounded-2xl bg-white shadow-xl border border-outline-variant/20 overflow-hidden animate-[fadeIn_150ms_ease-out]" onClick={(e) => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined text-base ${style.color}`}>{style.icon}</span>
            <span className="text-sm font-semibold text-slate-800">日志详情</span>
          </div>
          <button onClick={onClose} className="icon-button-soft h-7 w-7">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* 元信息 */}
        <div className="px-5 py-4 space-y-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${style.bg} ${style.color}`}>{entry.level}</span>
            <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{entry.source}</span>
          </div>
          <p className="text-xs text-slate-800 leading-relaxed">{entry.message}</p>
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-[11px]">schedule</span>
            {fullTime}
          </p>
        </div>

        {/* 详细内容 */}
        {entry.detail && (
          <div className="px-5 py-4 max-h-80 overflow-y-auto">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="material-symbols-outlined text-xs text-slate-400">data_object</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">详细信息</span>
            </div>
            <DetailContent detail={entry.detail} />
          </div>
        )}

        {/* 无详情提示 */}
        {!entry.detail && (
          <div className="px-5 py-6 text-center">
            <span className="material-symbols-outlined text-2xl text-slate-300 mb-1 block">info</span>
            <p className="text-[11px] text-slate-400">此日志没有附加详细信息</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentLogPanel() {
  const entries = useLogStore((s) => s.entries);
  const clear = useLogStore((s) => s.clear);
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);

  return (
    <div className="h-full flex flex-col bg-surface-container-low relative">
      {/* 标题栏 */}
      <div className="workbench-panel-header px-4 shrink-0 flex items-center justify-between">
        <span className="text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">
          Agent 日志
        </span>
        {entries.length > 0 && (
          <button
            onClick={clear}
            className="icon-button-soft h-7 w-7"
            title="清空日志"
          >
            <span className="material-symbols-outlined text-sm">delete_sweep</span>
          </button>
        )}
      </div>

      {/* 日志列表 */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 mb-2 block">terminal</span>
            <p className="text-xs text-on-surface-variant/50">暂无操作日志</p>
            <p className="text-[10px] text-on-surface-variant/30 mt-1">AI 分析、画布操作等日志将显示在这里</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/30">
            {entries.map((entry) => {
              const style = LEVEL_STYLES[entry.level];
              const time = new Date(entry.timestamp);
              const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;

              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className="px-4 py-2.5 cursor-pointer hover:bg-surface-container-highest/40 transition-colors duration-100"
                >
                  <div className="flex items-start gap-2">
                    <span className={`material-symbols-outlined text-sm mt-0.5 shrink-0 ${style.color}`}>
                      {style.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-on-surface-variant/50 bg-surface-container-highest/60 px-1.5 py-0.5 rounded">
                          {entry.source}
                        </span>
                        <span className={`text-[8px] font-bold uppercase px-1 py-0.5 rounded ${style.bg} ${style.color}`}>
                          {entry.level}
                        </span>
                        <span className="text-[9px] text-on-surface-variant/30">{timeStr}</span>
                      </div>
                      <p className="text-[11px] text-on-surface/80 mt-1 leading-relaxed line-clamp-2">{entry.message}</p>
                    </div>
                    <span className="material-symbols-outlined text-xs text-on-surface-variant/30 mt-1 shrink-0">
                      chevron_right
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {selectedEntry && (
        <LogDetailDialog entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
}

export default AgentLogPanel;
