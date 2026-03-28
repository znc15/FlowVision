import { create } from 'zustand';
import { GraphData } from '../types/graph';

export interface CanvasTab {
  id: string;
  title: string;
  graph: GraphData;
}

interface TabStore {
  tabs: CanvasTab[];
  activeTabId: string;

  /** 新建标签 */
  addTab: (title?: string) => void;
  /** 关闭标签 */
  closeTab: (tabId: string) => void;
  /** 切换标签 */
  setActiveTab: (tabId: string) => void;
  /** 重命名标签 */
  renameTab: (tabId: string, title: string) => void;
  /** 保存当前标签的图状态 */
  saveTabGraph: (tabId: string, graph: GraphData) => void;
}

let tabSeq = 0;

function createTab(title?: string): CanvasTab {
  const id = `tab-${Date.now()}-${++tabSeq}`;
  return {
    id,
    title: title ?? `画布 ${tabSeq}`,
    graph: { nodes: [], edges: [] },
  };
}

const initialTab = createTab('画布 1');

export const useTabStore = create<TabStore>((set) => ({
  tabs: [initialTab],
  activeTabId: initialTab.id,

  addTab: (title) => {
    const tab = createTab(title);
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
  },

  closeTab: (tabId) =>
    set((s) => {
      if (s.tabs.length <= 1) return s; // 至少保留一个
      const tabs = s.tabs.filter((t) => t.id !== tabId);
      const activeTabId = s.activeTabId === tabId ? tabs[tabs.length - 1].id : s.activeTabId;
      return { tabs, activeTabId };
    }),

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  renameTab: (tabId, title) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, title } : t)),
    })),

  saveTabGraph: (tabId, graph) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, graph } : t)),
    })),
}));
