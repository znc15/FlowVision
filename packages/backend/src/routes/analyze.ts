import { FastifyRequest, FastifyReply } from 'fastify';
import { analyzeProject } from '@flowvision/analyzer';
import { graphState } from '../state/graphState.js';
import { broadcaster } from '../ws/broadcaster.js';

interface AnalyzeRequest {
  projectPath: string;
  mode: 'module' | 'function' | 'class';
  options?: {
    maxNodes?: number;
    excludePatterns?: string[];
    entryFile?: string;
  };
}

/**
 * POST /api/analyze
 * 分析本地代码项目，生成流程图数据
 */
export async function analyzeCode(
  request: FastifyRequest<{ Body: AnalyzeRequest }>,
  reply: FastifyReply,
) {
  const startTime = Date.now();

  try {
    const { projectPath, mode, options } = request.body;

    if (!projectPath || !mode) {
      reply.code(400);
      return { success: false, error: '缺少 projectPath 或 mode 参数' };
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      reply.code(500);
      return { success: false, error: '缺少 ANTHROPIC_API_KEY 环境变量' };
    }

    // 广播进度：开始分析
    broadcaster.broadcast({
      type: 'analyze:progress',
      payload: { stage: 'collecting', percent: 10, message: '正在收集项目文件...' },
    });

    request.log.info({ projectPath, mode }, '开始代码分析');

    // 调用 analyzer
    const graphData = await analyzeProject({ projectPath, mode, options });

    // 存入服务端状态
    graphState.setGraph(graphData);

    // 广播完整图替换
    broadcaster.broadcast({
      type: 'graph:replace',
      payload: graphData,
    });

    // 广播进度：完成
    broadcaster.broadcast({
      type: 'analyze:progress',
      payload: { stage: 'done', percent: 100, message: '分析完成' },
    });

    const durationMs = Date.now() - startTime;

    return {
      success: true,
      data: graphData,
      stats: {
        nodeCount: graphData.nodes.length,
        edgeCount: graphData.edges.length,
        durationMs,
      },
    };
  } catch (error: any) {
    request.log.error({ error }, '代码分析失败');
    reply.code(500);
    return { success: false, error: error.message || '分析失败' };
  }
}
