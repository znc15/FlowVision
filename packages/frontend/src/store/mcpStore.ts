import { create } from 'zustand';
import { getBackendUrl } from '../utils/backend';

export interface McpServerConfig {
  id: string;
  name: string;
  transport: 'stdio' | 'sse' | 'streamable-http';
  stdio?: {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
  };
  url?: string;
  enabled: boolean;
  builtin?: boolean;
  description?: string;
}

export interface McpServerStatus {
  id: string;
  name: string;
  status: string;
  tools: number;
  error?: string;
}

export interface McpToolInfo {
  serverId: string;
  serverName: string;
  tools: { name: string; description?: string; inputSchema?: any }[];
}

export interface McpToolResult {
  success: boolean;
  content: any[];
  isError?: boolean;
  serverId?: string;
}

interface McpStore {
  configs: McpServerConfig[];
  status: McpServerStatus[];
  tools: McpToolInfo[];
  loading: boolean;

  fetchServers: () => Promise<void>;
  fetchTools: () => Promise<void>;
  addServer: (config: McpServerConfig) => Promise<void>;
  updateServer: (config: McpServerConfig) => Promise<void>;
  removeServer: (id: string) => Promise<void>;
  connectServer: (id: string) => Promise<void>;
  disconnectServer: (id: string) => Promise<void>;
  testServer: (id: string) => Promise<{ success: boolean; message: string; tools?: string[] }>;
  callTool: (serverId: string, toolName: string, args: Record<string, any>) => Promise<McpToolResult>;
  callToolByName: (toolName: string, args: Record<string, any>) => Promise<McpToolResult>;
  /** 联网搜索快捷方法 */
  webSearch: (query: string) => Promise<McpToolResult>;
}

export const useMcpStore = create<McpStore>((set, get) => ({
  configs: [],
  status: [],
  tools: [],
  loading: false,

  fetchServers: async () => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/mcp/servers`);
      const json = await res.json();
      if (json.success) {
        set({
          configs: json.data.configs,
          status: json.data.status,
        });
      }
    } catch {
      // 请求失败
    }
  },

  fetchTools: async () => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/mcp/tools`);
      const json = await res.json();
      if (json.success) {
        set({ tools: json.data });
      }
    } catch {
      // 请求失败
    }
  },

  addServer: async (config) => {
    set({ loading: true });
    try {
      const res = await fetch(`${getBackendUrl()}/api/mcp/servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (json.success) {
        await get().fetchServers();
        await get().fetchTools();
      }
    } finally {
      set({ loading: false });
    }
  },

  updateServer: async (config) => {
    set({ loading: true });
    try {
      const res = await fetch(`${getBackendUrl()}/api/mcp/servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (json.success) {
        await get().fetchServers();
        await get().fetchTools();
      }
    } finally {
      set({ loading: false });
    }
  },

  removeServer: async (id) => {
    set({ loading: true });
    try {
      await fetch(`${getBackendUrl()}/api/mcp/servers/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await get().fetchServers();
      await get().fetchTools();
    } finally {
      set({ loading: false });
    }
  },

  connectServer: async (id) => {
    try {
      await fetch(`${getBackendUrl()}/api/mcp/servers/${encodeURIComponent(id)}/connect`, {
        method: 'POST',
      });
      await get().fetchServers();
      await get().fetchTools();
    } catch {
      // 连接失败
    }
  },

  disconnectServer: async (id) => {
    try {
      await fetch(`${getBackendUrl()}/api/mcp/servers/${encodeURIComponent(id)}/disconnect`, {
        method: 'POST',
      });
      await get().fetchServers();
      await get().fetchTools();
    } catch {
      // 断开失败
    }
  },

  testServer: async (id) => {
    const res = await fetch(`${getBackendUrl()}/api/mcp/servers/${encodeURIComponent(id)}/test`, {
      method: 'POST',
    });
    const json = await res.json();
    return json.data || json;
  },

  callTool: async (serverId, toolName, args) => {
    const res = await fetch(`${getBackendUrl()}/api/mcp/call-tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId, toolName, args }),
    });
    const json = await res.json();
    return json.data || json;
  },

  callToolByName: async (toolName, args) => {
    const res = await fetch(`${getBackendUrl()}/api/mcp/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolName, args }),
    });
    const json = await res.json();
    return json.data || json;
  },

  webSearch: async (query) => {
    return get().callToolByName('web_search', { query });
  },
}));
