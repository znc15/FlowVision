// 共享类型定义 - 与前端保持一致

export type NodeType = 'process' | 'decision' | 'start' | 'end' | 'data' | 'group' | 'subprocess' | 'delay' | 'document' | 'manual_input' | 'annotation' | 'connector';

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
  };
  width?: number;
  height?: number;
  parentId?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'default' | 'step' | 'smoothstep' | 'straight';
  animated?: boolean;
  data?: {
    condition?: string;
  };
}

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
  };
}

export interface GraphDiff {
  add: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  update: {
    nodes: Partial<GraphNode>[];
    edges: Partial<GraphEdge>[];
  };
  remove: {
    nodeIds: string[];
    edgeIds: string[];
  };
  /** AI 生成时可选指定图表类型 */
  meta?: {
    diagramType?: DiagramType;
  };
}

export type DiagramType =
  | 'flowchart'
  | 'er'
  | 'functional'
  | 'usecase'
  | 'sequence'
  | 'uml_class'
  | 'uml_activity'
  | 'uml_state';

export type WsMessage =
  | { type: 'graph:diff'; payload: GraphDiff }
  | { type: 'graph:replace'; payload: GraphData }
  | { type: 'mcp:connected'; payload: { clientName: string } }
  | { type: 'analyze:progress'; payload: { stage: string; percent: number; message: string } }
  | { type: 'error'; payload: { message: string } };
