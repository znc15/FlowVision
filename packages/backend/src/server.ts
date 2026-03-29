import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from 'dotenv';
import { graphState } from './state/graphState';
import { broadcaster } from './ws/broadcaster';
import { generateGraph, generateGraphStream } from './routes/ai';
import { analyzeCode } from './routes/analyze';
import { listFiles, readFileContent, getFileContext, browseDirs, fetchGithubTree } from './routes/files';
import { AVAILABLE_PROVIDERS, listModels } from './routes/aiProvider';

// 加载环境变量
config();

const PORT = parseInt(process.env.BACKEND_PORT || '3001', 10);
const HOST = process.env.BACKEND_HOST || '127.0.0.1';
const IS_PROD = process.env.NODE_ENV === 'production';

// 创建 Fastify 实例（生产环境跳过 pino-pretty 动态加载）
const server = Fastify({
  logger: IS_PROD
    ? { level: 'info' }
    : {
        level: 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      },
});

// 注册插件
await server.register(cors, {
  origin: true,
  credentials: true,
});

await server.register(websocket);

// ===== HTTP 路由 =====

/**
 * 健康检查
 */
server.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    clients: broadcaster.getClientCount(),
  };
});

/**
 * 获取当前图状态
 */
server.get('/api/graph', async () => {
  return {
    success: true,
    data: graphState.getGraph(),
  };
});

/**
 * 替换整个图
 */
server.post<{
  Body: { nodes: any[]; edges: any[] };
}>('/api/graph', async (request, reply) => {
  try {
    const graph = request.body;
    graphState.setGraph(graph);

    // 广播变更
    broadcaster.broadcast({
      type: 'graph:replace',
      payload: graph,
    });

    return {
      success: true,
      data: graph,
    };
  } catch (error: any) {
    reply.code(500);
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * 清空图
 */
server.delete('/api/graph', async () => {
  graphState.clear();

  broadcaster.broadcast({
    type: 'graph:replace',
    payload: { nodes: [], edges: [] },
  });

  return {
    success: true,
    message: '图已清空',
  };
});

/**
 * AI 生成流程图
 */
server.post('/api/ai/generate', generateGraph);

/**
 * AI 流式生成流程图
 */
server.post('/api/ai/generate-stream', generateGraphStream);

/**
 * 获取可用 AI Provider 列表
 */
server.get('/api/ai/config', async () => {
  return {
    providers: AVAILABLE_PROVIDERS,
    envConfigured: {
      claude: !!process.env.ANTHROPIC_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
    },
  };
});

/**
 * 获取指定 Provider 的模型列表
 */
server.get<{
  Querystring: { provider?: string; apiKey?: string; baseURL?: string };
}>('/api/ai/models', async (request) => {
  const { provider, apiKey, baseURL } = request.query;
  const models = await listModels({
    provider: (provider as 'claude' | 'openai') || 'claude',
    apiKey: apiKey || '',
    baseURL: baseURL || undefined,
  });
  return { success: true, data: models };
});

/**
 * 分析本地代码项目
 */
server.post('/api/analyze', analyzeCode);

/**
 * 获取项目文件树
 */
server.get('/api/files', listFiles);

/**
 * 获取文件内容
 */
server.get('/api/file-content', readFileContent);

/**
 * 获取项目上下文（文件树+关键文件内容，供 AI 分析）
 */
server.get('/api/file-context', getFileContext);

/**
 * 浏览目录（用于文件夹选择器）
 */
server.get('/api/browse-dirs', browseDirs);

/**
 * 获取 GitHub 仓库文件树
 */
server.get('/api/github-tree', fetchGithubTree);

// ===== WebSocket 路由 =====

/**
 * WebSocket 连接端点
 */
server.register(async (fastify) => {
  fastify.get('/ws', { websocket: true }, (socket) => {
    server.log.info('WebSocket 客户端已连接');
    broadcaster.addClient(socket);

    // 发送当前图状态
    socket.send(
      JSON.stringify({
        type: 'graph:replace',
        payload: graphState.getGraph(),
      })
    );

    socket.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        server.log.info({ data }, '收到 WebSocket 消息');
      } catch (error) {
        server.log.error({ error }, 'WebSocket 消息解析失败');
      }
    });

    socket.on('close', () => {
      server.log.info('WebSocket 客户端已断开');
    });
  });
});

// ===== 启动服务器 =====

try {
  await server.listen({ port: PORT, host: HOST });
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🎨 FlowVision 后端服务器已启动 喵～                  ║
║                                                       ║
║   HTTP:      http://${HOST}:${PORT}                    ║
║   WebSocket: ws://${HOST}:${PORT}/ws                   ║
║                                                       ║
║   健康检查:  http://${HOST}:${PORT}/health             ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
} catch (error) {
  server.log.error(error);
  process.exit(1);
}

// 优雅关闭
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    server.log.info(`收到 ${signal} 信号，正在关闭服务器...`);
    broadcaster.closeAll();
    await server.close();
    process.exit(0);
  });
});
