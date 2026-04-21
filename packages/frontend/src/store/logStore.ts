import { create } from 'zustand';

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  source: string;       // 来源模块（如 "AI分析"、"GitHub导入"、"画布操作"）
  message: string;
  detail?: string;       // 可展开的详细信息
}

const STORAGE_KEY = 'flowvision-logs';
const MAX_ENTRIES = 500;

interface LogStore {
  entries: LogEntry[];
  add: (level: LogLevel, source: string, message: string, detail?: string) => void;
  clear: () => void;
  load: () => void;
}

/** 从 localStorage 加载日志 */
function loadFromStorage(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // localStorage 不可用或数据损坏
  }
  return [];
}

/** 保存日志到 localStorage */
function saveToStorage(entries: LogEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // 写入失败（可能存储已满）
  }
}

let seq = 0;

export const useLogStore = create<LogStore>((set) => ({
  entries: [],

  add: (level, source, message, detail) => {
    const newEntry: LogEntry = {
      id: `log-${Date.now()}-${++seq}`,
      timestamp: Date.now(),
      level,
      source,
      message,
      detail,
    };
    set((state) => {
      const newEntries = [newEntry, ...state.entries].slice(0, MAX_ENTRIES);
      saveToStorage(newEntries);
      return { entries: newEntries };
    });
  },

  clear: () => {
    saveToStorage([]);
    set({ entries: [] });
  },

  load: () => {
    const stored = loadFromStorage();
    set({ entries: stored });
  },
}));
