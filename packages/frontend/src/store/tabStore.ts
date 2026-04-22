import { create } from 'zustand';
import { GraphData } from '../types/graph';

const TAB_STORAGE_KEY = 'flowvision-tabs';

export interface CanvasTab {
  id: string;
  title: string;
  graph: GraphData;
}

interface TabStore {
  tabs: CanvasTab[];
  activeTabId: string;

  /** 新建标签 */
  addTab: (title?: string, graph?: GraphData) => string;
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

function createTab(title?: string, graph?: GraphData): CanvasTab {
  const id = `tab-${Date.now()}-${++tabSeq}`;
  return {
    id,
    title: title ?? `画布 ${tabSeq}`,
    graph: graph ?? { nodes: [], edges: [] },
  };
}

/** 将标签数据持久化到 localStorage */
function persistTabs(tabs: CanvasTab[], activeTabId: string) {
  try {
    localStorage.setItem(TAB_STORAGE_KEY, JSON.stringify({ tabs, activeTabId }));
  } catch {
    // 存储空间不足时静默失败
  }
}

/** 从 localStorage 加载标签数据 */
function loadTabs(): { tabs: CanvasTab[]; activeTabId: string } | null {
  try {
    const raw = localStorage.getItem(TAB_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Array.isArray(data.tabs) && data.tabs.length > 0 && typeof data.activeTabId === 'string') {
      return data;
    }
  } catch {
    // 数据损坏，忽略
  }
  return null;
}

const saved = loadTabs();
const initialTab = saved ? saved.tabs[0] : createTab('画布 1');

export const useTabStore = create<TabStore>((set) => ({
  tabs: saved ? saved.tabs : [initialTab],
  activeTabId: saved ? saved.activeTabId : initialTab.id,

  addTab: (title, graph) => {
    const tab = createTab(title, graph);
    set((s) => {
      const next = { tabs: [...s.tabs, tab], activeTabId: tab.id };
      persistTabs(next.tabs, next.activeTabId);
      return next;
    });
    return tab.id;
  },

  closeTab: (tabId) =>
    set((s) => {
      if (s.tabs.length <= 1) return s; // 至少保留一个
      const tabs = s.tabs.filter((t) => t.id !== tabId);
      const activeTabId = s.activeTabId === tabId ? tabs[tabs.length - 1].id : s.activeTabId;
      persistTabs(tabs, activeTabId);
      return { tabs, activeTabId };
    }),

  setActiveTab: (tabId) =>
    set((s) => {
      persistTabs(s.tabs, tabId);
      // 切换标签页时通过延迟导入同步 graphStore（避免循环依赖）
      const targetTab = s.tabs.find((t) => t.id === tabId);
      if (targetTab?.graph) {
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { useGraphStore } = require('./graphStore');
          useGraphStore.getState().replaceGraph(targetTab.graph);
        }, 0);
      }
      return { activeTabId: tabId };
    }),

  renameTab: (tabId, title) =>
    set((s) => {
      const tabs = s.tabs.map((t) => (t.id === tabId ? { ...t, title } : t));
      persistTabs(tabs, s.activeTabId);
      return { tabs };
    }),

  saveTabGraph: (tabId, graph) =>
    set((s) => {
      const tabs = s.tabs.map((t) => (t.id === tabId ? { ...t, graph } : t));
      persistTabs(tabs, s.activeTabId);
      return { tabs };
    }),
}));
