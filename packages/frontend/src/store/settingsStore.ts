import { create } from 'zustand';

export type AIProvider = 'claude' | 'openai';

export interface ModelInfo {
  id: string;
  name: string;
}

interface SettingsState {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseURL: string;
  systemPrompt: string;
  mcpEnabled: boolean;
  closeAction: 'ask' | 'tray' | 'quit';
  customHeaders: Record<string, string>;
  githubToken: string;
  httpProxy: string;
  maxDepth: number;
  maxSubCalls: number;
  maxOutputTokens: number;
  maxContextTokens: number;
  backendPort: number;
  autoBackupEnabled: boolean;
  autoBackupInterval: number; // 分钟
  autoBackupMode: 'local' | 'webdav';
  autoBackupWebDAV: { url: string; username: string; password: string; path: string };
  autoBackupLocalPath: string;
  models: ModelInfo[];
  modelsLoading: boolean;
  setProvider: (provider: AIProvider) => void;
  setApiKey: (apiKey: string) => void;
  setModel: (model: string) => void;
  setBaseURL: (baseURL: string) => void;
  setSystemPrompt: (systemPrompt: string) => void;
  setMcpEnabled: (enabled: boolean) => void;
  setCloseAction: (action: 'ask' | 'tray' | 'quit') => void;
  setCustomHeaders: (headers: Record<string, string>) => void;
  setGithubToken: (token: string) => void;
  setHttpProxy: (proxy: string) => void;
  setMaxDepth: (depth: number) => void;
  setMaxSubCalls: (count: number) => void;
  setMaxOutputTokens: (tokens: number) => void;
  setMaxContextTokens: (tokens: number) => void;
  setBackendPort: (port: number) => void;
  setAutoBackupEnabled: (enabled: boolean) => void;
  setAutoBackupInterval: (minutes: number) => void;
  setAutoBackupMode: (mode: 'local' | 'webdav') => void;
  setAutoBackupWebDAV: (config: { url: string; username: string; password: string; path: string }) => void;
  setAutoBackupLocalPath: (path: string) => void;
  fetchModels: () => Promise<void>;
  save: () => void;
  load: () => void;
}

const STORAGE_KEY = 'flowvision-settings';

const DEFAULT_MODELS: Record<AIProvider, string> = {
  claude: 'claude-sonnet-4-20250514',
  openai: 'gpt-4.1',
};

function loadFromStorage(): Partial<SettingsState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // localStorage 不可用或数据损坏
  }
  return {};
}

function saveToStorage(state: {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseURL: string;
  systemPrompt: string;
  mcpEnabled: boolean;
  closeAction: 'ask' | 'tray' | 'quit';
  customHeaders: Record<string, string>;
  githubToken: string;
  httpProxy: string;
  maxDepth: number;
  maxSubCalls: number;
  maxOutputTokens: number;
  maxContextTokens: number;
  backendPort: number;
  autoBackupEnabled: boolean;
  autoBackupInterval: number;
  autoBackupMode: 'local' | 'webdav';
  autoBackupWebDAV: { url: string; username: string; password: string; path: string };
  autoBackupLocalPath: string;
}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 写入失败
  }
}

