// 分析器类型定义 — 与前端/后端 GraphData 保持一致

export type NodeType = 'process' | 'decision' | 'start' | 'end' | 'data' | 'group';

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
    analyzeMode?: AnalyzeMode;
  };
}

export type AnalyzeMode = 'module' | 'function' | 'class';

export interface AnalyzeOptions {
  projectPath: string;
  mode: AnalyzeMode;
  options?: {
    maxNodes?: number;
    excludePatterns?: string[];
    entryFile?: string;
  };
}

/** 文件收集器返回的单个文件信息 */
export interface CollectedFile {
  /** 相对于项目根目录的路径 */
  path: string;
  /** 文件内容（可能被截断） */
  content: string;
  /** 编程语言标识 */
  language: string;
}
