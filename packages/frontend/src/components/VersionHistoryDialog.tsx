import { useMemo, useState } from 'react';
import { useHistoryStore, HistoryEntry } from '../store/historyStore';
import { useGraphStore } from '../store/graphStore';
import { GraphData, GraphNode } from '../types/graph';

interface VersionHistoryDialogProps {
  open: boolean;
  onClose: () => void;
}

/** 计算两个版本之间的差异摘要 */
function computeDiff(
  older: GraphData | undefined,
  newer: GraphData | undefined,
): { addedNodes: number; removedNodes: number; changedNodes: number; addedEdges: number; removedEdges: number } {
  if (!older || !newer) {
    return { addedNodes: 0, removedNodes: 0, changedNodes: 0, addedEdges: 0, removedEdges: 0 };
  }

  const olderNodeIds = new Set(older.nodes.map((n) => n.id));
  const newerNodeIds = new Set(newer.nodes.map((n) => n.id));
  const olderEdgeIds = new Set(older.edges.map((e) => e.id));
  const newerEdgeIds = new Set(newer.edges.map((e) => e.id));

  const addedNodes = newer.nodes.filter((n) => !olderNodeIds.has(n.id)).length;
  const removedNodes = older.nodes.filter((n) => !newerNodeIds.has(n.id)).length;

  // 计算已更改的节点（标签变化或类型变化）
  const olderNodeMap = new Map<string, GraphNode>(older.nodes.map((n) => [n.id, n]));
  let changedNodes = 0;
  for (const node of newer.nodes) {
    const prev = olderNodeMap.get(node.id);
    if (prev && (prev.data.label !== node.data.label || prev.type !== node.type)) {
      changedNodes++;
    }
  }

  const addedEdges = newer.edges.filter((e) => !olderEdgeIds.has(e.id)).length;
  const removedEdges = older.edges.filter((e) => !newerEdgeIds.has(e.id)).length;

  return { addedNodes, removedNodes, changedNodes, addedEdges, removedEdges };
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 对比面板：显示两个版本之间的节点/边差异 */
function DiffPanel({ older, newer }: { older: GraphData; newer: GraphData }) {
  const olderNodeIds = new Set(older.nodes.map((n) => n.id));
  const newerNodeIds = new Set(newer.nodes.map((n) => n.id));
  const olderNodeMap = new Map<string, GraphNode>(older.nodes.map((n) => [n.id, n]));

  const added = newer.nodes.filter((n) => !olderNodeIds.has(n.id));
  const removed = older.nodes.filter((n) => !newerNodeIds.has(n.id));
  const changed = newer.nodes.filter((n) => {
    const prev = olderNodeMap.get(n.id);
    return prev && (prev.data.label !== n.data.label || prev.type !== n.type);
  });

  const olderEdgeIds = new Set(older.edges.map((e) => e.id));
  const newerEdgeIds = new Set(newer.edges.map((e) => e.id));
  const addedEdges = newer.edges.filter((e) => !olderEdgeIds.has(e.id));
  const removedEdges = older.edges.filter((e) => !newerEdgeIds.has(e.id));

  if (added.length === 0 && removed.length === 0 && changed.length === 0 && addedEdges.length === 0 && removedEdges.length === 0) {
    return <p className="text-[12px] text-slate-400 py-4 text-center">无差异</p>;
  }

  return (
    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
      {added.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-emerald-600 mb-1">+ 新增节点 ({added.length})</p>
          {added.map((n) => (
            <div key={n.id} className="flex items-center gap-1.5 text-[11px] text-slate-600 ml-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-700">{n.data.label || n.id}</span>
              <span className="text-slate-400">({n.type})</span>
            </div>
          ))}
        </div>
      )}
      {removed.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-red-500 mb-1">- 删除节点 ({removed.length})</p>
          {removed.map((n) => (
            <div key={n.id} className="flex items-center gap-1.5 text-[11px] text-slate-600 ml-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="bg-red-50 px-1.5 py-0.5 rounded text-red-600 line-through">{n.data.label || n.id}</span>
              <span className="text-slate-400">({n.type})</span>
            </div>
          ))}
        </div>
      )}
      {changed.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-amber-600 mb-1">~ 变更节点 ({changed.length})</p>
          {changed.map((n) => {
            const prev = olderNodeMap.get(n.id)!;
            return (
              <div key={n.id} className="flex items-center gap-1.5 text-[11px] text-slate-600 ml-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="bg-amber-50 px-1.5 py-0.5 rounded text-amber-700">
                  {prev.data.label} → {n.data.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {addedEdges.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-emerald-600 mb-1">+ 新增连线 ({addedEdges.length})</p>
          {addedEdges.map((e) => (
            <div key={e.id} className="flex items-center gap-1 text-[11px] text-slate-500 ml-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {e.source} → {e.target} {e.label && <span className="text-slate-400">({e.label})</span>}
            </div>
          ))}
        </div>
      )}
      {removedEdges.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-red-500 mb-1">- 删除连线 ({removedEdges.length})</p>
          {removedEdges.map((e) => (
            <div key={e.id} className="flex items-center gap-1 text-[11px] text-slate-500 ml-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="line-through">{e.source} → {e.target}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VersionHistoryDialog({ open, onClose }: VersionHistoryDialogProps) {
  const { past, present, future, restoreTo } = useHistoryStore();
  const replaceGraph = useGraphStore((s) => s.replaceGraph);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIndex, setCompareIndex] = useState<number | null>(null);

  // 合并所有历史记录
  const allEntries = useMemo(() => {
    const entries: HistoryEntry[] = [...past, ...(present ? [present] : []), ...future];
    return entries;
  }, [past, present, future]);

  const currentIndex = past.length; // present 的索引

  // 按日期分组
  const groupedEntries = useMemo(() => {
    const groups = new Map<string, { date: string; entries: { entry: HistoryEntry; index: number }[] }>();
    allEntries.forEach((entry, index) => {
      const date = formatDate(entry.timestamp);
      if (!groups.has(date)) {
        groups.set(date, { date, entries: [] });
      }
      groups.get(date)!.entries.push({ entry, index });
    });
    // 倒序：最新日期在前
    return [...groups.values()].reverse();
  }, [allEntries]);

  const handleRestore = (index: number) => {
    const entry = allEntries[index];
    if (!entry) return;
    restoreTo(index);
    replaceGraph(entry.graph);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">history</span>
            <h2 className="text-[15px] font-semibold text-slate-800">版本历史</h2>
            <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {allEntries.length} 条记录
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setCompareMode(!compareMode); setCompareIndex(null); }}
              className={`flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg transition-all ${
                compareMode ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">compare_arrows</span>
              对比模式
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* 历史列表 */}
        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
          {allEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <span className="material-symbols-outlined text-[40px] mb-2">history_toggle_off</span>
              <p className="text-[13px]">暂无历史记录</p>
              <p className="text-[11px] mt-1">编辑流程图后将自动记录版本</p>
            </div>
          ) : (
            groupedEntries.map((group) => (
              <div key={group.date} className="mb-4">
                <p className="text-[11px] font-medium text-slate-400 mb-2 sticky top-0 bg-white py-1">{group.date}</p>
                <div className="space-y-1.5">
                  {/* 每组内也倒序显示 */}
                  {[...group.entries].reverse().map(({ entry, index }) => {
                    const isCurrent = index === currentIndex;
                    const isSelected = selectedIndex === index;
                    const isCompareTarget = compareIndex === index;
                    const prevEntry = index > 0 ? allEntries[index - 1] : undefined;
                    const diff = computeDiff(prevEntry?.graph, entry.graph);
                    const hasDiff = diff.addedNodes + diff.removedNodes + diff.changedNodes + diff.addedEdges + diff.removedEdges > 0;

                    return (
                      <div key={index}>
                        <div
                          onClick={() => {
                            if (compareMode) {
                              if (selectedIndex === null) setSelectedIndex(index);
                              else if (selectedIndex !== index) setCompareIndex(index);
                            } else {
                              setSelectedIndex(isSelected ? null : index);
                            }
                          }}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                            isCurrent
                              ? 'bg-primary/5 ring-1 ring-primary/10'
                              : isSelected || isCompareTarget
                              ? 'bg-blue-50 ring-1 ring-blue-200'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* 时间线圆点 */}
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            isCurrent ? 'bg-primary ring-2 ring-primary/20' : 'bg-slate-300'
                          }`} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] font-medium text-slate-700 truncate">
                                {entry.label || '未命名操作'}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                                  当前
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400">{formatTime(entry.timestamp)}</span>
                              <span className="text-[10px] text-slate-300">·</span>
                              <span className="text-[10px] text-slate-400">
                                {entry.graph.nodes.length} 节点 · {entry.graph.edges.length} 边
                              </span>
                              {hasDiff && (
                                <>
                                  <span className="text-[10px] text-slate-300">·</span>
                                  {diff.addedNodes > 0 && <span className="text-[10px] text-emerald-500">+{diff.addedNodes}</span>}
                                  {diff.removedNodes > 0 && <span className="text-[10px] text-red-500">-{diff.removedNodes}</span>}
                                  {diff.changedNodes > 0 && <span className="text-[10px] text-amber-500">~{diff.changedNodes}</span>}
                                </>
                              )}
                            </div>
                          </div>

                          {/* 操作按钮 */}
                          {!isCurrent && !compareMode && isSelected && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRestore(index); }}
                              className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-2.5 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[13px]">restore</span>
                              恢复
                            </button>
                          )}

                          {compareMode && (
                            <div className="text-[10px] text-slate-400">
                              {selectedIndex === index ? 'A' : isCompareTarget ? 'B' : ''}
                            </div>
                          )}
                        </div>

                        {/* 展开的详细差异（非对比模式下点击展开） */}
                        {isSelected && !compareMode && prevEntry && hasDiff && (
                          <div className="ml-8 mt-1 mb-2 p-3 bg-slate-50 rounded-xl">
                            <p className="text-[11px] font-medium text-slate-500 mb-2">变更详情</p>
                            <DiffPanel older={prevEntry.graph} newer={entry.graph} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 对比模式结果面板 */}
        {compareMode && selectedIndex !== null && compareIndex !== null && (
          <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/50">
            <p className="text-[11px] font-medium text-slate-500 mb-2">
              对比：版本 A ({formatTime(allEntries[selectedIndex]?.timestamp ?? 0)}) → 版本 B ({formatTime(allEntries[compareIndex]?.timestamp ?? 0)})
            </p>
            <DiffPanel
              older={allEntries[Math.min(selectedIndex, compareIndex)]?.graph ?? { nodes: [], edges: [] }}
              newer={allEntries[Math.max(selectedIndex, compareIndex)]?.graph ?? { nodes: [], edges: [] }}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={() => { setSelectedIndex(null); setCompareIndex(null); }}
                className="text-[11px] text-slate-500 hover:text-slate-700 px-2 py-1"
              >
                清除选择
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
