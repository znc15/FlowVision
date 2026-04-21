// 共享类型定义 - 与前端保持一致

export type NodeType =
  // 流程图 (12)
  | 'process' | 'decision' | 'start' | 'end' | 'data' | 'group'
  | 'subprocess' | 'delay' | 'document' | 'manual_input' | 'annotation' | 'connector'
  // 流程图扩展 (4)
  | 'preparation' | 'merge' | 'timer' | 'queue'
  // ER 图 (4)
  | 'entity' | 'attribute' | 'relationship' | 'database'
  // 功能结构图 (4)
  | 'function_block' | 'input_output' | 'control' | 'mechanism'
  // 用例图 (3)
  | 'actor' | 'usecase_item' | 'system_boundary'
  // 时序图 (3)
  | 'lifeline' | 'activation' | 'combined_fragment'
  // UML 类图 (3)
  | 'class' | 'interface' | 'enum_node'
  // UML 状态图 (4)
  | 'state' | 'initial_state' | 'final_state' | 'choice'
  // UML 活动图扩展 (2)
  | 'fork_join' | 'swimlane'
  // 通用 (1)
  | 'note';

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
