// ===== 节点类型 =====
export type NodeType = 'process' | 'decision' | 'start' | 'end' | 'data' | 'group' | 'subprocess' | 'delay' | 'document' | 'manual_input' | 'annotation' | 'connector';

// ===== 节点定义 =====
export interface GraphNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;     // 节点详细说明
    filePath?: string;        // 来自代码分析时的源文件路径
    lineStart?: number;       // 源代码行号
    color?: string;           // 自定义颜色
    tags?: string[];          // 标签
  };
  width?: number;
  height?: number;
  parentId?: string;          // 属于哪个 GroupNode
}

// ===== 边定义 =====
export interface GraphEdge {
  id: string;
  source: string;             // 源节点 ID
  target: string;             // 目标节点 ID
  sourceHandle?: string;      // 源节点连接点 ID (top/bottom/left/right)
  targetHandle?: string;      // 目标节点连接点 ID (top/bottom/left/right)
  label?: string;             // 边标签（如条件分支的条件）
  type?: 'default' | 'step' | 'smoothstep' | 'straight' | 'bezier';
  animated?: boolean;         // 是否显示流动动画
  data?: {
    condition?: string;       // 判断条件文字
  };
}

// ===== 完整图结构 =====
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta?: {
    title?: string;
    description?: string;
    createdAt?: string;
    sourceProject?: string;   // 来源项目路径
    analyzeMode?: 'module' | 'function' | 'class';
  };
}

// ===== AI/MCP 操作的 Diff 结构 =====
export interface GraphDiff {
  add: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  update: {
    nodes: Partial<GraphNode>[];   // 必须包含 id
    edges: Partial<GraphEdge>[];
  };
  remove: {
    nodeIds: string[];
    edgeIds: string[];
  };
}

// ===== WebSocket 消息类型 =====
export type WsMessage =
  | { type: 'graph:diff';       payload: GraphDiff }
  | { type: 'graph:replace';    payload: GraphData }
  | { type: 'mcp:connected';    payload: { clientName: string } }
  | { type: 'analyze:progress'; payload: { phase: string; percent: number; message?: string } }
  | { type: 'error';            payload: { message: string } };

// ===== API 请求/响应类型 =====
export interface AnalyzeRequest {
  projectPath: string;
  mode: 'module' | 'function' | 'class';
  options?: {
    maxNodes?: number;
    excludePatterns?: string[];
    entryFile?: string;
  };
}

export interface AnalyzeResponse {
  success: boolean;
  data: GraphData;
  stats: {
    nodeCount: number;
    edgeCount: number;
    durationMs: number;
  };
}

export interface AIGenerateRequest {
  prompt: string;
  currentGraph?: GraphData;
  mode?: 'full' | 'incremental';
}

export interface AIGenerateResponse {
  success: boolean;
  diff: GraphDiff;
  tokensUsed: number;
}
