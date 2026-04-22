import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/** MCP 服务器配置 */
export interface McpServerConfig {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 传输类型 */
  transport: 'stdio' | 'sse' | 'streamable-http';
  /** stdio 传输配置 */
  stdio?: {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
  };
  /** SSE / HTTP 传输配置 */
  url?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 是否为内置默认服务器 */
  builtin?: boolean;
  /** 服务器描述 */
  description?: string;
}

/** 已连接的 MCP 客户端 */
interface ConnectedServer {
  config: McpServerConfig;
  client: Client;
  transport: StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport;
  tools: Tool[];
  connectedAt: number;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
}

/** 工具调用结果 */
export interface McpToolResult {
  success: boolean;
  content: any[];
  isError?: boolean;
}

/** 预配置的 GrokSearch 默认服务器 */
const DEFAULT_GROKSEARCH_CONFIG: McpServerConfig = {
  id: 'grok-search',
  name: 'GrokSearch',
  transport: 'stdio',
  stdio: {
    command: 'uvx',
    args: ['--from', 'git+https://github.com/GuDaStudio/GrokSearch@grok-with-tavily', 'grok-search'],
    env: {
      GROK_API_URL: process.env.GROK_API_URL || '',
      GROK_API_KEY: process.env.GROK_API_KEY || '',
      GROK_MODEL: process.env.GROK_MODEL || 'grok-3-mini',
      TAVILY_API_KEY: process.env.TAVILY_API_KEY || '',
    },
  },
  enabled: false,
  builtin: true,
  description: 'AI 联网搜索服务（基于 Grok API），支持 web_search、web_fetch、web_map 等工具',
};

class McpClientManager {
  private servers = new Map<string, ConnectedServer>();
  private configStore = new Map<string, McpServerConfig>();

  constructor() {
    // 注册 GrokSearch 为默认服务器
    this.configStore.set(DEFAULT_GROKSEARCH_CONFIG.id, { ...DEFAULT_GROKSEARCH_CONFIG });
    this.loadConfigs();
  }

  /** 从环境变量加载持久化配置 */
  private loadConfigs() {
    // GrokSearch 如果有 API key 则默认启用
    const grokConfig = this.configStore.get('grok-search');
    if (grokConfig && (process.env.GROK_API_KEY || process.env.GROK_API_URL)) {
      grokConfig.enabled = true;
    }

    // 加载自定义服务器配置（从环境变量 FLOWVISION_MCP_SERVERS）
    try {
      const customServers = process.env.FLOWVISION_MCP_SERVERS;
      if (customServers) {
        const servers: McpServerConfig[] = JSON.parse(customServers);
        for (const server of servers) {
          this.configStore.set(server.id, server);
        }
      }
    } catch {
      // 配置解析失败，忽略
    }
  }

  /** 获取所有已配置的服务器 */
  getConfigs(): McpServerConfig[] {
    return Array.from(this.configStore.values());
  }

  /** 获取单个服务器配置 */
  getConfig(id: string): McpServerConfig | undefined {
    return this.configStore.get(id);
  }

  /** 添加或更新服务器配置 */
  async setConfig(config: McpServerConfig): Promise<void> {
    // 如果已连接，先断开
    if (this.servers.has(config.id)) {
      await this.disconnect(config.id);
    }
    this.configStore.set(config.id, config);
    // 如果启用则自动连接
    if (config.enabled) {
      await this.connect(config.id);
    }
  }

  /** 删除服务器配置 */
  async removeConfig(id: string): Promise<void> {
    await this.disconnect(id);
    this.configStore.delete(id);
  }

  /** 连接到指定服务器 */
  async connect(id: string): Promise<void> {
    const config = this.configStore.get(id);
    if (!config) throw new Error(`未找到 MCP 服务器配置: ${id}`);
    if (this.servers.has(id)) return; // 已连接

    const connected: Partial<ConnectedServer> = {
      config,
      status: 'connecting',
      connectedAt: Date.now(),
    };

    try {
      let transport: StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport;

      if (config.transport === 'stdio' && config.stdio) {
        transport = new StdioClientTransport({
          command: config.stdio.command,
          args: config.stdio.args || [],
          env: { ...process.env, ...config.stdio.env } as Record<string, string>,
          stderr: 'pipe',
        });
      } else if (config.transport === 'sse' && config.url) {
        transport = new SSEClientTransport(new URL(config.url));
      } else if (config.transport === 'streamable-http' && config.url) {
        transport = new StreamableHTTPClientTransport(new URL(config.url));
      } else {
        throw new Error(`无效的传输配置: transport=${config.transport}`);
      }

      const client = new Client(
        { name: 'flowvision-mcp-client', version: '1.0.0' },
        { capabilities: {} }
      );

      await client.connect(transport);

      // 获取工具列表
      const { tools } = await client.listTools();

      Object.assign(connected, {
        client,
        transport,
        tools,
        status: 'connected' as const,
      });

      this.servers.set(id, connected as ConnectedServer);
      console.log(`[MCP] 已连接到 ${config.name}，可用工具: ${tools.map((t) => t.name).join(', ')}`);
    } catch (error: any) {
      Object.assign(connected, {
        status: 'error' as const,
        error: error.message,
      });
      console.error(`[MCP] 连接 ${config.name} 失败:`, error.message);
      throw error;
    }
  }

