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
  closeAction: 'ask' | 'minimize' | 'quit';
  customHeaders: Record<string, string>;
  githubToken: string;
  httpProxy: string;
  models: ModelInfo[];
  modelsLoading: boolean;
  setProvider: (provider: AIProvider) => void;
  setApiKey: (apiKey: string) => void;
  setModel: (model: string) => void;
  setBaseURL: (baseURL: string) => void;
  setSystemPrompt: (systemPrompt: string) => void;
  setMcpEnabled: (enabled: boolean) => void;
  setCloseAction: (action: 'ask' | 'minimize' | 'quit') => void;
  setCustomHeaders: (headers: Record<string, string>) => void;
  setGithubToken: (token: string) => void;
  setHttpProxy: (proxy: string) => void;
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
  closeAction: 'ask' | 'minimize' | 'quit';
  customHeaders: Record<string, string>;
  githubToken: string;
  httpProxy: string;
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
    models: [],
    modelsLoading: false,

    setProvider: (provider) => {
      set({ provider, model: DEFAULT_MODELS[provider] });
      persistState(get);
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

    fetchModels: async () => {
      const { provider, apiKey, baseURL } = get();
      set({ modelsLoading: true });
      try {
        const params = new URLSearchParams({ provider });
        if (apiKey) params.set('apiKey', apiKey);
        if (baseURL) params.set('baseURL', baseURL);
        const res = await fetch(`http://localhost:3001/api/ai/models?${params}`);
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
        });
      }
    },
  };
});
