import { FastifyRequest, FastifyReply } from 'fastify';
import { GraphData, GraphDiff } from '../types/graph';
import { graphState } from '../state/graphState';
import { applyDiffToGraph } from '../state/graphDiff';
import { broadcaster } from '../ws/broadcaster';
import { createProvider, ProviderConfig } from './aiProvider';

// 系统 Prompt - 智能流程图设计助手
const GRAPH_SYSTEM_PROMPT = `你是 FlowVision 的智能流程图设计助手。你的目标是把用户需求整理成结构清晰、边连接正确、可直接渲染的流程图。

## 核心要求

- 先判断当前应该进入“对话模式”还是“生成模式”。
- 生成流程图时，必须保证节点命名清晰、边连接合法、流程方向合理。
- 如果是增量修改，优先复用当前图中的已有节点，不要重复创建等价节点。
- 输出前必须自检：所有边的 source/target 都必须指向最终 JSON 中真实存在的节点。

## 工作模式

**对话模式**（默认）：
- 当用户描述需求、提出问题或讨论方案时，用自然语言回复
- 帮助用户理清思路，提出关键问题
- 在适当时候询问用户是否需要生成流程图
- 如果需求还不清楚，优先澄清，不要过早生成 JSON

**生成模式**：
- 当用户明确要求生成或修改流程图时（如“生成一个XX流程图”、“画一个流程”、“创建流程图”），返回 GraphDiff JSON
- 只返回合法 JSON，不包含任何解释文字或 markdown 代码块
- 若新增节点处于两个已有节点之间，必须同时补齐前后连接

## 澄清提问（question 工具）
在以下场景中，你**必须**先向用户提出澄清问题，而不是直接生成流程图：
- 用户需求描述模糊或含糊不清时
- 可能存在多种流程分支但用户未说明时
- 涉及异常处理、边界条件但用户未提及时
- 流程的起止点或关键决策条件不明确时

提问格式：使用 ❓ 标记每个问题，一次提出 2-3 个关键问题，等待用户回答后再生成流程图。

## 判断标准
- 明确的生成指令（“生成”、“画”、“创建”、“设计” + “流程图”）→ 直接生成 JSON
- 描述需求、讨论方案、提出问题 → 自然语言回复
- 不确定用户意图 → 自然语言回复，并询问是否需要生成流程图

## 生成原则

1. **完整性优先**
  - 全量生成时，必须包含 start 和 end 节点，且 start 节点必须有至少一条出边连接到后续流程节点。
  - 增量修改时，新节点应尽量挂接到已有流程，而不是孤立存在。
  - **严禁出现 start 节点没有出边的情况**，start 必须连接到第一个流程步骤。

2. **边连接必须可渲染**
  - 每条边的 source 和 target 都必须存在。
  - 不要引用被移除或未创建成功的节点 ID。
  - decision 节点的输出边尽量带条件标签。
  - 边支持以下类型：smoothstep（默认，圆角折线）、step（直角折线）、straight（直线）、default（贝塞尔曲线）。
  - 边可设置 animated: true 来显示流动动画效果。

3. **节点职责明确**
  - process 表示动作步骤。
  - decision 表示条件判断。
  - data/document/manual_input 表示数据输入输出。
  - annotation 用于说明，不承担主流程控制。

4. **避免无意义孤点**
  - 除 start、end、annotation、group 外，普通节点通常应至少有一条关联边。
  - 如果新增节点本应插入流程中，却没有连接，继续补齐连接后再输出。

5. **ID 和标签规范**
  - id 必须唯一，且在整个 GraphDiff 中保持一致。
  - label 使用简洁中文或英文，不超过 20 个字符。

## JSON 格式规则（仅生成模式使用）

格式必须严格符合 GraphDiff 类型定义：
{
  "add": {
    "nodes": [
      {
        "id": "唯一ID",
        "type": "节点类型",
        "position": { "x": 0, "y": 0 },
        "data": {
          "label": "节点标签",
          "description": "节点描述（可选）",
          "tags": ["标签1"]
        }
      }
    ],
    "edges": [
      {
        "id": "边ID",
        "source": "源节点ID",
        "target": "目标节点ID",
        "label": "边标签（可选）",
        "type": "smoothstep",
        "animated": false
      }
    ]
  },
  "update": { "nodes": [], "edges": [] },
  "remove": { "nodeIds": [], "edgeIds": [] }
}

节点类型：process（流程步骤）| decision（判断分支）| start（开始）| end（结束）| data（数据）| group（分组）| subprocess（子流程）| delay（延迟/等待）| document（文档输出）| manual_input（手动输入）| annotation（注释说明）| connector（连接器/跳转点）
label 使用简洁中文或英文，不超过 20 个字符。position 无需填写，由前端自动布局。

## 输出前自检清单

- add.nodes / update.nodes / remove.nodeIds 是否互相矛盾？若矛盾，修正后再输出。
- add.edges / update.edges 中的每个 source、target 是否都存在于当前图或本次 add.nodes 中？
- 是否误用了不存在的节点 ID、拼写错误的 ID 或重复的 edge.id？
- 如果是流程主链，是否存在明显断开的节点？若存在，补齐边或改为 annotation/group。`;

