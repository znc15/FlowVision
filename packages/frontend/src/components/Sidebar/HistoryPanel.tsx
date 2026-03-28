import { memo } from 'react';
import { useHistoryStore, HistoryEntry } from '../../store/historyStore';
import { useGraphStore } from '../../store/graphStore';

/** 版本历史面板 */
function HistoryPanel() {
  const { past, present, future, restoreTo } = useHistoryStore();

  const allEntries: HistoryEntry[] = [
    ...past,
    ...(present ? [present] : []),
    ...future,
  ];

  const currentIndex = past.length;

  const handleRestore = (index: number) => {
    restoreTo(index);
    const entry = allEntries[index];
    if (entry) {
      useGraphStore.getState().replaceGraph(entry.graph);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="workbench-panel-header px-4 shrink-0">
        <span className="text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">
          History
        </span>
        <span className="text-[10px] text-on-surface-variant">{allEntries.length} 条</span>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {allEntries.length === 0 && (
          <div className="px-4 py-6 text-xs text-on-surface-variant text-center">暂无历史记录</div>
        )}

        {allEntries.map((entry, i) => {
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;
          return (
            <button
              key={`${entry.timestamp}-${i}`}
              onClick={() => handleRestore(i)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-all duration-200 ${
                isCurrent
                  ? 'bg-primary-container/15 text-primary'
                  : isFuture
                    ? 'text-on-surface-variant/50 hover:bg-surface-container-high/60'
                    : 'text-on-surface-variant hover:bg-surface-container-high/80'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isCurrent ? 'bg-primary' : isFuture ? 'bg-outline-variant/40' : 'bg-outline-variant'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">
                  {entry.label ?? `${entry.graph.nodes.length} 节点, ${entry.graph.edges.length} 边`}
                </div>
                <div className="text-[10px] opacity-60">{formatTime(entry.timestamp)}</div>
              </div>
              {isCurrent && (
                <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-xl">
                  当前
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(HistoryPanel);