/** 从当前 state 提取需持久化的字段并保存 */
function persistState(get: () => SettingsState) {
  const s = get();
  saveToStorage({
    provider: s.provider,
    apiKey: s.apiKey,
    model: s.model,
    baseURL: s.baseURL,
    systemPrompt: s.systemPrompt,
    mcpEnabled: s.mcpEnabled,
    closeAction: s.closeAction,
    customHeaders: s.customHeaders,
    githubToken: s.githubToken,
    httpProxy: s.httpProxy,
    maxDepth: s.maxDepth,
    maxSubCalls: s.maxSubCalls,
    maxOutputTokens: s.maxOutputTokens,
    maxContextTokens: s.maxContextTokens,
    backendPort: s.backendPort,
    autoBackupEnabled: s.autoBackupEnabled,
    autoBackupInterval: s.autoBackupInterval,
    autoBackupMode: s.autoBackupMode,
    autoBackupWebDAV: s.autoBackupWebDAV,
    autoBackupLocalPath: s.autoBackupLocalPath,
  });
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const stored = loadFromStorage();
  return {
    provider: stored.provider || 'claude',
    apiKey: stored.apiKey || '',
    model: stored.model || DEFAULT_MODELS[stored.provider || 'claude'],
    baseURL: stored.baseURL || '',
    systemPrompt: stored.systemPrompt || '',
    mcpEnabled: stored.mcpEnabled ?? true,
    closeAction: (stored as any).closeAction || 'ask',
    customHeaders: (stored as any).customHeaders || {},
    githubToken: (stored as any).githubToken || '',
    httpProxy: (stored as any).httpProxy || '',
    maxDepth: (stored as any).maxDepth ?? 6,
    maxSubCalls: (stored as any).maxSubCalls ?? 200,
    maxOutputTokens: (stored as any).maxOutputTokens ?? 16384,
    maxContextTokens: (stored as any).maxContextTokens ?? 128000,
    backendPort: (stored as any).backendPort ?? 3001,
    autoBackupEnabled: (stored as any).autoBackupEnabled ?? false,
    autoBackupInterval: (stored as any).autoBackupInterval ?? 30,
    autoBackupMode: (stored as any).autoBackupMode ?? 'local',
    autoBackupWebDAV: (stored as any).autoBackupWebDAV ?? { url: '', username: '', password: '', path: '/flowvision-backup.json' },
    autoBackupLocalPath: (stored as any).autoBackupLocalPath ?? '',
    models: [],
    modelsLoading: false,

    setProvider: (provider) => {
      set({ provider, model: '' });
      persistState(get);
      // 自动获取模型列表，让用户从 API 返回的列表中选择
      get().fetchModels();
    },

    setApiKey: (apiKey) => {
      set({ apiKey });
      persistState(get);
    },

    setModel: (model) => {
      set({ model });
      persistState(get);
    },

    setBaseURL: (baseURL) => {
      set({ baseURL });
      persistState(get);
    },

    setSystemPrompt: (systemPrompt) => {
      set({ systemPrompt });
      persistState(get);
    },

    setMcpEnabled: (mcpEnabled) => {
      set({ mcpEnabled });
      persistState(get);
    },

    setCloseAction: (closeAction) => {
      set({ closeAction });
      persistState(get);
    },

    setCustomHeaders: (customHeaders) => {
      set({ customHeaders });
      persistState(get);
    },

    setGithubToken: (githubToken) => {
      set({ githubToken });
      persistState(get);
    },

    setHttpProxy: (httpProxy) => {
      set({ httpProxy });
      persistState(get);
    },

    setMaxDepth: (maxDepth) => {
      set({ maxDepth });
      persistState(get);
    },

    setMaxSubCalls: (maxSubCalls) => {
      set({ maxSubCalls });
      persistState(get);
    },

    setMaxOutputTokens: (maxOutputTokens) => {
      set({ maxOutputTokens });
      persistState(get);
    },

    setMaxContextTokens: (maxContextTokens) => {
      set({ maxContextTokens });
      persistState(get);
    },

    setBackendPort: (backendPort) => {
      set({ backendPort });
      persistState(get);
    },

    setAutoBackupEnabled: (autoBackupEnabled) => {
      set({ autoBackupEnabled });
      persistState(get);
    },

    setAutoBackupInterval: (autoBackupInterval) => {
      set({ autoBackupInterval });
      persistState(get);
    },

    setAutoBackupMode: (autoBackupMode) => {
      set({ autoBackupMode });
      persistState(get);
    },

    setAutoBackupWebDAV: (autoBackupWebDAV) => {
      set({ autoBackupWebDAV });
      persistState(get);
    },

    setAutoBackupLocalPath: (autoBackupLocalPath) => {
      set({ autoBackupLocalPath });
      persistState(get);
    },

    fetchModels: async () => {
      const { provider, apiKey, baseURL } = get();
      set({ modelsLoading: true });
      try {
        const params = new URLSearchParams({ provider });
        if (apiKey) params.set('apiKey', apiKey);
        if (baseURL) params.set('baseURL', baseURL);
        const res = await fetch(`http://127.0.0.1:${get().backendPort || 3001}/api/ai/models?${params}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          set({ models: json.data });
        }
      } catch {
        // 获取失败，保持当前列表
      } finally {
        set({ modelsLoading: false });
      }
    },

    save: () => {
      persistState(get);
    },

    load: () => {
      const stored = loadFromStorage();
      if (stored.provider) {
        set({
          provider: stored.provider,
          apiKey: stored.apiKey || '',
          model: stored.model || DEFAULT_MODELS[stored.provider],
          baseURL: stored.baseURL || '',
          systemPrompt: stored.systemPrompt || '',
          mcpEnabled: stored.mcpEnabled ?? true,
          closeAction: (stored as any).closeAction || 'ask',
          customHeaders: (stored as any).customHeaders || {},
          githubToken: (stored as any).githubToken || '',
          httpProxy: (stored as any).httpProxy || '',
          maxDepth: (stored as any).maxDepth ?? 6,
          maxSubCalls: (stored as any).maxSubCalls ?? 200,
          maxOutputTokens: (stored as any).maxOutputTokens ?? 16384,
          maxContextTokens: (stored as any).maxContextTokens ?? 128000,
          backendPort: (stored as any).backendPort ?? 3001,
          autoBackupEnabled: (stored as any).autoBackupEnabled ?? false,
          autoBackupInterval: (stored as any).autoBackupInterval ?? 30,
          autoBackupMode: (stored as any).autoBackupMode ?? 'local',
          autoBackupWebDAV: (stored as any).autoBackupWebDAV ?? { url: '', username: '', password: '', path: '/flowvision-backup.json' },
          autoBackupLocalPath: (stored as any).autoBackupLocalPath ?? '',
        });
      }
    },
  };
});
