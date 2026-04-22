import { useState } from 'react';
import { useLogStore, LogLevel, LogEntry, LogStatus } from '../../store/logStore';

const LEVEL_STYLES: Record<LogLevel, { icon: string; color: string; bg: string }> = {
  info:    { icon: 'info', color: 'text-blue-500', bg: 'bg-blue-50' },
  warn:    { icon: 'warning', color: 'text-amber-500', bg: 'bg-amber-50' },
  error:   { icon: 'error', color: 'text-red-500', bg: 'bg-red-50' },
  success: { icon: 'check_circle', color: 'text-green-500', bg: 'bg-green-50' },
};

const STATUS_STYLES: Record<LogStatus, { icon: string; color: string; bg: string; label: string }> = {
  pending:   { icon: 'schedule', color: 'text-slate-500', bg: 'bg-slate-100', label: '等待' },
  running:   { icon: 'progress_activity', color: 'text-blue-500', bg: 'bg-blue-50', label: '执行中' },
  completed: { icon: 'check_circle', color: 'text-green-500', bg: 'bg-green-50', label: '完成' },
  failed:    { icon: 'cancel', color: 'text-red-500', bg: 'bg-red-50', label: '失败' },
  cancelled: { icon: 'do_not_disturb', color: 'text-slate-400', bg: 'bg-slate-100', label: '取消' },
};

/** 格式化耗时 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

/** 尝试将 detail 解析为 JSON 并格式化展示 */
function DetailContent({ detail }: { detail: string }) {
  try {
    const parsed = JSON.parse(detail);
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
  const statusStyle = entry.status ? STATUS_STYLES[entry.status] : null;
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
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${style.bg} ${style.color}`}>{entry.level}</span>
            <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{entry.source}</span>
            {statusStyle && (
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${statusStyle.bg} ${statusStyle.color} flex items-center gap-1`}>
                <span className={`material-symbols-outlined text-[12px] ${entry.status === 'running' ? 'animate-spin' : ''}`}>{statusStyle.icon}</span>
                {statusStyle.label}
              </span>
            )}
            {entry.duration != null && (
              <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded flex items-center gap-1">
                <span className="material-symbols-outlined text-[11px]">timer</span>
                {formatDuration(entry.duration)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-800 leading-relaxed">{entry.message}</p>
          {entry.step && (
            <div className="flex items-center gap-1.5">
              {entry.stepIndex && (
                <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{entry.stepIndex}</span>
              )}
              <span className="text-[11px] text-slate-600">{entry.step}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[11px]">schedule</span>
              {fullTime}
            </span>
            {entry.requestId && (
              <span className="flex items-center gap-1 font-mono">
                <span className="material-symbols-outlined text-[11px]">tag</span>
                {entry.requestId.slice(0, 12)}
              </span>
            )}
          </div>
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.tags.map((tag) => (
                <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-primary/8 text-primary rounded">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* 性能指标 */}
        {entry.metrics && entry.metrics.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="material-symbols-outlined text-xs text-slate-400">speed</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">性能指标</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {entry.metrics.map((m) => (
                <div key={m.label} className="px-2 py-1.5 bg-slate-50 rounded-lg text-center">
                  <p className="text-[11px] font-semibold text-slate-700">{m.value}</p>
                  <p className="text-[9px] text-slate-400">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

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
        {!entry.detail && !entry.metrics?.length && (
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
              const statusStyle = entry.status ? STATUS_STYLES[entry.status] : null;
              const time = new Date(entry.timestamp);
              const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;

              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className="px-4 py-2.5 cursor-pointer hover:bg-surface-container-highest/40 transition-colors duration-100"
                >
                  <div className="flex items-start gap-2">
                    <span className={`material-symbols-outlined text-sm mt-0.5 shrink-0 ${style.color} ${entry.status === 'running' ? 'animate-spin' : ''}`}>
                      {style.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-medium text-on-surface-variant/50 bg-surface-container-highest/60 px-1.5 py-0.5 rounded">
                          {entry.source}
                        </span>
                        <span className={`text-[8px] font-bold uppercase px-1 py-0.5 rounded ${style.bg} ${style.color}`}>
                          {entry.level}
                        </span>
                        {statusStyle && (
                          <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${statusStyle.bg} ${statusStyle.color}`}>
                            {statusStyle.label}
                          </span>
                        )}
                        {entry.duration != null && (
                          <span className="text-[9px] font-mono text-slate-400">{formatDuration(entry.duration)}</span>
                        )}
                        <span className="text-[9px] text-on-surface-variant/30">{timeStr}</span>
                      </div>
                      <p className="text-[11px] text-on-surface/80 mt-1 leading-relaxed line-clamp-2">{entry.message}</p>
                      {entry.step && (
                        <p className="text-[10px] text-primary/70 mt-0.5 flex items-center gap-1">
                          {entry.stepIndex && <span className="font-mono font-bold">{entry.stepIndex}</span>}
                          {entry.step}
                          {entry.status === 'running' && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse ml-1"></span>
                          )}
                        </p>
                      )}
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {entry.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[8px] px-1 py-0.5 bg-primary/6 text-primary/60 rounded">{tag}</span>
                          ))}
                          {entry.tags.length > 3 && <span className="text-[8px] text-primary/40">+{entry.tags.length - 3}</span>}
                        </div>
                      )}
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