  /** 断开指定服务器 */
  async disconnect(id: string): Promise<void> {
    const server = this.servers.get(id);
    if (!server) return;

    try {
      await server.client.close();
    } catch {
      // 关闭失败忽略
    }
    this.servers.delete(id);
    console.log(`[MCP] 已断开 ${server.config.name}`);
  }

  /** 获取所有已连接服务器的工具列表 */
  getAllTools(): { serverId: string; serverName: string; tools: Tool[] }[] {
    const result: { serverId: string; serverName: string; tools: Tool[] }[] = [];
    for (const [id, server] of this.servers) {
      if (server.status === 'connected') {
        result.push({
          serverId: id,
          serverName: server.config.name,
          tools: server.tools,
        });
      }
    }
    return result;
  }

  /** 调用指定服务器上的工具 */
  async callTool(serverId: string, toolName: string, args: Record<string, any>): Promise<McpToolResult> {
    const server = this.servers.get(serverId);
    if (!server) throw new Error(`未连接到 MCP 服务器: ${serverId}`);
    if (server.status !== 'connected') throw new Error(`MCP 服务器 ${server.config.name} 状态异常: ${server.status}`);

    try {
      const result = await server.client.callTool({ name: toolName, arguments: args });
      return {
        success: !result.isError,
        content: result.content as any[],
        isError: result.isError as boolean | undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        content: [{ type: 'text', text: error.message }],
        isError: true,
      };
    }
  }

  /** 智能搜索：在所有已连接服务器中查找并调用指定工具 */
  async callToolByName(toolName: string, args: Record<string, any>): Promise<McpToolResult & { serverId: string }> {
    for (const [id, server] of this.servers) {
      if (server.status !== 'connected') continue;
      if (server.tools.some((t) => t.name === toolName)) {
        const result = await this.callTool(id, toolName, args);
        return { ...result, serverId: id };
      }
    }
    throw new Error(`未找到工具: ${toolName}，请检查 MCP 服务器是否已连接`);
  }

  /** 测试指定服务器是否可用 */
  async testConnection(id: string): Promise<{ success: boolean; message: string; tools?: string[] }> {
    const config = this.configStore.get(id);
    if (!config) return { success: false, message: `未找到配置: ${id}` };

    try {
      // 临时连接测试
      let transport: StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport;

      if (config.transport === 'stdio' && config.stdio) {
        transport = new StdioClientTransport({
          command: config.stdio.command,
          args: config.stdio.args || [],
          env: { ...process.env, ...config.stdio.env } as Record<string, string>,
          stderr: 'pipe',
        });
      } else if (config.transport === 'sse' && config.url) {
        transport = new SSEClientTransport(new URL(config.url));
      } else if (config.transport === 'streamable-http' && config.url) {
        transport = new StreamableHTTPClientTransport(new URL(config.url));
      } else {
        return { success: false, message: '无效的传输配置' };
      }

      const client = new Client(
        { name: 'flowvision-mcp-test', version: '1.0.0' },
        { capabilities: {} }
      );

      await client.connect(transport);
      const { tools } = await client.listTools();
      await client.close();

      return {
        success: true,
        message: `连接成功，发现 ${tools.length} 个工具`,
        tools: tools.map((t) => t.name),
      };
    } catch (error: any) {
      return {
        success: false,
        message: `连接失败: ${error.message}`,
      };
    }
  }

  /** 获取所有服务器状态 */
  getStatus(): { id: string; name: string; status: string; tools: number; error?: string }[] {
    const result: { id: string; name: string; status: string; tools: number; error?: string }[] = [];

    // 已连接的服务器
    for (const [id, server] of this.servers) {
      result.push({
        id,
        name: server.config.name,
        status: server.status,
        tools: server.tools.length,
        error: server.error,
      });
    }

    // 已配置但未连接的服务器
    for (const [id, config] of this.configStore) {
      if (!this.servers.has(id)) {
        result.push({
          id,
          name: config.name,
          status: config.enabled ? 'disconnected' : 'disabled',
          tools: 0,
        });
      }
    }

    return result;
  }

  /** 关闭所有连接 */
  async closeAll(): Promise<void> {
    const promises = Array.from(this.servers.keys()).map((id) => this.disconnect(id));
    await Promise.all(promises);
  }
}

// 单例导出
export const mcpClientManager = new McpClientManager();
