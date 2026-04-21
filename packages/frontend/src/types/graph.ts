// ===== 图表类型 =====
export type DiagramType =
  | 'flowchart'
  | 'er'
  | 'functional'
  | 'usecase'
  | 'sequence'
  | 'uml_class'
  | 'uml_activity'
  | 'uml_state';

// ===== 节点类型 =====
export type FlowNodeType = 'process' | 'decision' | 'start' | 'end' | 'data' | 'group' | 'subprocess' | 'delay' | 'document' | 'manual_input' | 'annotation' | 'connector';
export type ERNodeType = 'entity' | 'attribute' | 'relationship';
export type FunctionalNodeType = 'function_block' | 'input_output' | 'control' | 'mechanism';
export type UseCaseNodeType = 'actor' | 'usecase_item' | 'system_boundary';
export type SequenceNodeType = 'lifeline' | 'activation' | 'combined_fragment';
export type UMLClassNodeType = 'class' | 'interface' | 'enum_node';
export type UMLStateNodeType = 'state' | 'initial_state' | 'final_state' | 'choice';
export type NodeType = FlowNodeType | ERNodeType | FunctionalNodeType | UseCaseNodeType | SequenceNodeType | UMLClassNodeType | UMLStateNodeType;

// ===== 节点定义 =====
export interface GraphNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    filePath?: string;
    lineStart?: number;
    color?: string;
    tags?: string[];
    attributes?: string[];
    methods?: string[];
    stereotype?: string;
    cardinality?: string;
  };
  width?: number;
  height?: number;
  parentId?: string;
}

// ===== 边定义 =====
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  type?: 'default' | 'step' | 'smoothstep' | 'straight' | 'bezier';
  animated?: boolean;
  data?: {
    condition?: string;
    relation?: 'association' | 'include' | 'extend' | 'inheritance' | 'dependency' | 'aggregation' | 'composition' | 'message' | 'return';
    cardinalitySource?: string;
    cardinalityTarget?: string;
    sequenceOrder?: number;
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
    sourceProject?: string;
    analyzeMode?: 'module' | 'function' | 'class';
    diagramType?: DiagramType;
    templateId?: string;
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
  diagramType?: DiagramType;
}

export interface AIGenerateResponse {
  success: boolean;
  diff: GraphDiff;
  tokensUsed: number;
}