interface AIGenerateRequest {
  prompt: string;
  currentGraph?: GraphData;
  mode?: 'full' | 'incremental';
  provider?: ProviderConfig['provider'];
  apiKey?: string;
  model?: string;
  baseURL?: string;
  /** 自定义系统提示（省略则使用默认图生成提示） */
  systemPrompt?: string;
  /** 是否跳过 GraphDiff 解析，直接返回原始文本 */
  rawMode?: boolean;
  /** 是否启用模型思考能力 */
  thinking?: boolean;
  /** 自定义请求头（传递给 AI Provider） */
  customHeaders?: Record<string, string>;
  /** HTTP 代理地址 */
  httpProxy?: string;
}

function parseGraphDiff(rawText: string): GraphDiff {
  const jsonText = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');

  return JSON.parse(jsonText) as GraphDiff;
}

function buildUserMessage(prompt: string, currentGraph?: GraphData, mode: 'full' | 'incremental' = 'incremental') {
  if (mode === 'incremental' && currentGraph) {
    return `当前流程图状态：\n${JSON.stringify(currentGraph, null, 2)}\n\n用户指令：${prompt}`;
  }

  return prompt;
}

/**
 * POST /api/ai/generate
 * 调用 AI Provider 生成或修改流程图
 */
export async function generateGraph(
  request: FastifyRequest<{ Body: AIGenerateRequest }>,
  reply: FastifyReply
) {
  try {
    const { prompt, currentGraph, mode = 'incremental', provider: providerName, apiKey, model, baseURL } = request.body;

    if (!prompt || prompt.trim().length === 0) {
      reply.code(400);
      return {
        success: false,
        error: '请提供有效的描述',
      };
    }

    const aiProvider = createProvider({ provider: providerName, apiKey, model, baseURL, customHeaders: request.body.customHeaders, httpProxy: request.body.httpProxy });
    const userMessage = buildUserMessage(prompt, currentGraph, mode);
    const result = await aiProvider.generate(GRAPH_SYSTEM_PROMPT, userMessage);

    const diff = parseGraphDiff(result.text);
    const nextGraph = applyDiffToGraph(graphState.getGraph(), diff);
    graphState.setGraph(nextGraph);

    broadcaster.broadcast({
      type: 'graph:replace',
      payload: nextGraph,
    });

    return {
      success: true,
      diff,
      graph: nextGraph,
      tokensUsed: result.tokensUsed,
    };
  } catch (error: any) {
    request.log.error({ error }, 'AI 生成失败');
    reply.code(500);
    return {
      success: false,
      error: error.message || '生成失败',
    };
  }
}

/**
 * POST /api/ai/generate-stream
 * 流式生成流程图，使用 SSE 推送文本片段
 */
export async function generateGraphStream(
  request: FastifyRequest<{ Body: AIGenerateRequest }>,
  reply: FastifyReply
) {
  try {
    const { prompt, currentGraph, mode = 'incremental', provider: providerName, apiKey, model, baseURL, systemPrompt, rawMode, thinking, customHeaders, httpProxy } = request.body;

    if (!prompt || prompt.trim().length === 0) {
      reply.code(400);
      return {
        success: false,
        error: '请提供有效的描述',
      };
    }

    const aiProvider = createProvider({ provider: providerName, apiKey, model, baseURL, customHeaders, httpProxy });
    const effectiveSystemPrompt = systemPrompt || GRAPH_SYSTEM_PROMPT;
    const userMessage = buildUserMessage(prompt, currentGraph, mode);

    const origin = request.headers.origin || '*';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
    });

    let accumulatedText = '';
    let wasTruncated = false;
    let truncatedMessage = '';

    for await (const chunk of aiProvider.generateStream(effectiveSystemPrompt, userMessage, undefined, thinking)) {
      if (chunk.type === 'thinking') {
        reply.raw.write(`data: ${JSON.stringify({ type: 'thinking', text: chunk.content })}\n\n`);
      } else if (chunk.type === 'truncated') {
        wasTruncated = true;
        truncatedMessage = chunk.content;
        reply.raw.write(`data: ${JSON.stringify({ type: 'warning', message: chunk.content })}\n\n`);
      } else {
        accumulatedText += chunk.content;
        // 推送文本片段
        reply.raw.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk.content })}\n\n`);
      }
    }

    // rawMode 跳过 GraphDiff 解析，直接结束
    if (rawMode) {
      reply.raw.write(`data: ${JSON.stringify({ type: 'done', text: accumulatedText, truncated: wasTruncated, truncatedMessage })}\n\n`);
    } else {
      // 流结束后，尝试解析完整 JSON 并应用到图
      try {
        const diff = parseGraphDiff(accumulatedText);
        const nextGraph = applyDiffToGraph(graphState.getGraph(), diff);
        graphState.setGraph(nextGraph);
        // 不通过 WebSocket 广播，由前端 SSE 处理预览→确认流程，避免竞态

        reply.raw.write(`data: ${JSON.stringify({ type: 'done', diff, graph: nextGraph })}\n\n`);
      } catch {
        // AI 返回的是自然语言文本（非 JSON），视为对话回复
        reply.raw.write(`data: ${JSON.stringify({ type: 'done', text: accumulatedText })}\n\n`);
      }
    }

    reply.raw.end();
  } catch (error: any) {
    request.log.error({ error }, 'AI 流式生成失败');
    if (!reply.raw.headersSent) {
      reply.code(500);
      return { success: false, error: error.message || '流式生成失败' };
    }
    reply.raw.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    reply.raw.end();
  }
}
