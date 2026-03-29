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
  closeToTrayOnClose: boolean;
  models: ModelInfo[];
  modelsLoading: boolean;
  setProvider: (provider: AIProvider) => void;
  setApiKey: (apiKey: string) => void;
  setModel: (model: string) => void;
  setBaseURL: (baseURL: string) => void;
  setSystemPrompt: (systemPrompt: string) => void;
  setMcpEnabled: (enabled: boolean) => void;
  setCloseToTrayOnClose: (enabled: boolean) => void;
  fetchModels: () => Promise<void>;
  save: () => void;
  load: () => void;
}

const STORAGE_KEY = 'flowvision-settings';

const DEFAULT_MODELS: Record<AIProvider, string> = {
  claude: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
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
  closeToTrayOnClose: boolean;
}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 写入失败
  }
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
    closeToTrayOnClose: stored.closeToTrayOnClose ?? true,
    models: [],
    modelsLoading: false,

    setProvider: (provider) => {
      set({ provider, model: DEFAULT_MODELS[provider] });
      const s = get();
      saveToStorage({
        provider,
        apiKey: s.apiKey,
        model: DEFAULT_MODELS[provider],
        baseURL: s.baseURL,
        systemPrompt: s.systemPrompt,
        mcpEnabled: s.mcpEnabled,
        closeToTrayOnClose: s.closeToTrayOnClose,
      });
    },

    setApiKey: (apiKey) => {
      set({ apiKey });
      const s = get();
      saveToStorage({
        provider: s.provider,
        apiKey,
        model: s.model,
        baseURL: s.baseURL,
        systemPrompt: s.systemPrompt,
        mcpEnabled: s.mcpEnabled,
        closeToTrayOnClose: s.closeToTrayOnClose,
      });
    },

    setModel: (model) => {
      set({ model });
      const s = get();
      saveToStorage({
        provider: s.provider,
        apiKey: s.apiKey,
        model,
        baseURL: s.baseURL,
        systemPrompt: s.systemPrompt,
        mcpEnabled: s.mcpEnabled,
        closeToTrayOnClose: s.closeToTrayOnClose,
      });
    },

    setBaseURL: (baseURL) => {
      set({ baseURL });
      const s = get();
      saveToStorage({
        provider: s.provider,
        apiKey: s.apiKey,
        model: s.model,
        baseURL,
        systemPrompt: s.systemPrompt,
        mcpEnabled: s.mcpEnabled,
        closeToTrayOnClose: s.closeToTrayOnClose,
      });
    },

    setSystemPrompt: (systemPrompt) => {
      set({ systemPrompt });
      const s = get();
      saveToStorage({
        provider: s.provider,
        apiKey: s.apiKey,
        model: s.model,
        baseURL: s.baseURL,
        systemPrompt,
        mcpEnabled: s.mcpEnabled,
        closeToTrayOnClose: s.closeToTrayOnClose,
      });
    },

    setMcpEnabled: (mcpEnabled) => {
      set({ mcpEnabled });
      const s = get();
      saveToStorage({
        provider: s.provider,
        apiKey: s.apiKey,
        model: s.model,
        baseURL: s.baseURL,
        systemPrompt: s.systemPrompt,
        mcpEnabled,
        closeToTrayOnClose: s.closeToTrayOnClose,
      });
    },

    setCloseToTrayOnClose: (closeToTrayOnClose) => {
      set({ closeToTrayOnClose });
      const s = get();
      saveToStorage({
        provider: s.provider,
        apiKey: s.apiKey,
        model: s.model,
        baseURL: s.baseURL,
        systemPrompt: s.systemPrompt,
        mcpEnabled: s.mcpEnabled,
        closeToTrayOnClose,
      });
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
      const { provider, apiKey, model, baseURL, systemPrompt, mcpEnabled, closeToTrayOnClose } = get();
      saveToStorage({ provider, apiKey, model, baseURL, systemPrompt, mcpEnabled, closeToTrayOnClose });
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
          closeToTrayOnClose: stored.closeToTrayOnClose ?? true,
        });
      }
    },
  };
});
