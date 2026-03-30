import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { useTabStore } from '../../store/tabStore';
import { useGraphStore } from '../../store/graphStore';

/** 画布标签栏 */
function TabBar() {
  const { tabs, activeTabId, setActiveTab, addTab, closeTab, saveTabGraph, renameTab } = useTabStore();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  /** 切换标签时先保存当前画布，再加载目标标签 */
  const handleSwitchTab = useCallback((tabId: string) => {
    if (tabId === activeTabId) return;
    const { nodes, edges } = useGraphStore.getState();
    saveTabGraph(activeTabId, { nodes, edges });
    setActiveTab(tabId);
    const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
    if (tab) {
      useGraphStore.getState().replaceGraph(tab.graph);
    }
  }, [activeTabId, setActiveTab, saveTabGraph]);

  /** 双击进入重命名 */
  const handleDoubleClick = useCallback((tabId: string, currentTitle: string) => {
    setEditingTabId(tabId);
    setEditTitle(currentTitle);
  }, []);

  /** 完成重命名 */
  const commitRename = useCallback(() => {
    if (editingTabId && editTitle.trim()) {
      renameTab(editingTabId, editTitle.trim());
    }
    setEditingTabId(null);
  }, [editingTabId, editTitle, renameTab]);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  return (
    <div className="flex items-center h-9 bg-surface-container-lowest/92 backdrop-blur-sm ghost-border-soft border-x-0 border-t-0 px-2 gap-1 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => { if (editingTabId !== tab.id) handleSwitchTab(tab.id); }}
          onDoubleClick={() => handleDoubleClick(tab.id, tab.title)}
          className={`group flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap select-none ${
            tab.id === activeTabId
              ? 'bg-primary-container/15 text-primary'
              : 'text-on-surface-variant hover:bg-surface-container-high/80'
          }`}
        >
          <span className="material-symbols-outlined text-sm">dashboard</span>
          {editingTabId === tab.id ? (
            <input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setEditingTabId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-24 bg-transparent border-b border-primary/40 outline-none text-xs font-medium"
            />
          ) : (
            <span>{tab.title}</span>
          )}
          {tab.id === activeTabId && editingTabId !== tab.id && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleDoubleClick(tab.id, tab.title);
              }}
              className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary cursor-pointer"
              title="重命名"
            >
              edit
            </span>
          )}
          {tabs.length > 1 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity hover:text-error"
            >
              close
            </span>
          )}
        </button>
      ))}

      <button
        onClick={() => addTab()}
        className="icon-button-soft h-6 w-6 ml-1 shrink-0"
        title="新建画布"
      >
        <span className="material-symbols-outlined text-sm">add</span>
      </button>
    </div>
  );
}

export default memo(TabBar);
