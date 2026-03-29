import { useEffect } from 'react';
import { useHistoryStore } from '../store/historyStore';
import { useGraphStore } from '../store/graphStore';
import { useTabStore } from '../store/tabStore';

/**
 * 全局键盘快捷键
 * Ctrl+Z: 撤销  |  Ctrl+Y / Ctrl+Shift+Z: 重做
 * Ctrl+S: 保存画布  |  Delete/Backspace: 删除选中节点
 */
export function useKeyboardShortcuts() {
  const { undo, redo } = useHistoryStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement;

      // 输入框内不拦截
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      // Ctrl+Z 撤销
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl+Y 或 Ctrl+Shift+Z 重做
      if ((ctrl && e.key === 'y') || (ctrl && e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl+S 保存画布到当前标签页
      if (ctrl && e.key === 's') {
        e.preventDefault();
        const { nodes, edges } = useGraphStore.getState();
        const { activeTabId, saveTabGraph } = useTabStore.getState();
        saveTabGraph(activeTabId, { nodes, edges });
        return;
      }

      // Delete 删除选中节点（由 React Flow 自身处理，此处仅做额外逻辑扩展的预留）
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);
}
