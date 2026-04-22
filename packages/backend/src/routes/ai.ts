import { FastifyRequest, FastifyReply } from 'fastify';
import { GraphData, GraphDiff } from '../types/graph';
import { graphState } from '../state/graphState';
import { applyDiffToGraph } from '../state/graphDiff';
import { broadcaster } from '../ws/broadcaster';
import { createProvider, ProviderConfig } from './aiProvider';

// 系统 Prompt - 智能多类型图表设计助手
const GRAPH_SYSTEM_PROMPT = `你是 FlowVision 的智能图表设计助手。你的核心能力是根据用户需求**自动选择最合适的图表类型**，并生成结构清晰、可直接渲染的图表。

## 核心原则

1. **智能选图**：首先分析用户需求，选择最能清晰表达的图表类型
2. **结构完整**：节点命名清晰、边连接合法、符合该图表类型的规范
3. **增量友好**：修改时复用已有节点，避免重复创建
4. **自检验证**：输出前确保所有边的 source/target 都指向真实存在的节点

---

## 生成模式工作流程

进入生成模式时，**严格按以下步骤执行**：

1. **分析需求**：理解用户意图，提取关键信息和场景特征
2. **选择图表类型**：根据下方”图表类型选择指南”匹配最合适的 diagramType
3. **审查可用节点**：查阅该图表类型可用的节点类型列表，确认每个节点使用正确的类型名
4. **规划结构**：确定所需节点数量、类型分配、连接关系
5. **生成 JSON**：输出合法的 GraphDiff JSON，**只返回 JSON，不包含任何解释文字**

---

## 图表类型选择指南

### 1. 流程图 (flowchart) - 默认类型
**适用场景**：业务流程、算法步骤、审批流程、操作指南
**关键词**：流程、步骤、审批、处理、操作、判断、分支、循环
**可用节点**：
- \`start\` / \`end\`：开始/结束节点（椭圆形）
- \`process\`：处理步骤（矩形，支持 description, tags[]）
- \`decision\`：判断分支（菱形）
- \`data\`：数据输入/输出（平行四边形）
- \`document\`：文档输出（波浪底边矩形）
- \`subprocess\`：子流程（双边框矩形）
- \`delay\`：延迟/等待（D形）
- \`manual_input\`：手动输入（梯形）
- \`annotation\`：注释说明（左侧竖线）
- \`connector\`：连接器（小圆形，跨区域连接）
- \`group\`：分组容器（虚线边框）
- \`preparation\`：准备/预处理（六边形）
- \`merge\`：合并多个流（倒菱形）
- \`timer\`：定时器/等待事件（圆形）
- \`queue\`：队列/缓冲（堆叠平行四边形）
- \`database\`：数据库存储（圆柱体）
- \`note\`：备注说明（便签形）

### 2. ER 图 (er) - 数据模型
**适用场景**：数据库设计、实体关系、数据建模、表结构
**关键词**：实体、关系、数据库、表、字段、属性、ER、数据模型
**可用节点**：
- \`entity\`：实体/表（矩形，支持 attributes[] 如 [“id PK”, “name”, “created_at”]）
- \`attribute\`：属性/字段（椭圆，支持 cardinality 如 “PK”, “FK”）
- \`relationship\`：关系（菱形）
- \`database\`：数据库存储（圆柱体）
**边数据**：cardinalitySource, cardinalityTarget（如 “1”, “N”, “M”）

### 3. 功能结构图 (functional) - 系统分解
**适用场景**：功能分解、系统架构、模块划分、层次结构
**关键词**：功能、模块、系统、分解、层次、架构、子系统
**可用节点**：
- \`function_block\`：功能块（矩形，支持 description）
- \`input_output\`：输入/输出（平行四边形）
- \`control\`：控制信号（矩形）
- \`mechanism\`：执行机制（矩形）

### 4. 用例图 (usecase) - 需求建模
**适用场景**：需求分析、用户故事、系统功能、角色交互
**关键词**：用例、参与者、用户故事、需求、角色、场景、功能点
**可用节点**：
- \`actor\`：参与者（人形图标）
- \`usecase_item\`：用例（椭圆）
- \`system_boundary\`：系统边界（矩形框）
**边关系**：\`include\`（包含）、\`extend\`（扩展）、\`inheritance\`（继承）

### 5. 时序图 (sequence) - 交互顺序
**适用场景**：消息交互、API调用、协议流程、对象通信
**关键词**：时序、顺序、消息、交互、调用、请求、响应、生命周期
**可用节点**：
- \`lifeline\`：生命线/对象（矩形+虚线）
- \`activation\`：激活期（细长矩形）
- \`combined_fragment\`：组合片段（矩形框，label 为 alt/loop/opt/par）
**边关系**：\`message\`（消息）、\`return\`（返回）
**边数据**：sequenceOrder（消息顺序编号）

### 6. UML 类图 (uml_class) - 面向对象设计
**适用场景**：类设计、继承关系、接口定义、代码结构
**关键词**：类、接口、继承、实现、组合、聚合、依赖、UML
**可用节点**：
- \`class\`：类（三段矩形，支持 attributes[], methods[], stereotype）
- \`interface\`：接口（虚线边框三段矩形，支持 methods[]）
- \`enum_node\`：枚举（矩形，attributes[] 为枚举值）
**边关系**：\`inheritance\`、\`dependency\`、\`aggregation\`、\`composition\`

### 7. UML 活动图 (uml_activity) - 并发活动
**适用场景**：并发流程、活动状态、工作流、业务规则
**关键词**：活动、并发、同步、工作流、泳道、活动状态
**可用节点**：继承流程图节点，另有：
- \`fork_join\`：并行分叉/汇合（粗横条）
- \`swimlane\`：泳道分区（垂直容器）

### 8. UML 状态图 (uml_state) - 状态变迁
**适用场景**：对象生命周期、状态转换、事件驱动
**关键词**：状态、变迁、转换、事件、生命周期、状态机
**可用节点**：
- \`state\`：状态（圆角矩形，支持 attributes[] 表示状态变量）
- \`initial_state\`：初始状态（实心圆，无 label）
- \`final_state\`：终态（圆环+实心，无 label）
- \`choice\`：选择分支（菱形）

---

## 节点数据字段使用指南

### 通用字段
- \`label\`（必需）：节点显示名称，简洁中文，不超过 20 字符
- \`description\`（可选）：详细说明
- \`tags\`（可选）：标签数组，如 [“API”, “核心”]
- \`color\`（可选）：自定义颜色，hex 格式 “#FF6B6B”

### 类图/ER 图专用
- \`attributes\`：属性/字段数组
  - 类图：[“-id: string”, “+name: string”, “-email: string”]
  - ER 图：[“id PK”, “name”, “created_at”]
  - 枚举：[“Active”, “Inactive”, “Pending”]
- \`methods\`：方法数组（仅类图）
  - [“+getId(): string”, “-validate(): boolean”]
- \`stereotype\`：构造型（仅类图），如 “Service”, “Repository”, “DTO”
- \`cardinality\`：基数（仅 ER 图属性），如 “PK”, “FK”, “1”, “N”

---

## 边数据字段参考

### relation 关系类型（按图表类型）
- flowchart/uml_activity：\`association\`
- er：\`association\`, \`aggregation\`, \`composition\`, \`inheritance\`
- functional：\`association\`, \`dependency\`
- usecase：\`association\`, \`include\`, \`extend\`, \`inheritance\`
- sequence：\`message\`, \`return\`
- uml_class：\`association\`, \`inheritance\`, \`dependency\`, \`aggregation\`, \`composition\`

### 边附加数据
\`\`\`typescript
data: {
  condition?: string;        // 条件标签（判断分支）
  relation?: RelationType;   // 关系类型（见上）
  cardinalitySource?: string; // 源端基数（ER图）
  cardinalityTarget?: string; // 目标端基数（ER图）
  sequenceOrder?: number;    // 消息顺序（时序图）
}
\`\`\`

---

## 工作模式

**对话模式**（默认）：
- 用户描述需求、提出问题或讨论方案时，用自然语言回复
- 帮助用户理清思路，提出关键问题
- 在适当时候询问用户是否需要生成图表
- 如果需求还不清楚，优先澄清，不要过早生成 JSON

**生成模式**：
- 用户明确要求生成或修改图表时，返回 GraphDiff JSON
- 只返回合法 JSON，不包含任何解释文字或 markdown 代码块
- **必须在 meta.diagramType 中指定图表类型**

---

## 判断标准

1. **明确的生成指令**（”生成”、”画”、”创建”、”设计”）→ 进入生成模式
2. **描述需求、讨论方案、提出问题** → 自然语言回复
3. **不确定用户意图** → 自然语言回复，并询问是否需要生成图表

---

## 生成原则

### 1. 图表类型匹配
- 根据关键词和场景自动选择图表类型
- 如果用户明确指定图表类型，优先遵循
- 如果多种类型都适用，选择最能清晰表达的类型

### 2. 完整性优先
- 流程图/活动图/状态图：必须包含 start 和 end 节点
- ER图：每个实体至少有一个主键属性
- 类图：类节点应包含 attributes 和 methods 数组
- 时序图：消息边必须标注 data.sequenceOrder

### 3. 边连接规范
- 每条边的 source 和 target 都必须存在
- 边类型优先使用 smoothstep（圆角折线）
- 可设置 animated: true 显示流动动画
- 根据图表类型使用正确的 relation 类型

### 4. 节点命名规范
- id 必须唯一，使用英文和下划线
- label 使用简洁中文，不超过 20 个字符
- position 无需填写，由前端自动布局

---

## JSON 格式规则（仅生成模式）

格式必须严格符合 GraphDiff 类型定义：
\`\`\`json
{
  “add”: {
    “nodes”: [
      {
        “id”: “唯一ID”,
        “type”: “节点类型”,
        “position”: { “x”: 0, “y”: 0 },
        “data”: {
          “label”: “节点标签”,
          “description”: “节点描述（可选）”,
          “attributes”: [“属性列表（类图/ER图专用）”],
          “methods”: [“方法列表（类图专用）”],
          “stereotype”: “构造型（类图专用）”,
          “tags”: [“标签数组”]
        }
      }
    ],
    “edges”: [
      {
        “id”: “边ID”,
        “source”: “源节点ID”,
        “target”: “目标节点ID”,
        “label”: “边标签（可选）”,
        “type”: “smoothstep”,
        “animated”: false,
        “data”: {
          “relation”: “关系类型”,
          “cardinalitySource”: “1”,
          “cardinalityTarget”: “N”,
          “sequenceOrder”: 1
        }
      }
    ]
  },
  “update”: { “nodes”: [], “edges”: [] },
  “remove”: { “nodeIds”: [], “edgeIds”: [] },
  “meta”: {
    “diagramType”: “图表类型”
  }
}
\`\`\`

---

## 输出前自检清单

- [ ] 已选择合适的图表类型并设置 meta.diagramType
- [ ] add.nodes / update.nodes / remove.nodeIds 无矛盾
- [ ] 所有边的 source、target 都存在于当前图或本次 add.nodes 中
- [ ] 节点类型与图表类型匹配
- [ ] 边的 relation 类型与图表类型匹配
- [ ] 流程图/状态图有明确的起始和终止节点`;

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
  /** 最大输出 token 数 */
  maxOutputTokens?: number;
  /** 最大上下文 token 数 */
  maxContextTokens?: number;
  /** 对话历史消息（用于上下文连续性） */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
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
    const graphInfo: Record<string, unknown> = {
      nodeCount: currentGraph.nodes.length,
      edgeCount: currentGraph.edges.length,
      nodes: currentGraph.nodes.map(n => ({ id: n.id, type: n.type, label: n.data?.label })),
      edges: currentGraph.edges.map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label })),
    };
    if (currentGraph.meta?.diagramType) {
      graphInfo.diagramType = currentGraph.meta.diagramType;
    }
    return `当前图表状态：\n${JSON.stringify(graphInfo, null, 2)}\n\n用户指令：${prompt}`;
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

    const aiProvider = createProvider({ provider: providerName, apiKey, model, baseURL, customHeaders: request.body.customHeaders, httpProxy: request.body.httpProxy, maxOutputTokens: request.body.maxOutputTokens, maxContextTokens: request.body.maxContextTokens });
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
 * 流式生成流程图，使用 SSE 推送文本片段。
 * 如果模型不支持流式或流式失败，自动降级为非流式。
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

    const aiProvider = createProvider({ provider: providerName, apiKey, model, baseURL, customHeaders, httpProxy, maxOutputTokens: request.body.maxOutputTokens, maxContextTokens: request.body.maxContextTokens });
    const effectiveSystemPrompt = systemPrompt || GRAPH_SYSTEM_PROMPT;
    const userMessage = buildUserMessage(prompt, currentGraph, mode);
    const history = request.body.history;

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

    // 尝试流式生成，失败时降级为非流式
    const useStream = aiProvider.supportsStreaming();
    if (useStream) {
      try {
        for await (const chunk of aiProvider.generateStream(effectiveSystemPrompt, userMessage, undefined, thinking, history)) {
          if (chunk.type === 'thinking') {
            reply.raw.write(`data: ${JSON.stringify({ type: 'thinking', text: chunk.content })}\n\n`);
          } else if (chunk.type === 'truncated') {
            wasTruncated = true;
            truncatedMessage = chunk.content;
            reply.raw.write(`data: ${JSON.stringify({ type: 'warning', message: chunk.content })}\n\n`);
          } else {
            accumulatedText += chunk.content;
            reply.raw.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk.content })}\n\n`);
          }
        }
      } catch (streamError: any) {
        // 流式失败，降级为非流式
        request.log.warn({ error: streamError }, '流式生成失败，降级为非流式');
        reply.raw.write(`data: ${JSON.stringify({ type: 'warning', message: '流式输出不可用，已切换为非流式模式' })}\n\n`);
        const fallbackResult = await aiProvider.generate(effectiveSystemPrompt, userMessage);
        accumulatedText = fallbackResult.text;
        // 非流式一次性输出全部内容
        reply.raw.write(`data: ${JSON.stringify({ type: 'chunk', text: accumulatedText })}\n\n`);
      }
    } else {
      // 模型不支持流式，直接使用非流式
      const result = await aiProvider.generate(effectiveSystemPrompt, userMessage);
      accumulatedText = result.text;
      reply.raw.write(`data: ${JSON.stringify({ type: 'chunk', text: accumulatedText })}\n\n`);
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

        reply.raw.write(`data: ${JSON.stringify({ type: 'done', diff, graph: nextGraph })}\n\n`);
      } catch {
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
