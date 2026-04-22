import { create } from 'zustand';

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export type LogStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  source: string;
  message: string;
  detail?: string;
  /** 执行状态 */
  status?: LogStatus;
  /** 当前步骤描述 */
  step?: string;
  /** 步骤编号（如 "2/5"） */
  stepIndex?: string;
  /** 耗时（毫秒） */
  duration?: number;
  /** 关联父日志 ID，用于追踪同一任务的子步骤 */
  parentId?: string;
  /** 分类标签 */
  tags?: string[];
  /** 关联的请求 ID */
  requestId?: string;
  /** 性能指标 */
  metrics?: { label: string; value: string }[];
}

const STORAGE_KEY = 'flowvision-logs';
const MAX_ENTRIES = 500;

interface LogStore {
  entries: LogEntry[];
  add: (level: LogLevel, source: string, message: string, detail?: string, extra?: Partial<Omit<LogEntry, 'id' | 'timestamp' | 'level' | 'source' | 'message' | 'detail'>>) => string;
  update: (id: string, updates: Partial<Pick<LogEntry, 'status' | 'step' | 'stepIndex' | 'duration' | 'level' | 'message' | 'detail' | 'metrics'>>) => void;
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

  add: (level, source, message, detail, extra) => {
    const id = `log-${Date.now()}-${++seq}`;
    const newEntry: LogEntry = {
      id,
      timestamp: Date.now(),
      level,
      source,
      message,
      detail,
      ...extra,
    };
    set((state) => {
      const newEntries = [newEntry, ...state.entries].slice(0, MAX_ENTRIES);
      saveToStorage(newEntries);
      return { entries: newEntries };
    });
    return id;
  },

  update: (id, updates) => {
    set((state) => {
      const newEntries = state.entries.map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry
      );
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
