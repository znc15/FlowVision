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

interface LogStore {
  entries: LogEntry[];
  add: (level: LogLevel, source: string, message: string, detail?: string) => void;
  clear: () => void;
}

let seq = 0;

export const useLogStore = create<LogStore>((set) => ({
  entries: [],

  add: (level, source, message, detail) =>
    set((state) => ({
      entries: [
        { id: `log-${Date.now()}-${++seq}`, timestamp: Date.now(), level, source, message, detail },
        ...state.entries,
      ].slice(0, 500),
    })),

  clear: () => set({ entries: [] }),
}));
