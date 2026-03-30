import { useState } from 'react';
import { useLogStore, LogLevel } from '../../store/logStore';

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

function AgentLogPanel() {
  const entries = useLogStore((s) => s.entries);
  const clear = useLogStore((s) => s.clear);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col bg-surface-container-low">
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
              const isExpanded = expandedId === entry.id;
              const time = new Date(entry.timestamp);
              const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;

              return (
                <div
                  key={entry.id}
                  onClick={() => entry.detail && setExpandedId(isExpanded ? null : entry.id)}
                  className={`px-4 py-2.5 ${entry.detail ? 'cursor-pointer hover:bg-surface-container-highest/40' : ''} ${isExpanded ? 'bg-surface-container-highest/20' : ''} transition-colors duration-100`}
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
                      <p className="text-[11px] text-on-surface/80 mt-1 leading-relaxed">{entry.message}</p>
                      {isExpanded && entry.detail && (
                        <div className="mt-2 p-3 bg-surface-container-highest/40 rounded-lg border border-outline-variant/10">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="material-symbols-outlined text-xs text-on-surface-variant/40">data_object</span>
                            <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-wider">详细信息</span>
                          </div>
                          <DetailContent detail={entry.detail} />
                        </div>
                      )}
                    </div>
                    {entry.detail && (
                      <span className={`material-symbols-outlined text-xs text-on-surface-variant/30 mt-1 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentLogPanel;
