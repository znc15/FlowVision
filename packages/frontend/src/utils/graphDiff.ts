import { GraphData, GraphDiff, GraphEdge } from '../types/graph';
import { applyAutoLayout } from './layout';

/**
 * 清理边的 sourceHandle/targetHandle 属性
 * AI 生成的边可能带有 null 或 "null" 的 handle 引用，导致 React Flow 报错
 */
function sanitizeEdge(edge: GraphEdge): GraphEdge {
  const cleaned = { ...edge };
  if ('sourceHandle' in cleaned && (cleaned.sourceHandle == null || cleaned.sourceHandle === 'null')) {
    delete (cleaned as any).sourceHandle;
  }
  if ('targetHandle' in cleaned && (cleaned.targetHandle == null || cleaned.targetHandle === 'null')) {
    delete (cleaned as any).targetHandle;
  }
  return cleaned;
}

/**
 * 应用 GraphDiff 到当前图结构，返回新的图结构
 * 用于 AI 生成和 MCP 操作的增量更新
 */
export function applyDiff(current: GraphData, diff: GraphDiff): GraphData {
  let { nodes, edges } = current;

  // 1. 删除节点和边
  if (diff.remove.nodeIds.length > 0) {
    nodes = nodes.filter((n) => !diff.remove.nodeIds.includes(n.id));
    // 删除节点时，同时删除与之关联的所有边
    edges = edges.filter(
      (e) => !diff.remove.nodeIds.includes(e.source) && !diff.remove.nodeIds.includes(e.target)
    );
  }

  if (diff.remove.edgeIds.length > 0) {
    edges = edges.filter((e) => !diff.remove.edgeIds.includes(e.id));
  }

  // 2. 更新现有节点和边
  if (diff.update.nodes.length > 0) {
    nodes = nodes.map((n) => {
      const update = diff.update.nodes.find((u) => u.id === n.id);
      return update ? { ...n, ...update } : n;
    });
  }

  if (diff.update.edges.length > 0) {
    edges = edges.map((e) => {
      const update = diff.update.edges.find((u) => u.id === e.id);
      return update ? { ...e, ...update } : e;
    });
  }

  // 3. 新增节点和边（去重）
  const existingNodeIds = new Set(nodes.map((n) => n.id));
  const newNodes = diff.add.nodes.filter((n) => !existingNodeIds.has(n.id));
  nodes = [...nodes, ...newNodes];

  const existingEdgeIds = new Set(edges.map((e) => e.id));
  const newEdges = diff.add.edges
    .filter((e) => !existingEdgeIds.has(e.id))
    .map((e) => sanitizeEdge(e));
  edges = [...edges, ...newEdges];

  // 4. 应用自动布局（仅对新增节点计算位置）
  return applyAutoLayout({ nodes, edges });
}

/**
 * 合并两个 GraphDiff
 * 用于流式生成时累积多个 diff
 */
export function mergeDiffs(base: GraphDiff, incoming: GraphDiff): GraphDiff {
  return {
    add: {
      nodes: [...base.add.nodes, ...incoming.add.nodes],
      edges: [...base.add.edges, ...incoming.add.edges],
    },
    update: {
      nodes: [...base.update.nodes, ...incoming.update.nodes],
      edges: [...base.update.edges, ...incoming.update.edges],
    },
    remove: {
      nodeIds: [...base.remove.nodeIds, ...incoming.remove.nodeIds],
      edgeIds: [...base.remove.edgeIds, ...incoming.remove.edgeIds],
    },
  };
}

/**
 * 创建空的 GraphDiff
 */
export function createEmptyDiff(): GraphDiff {
  return {
    add: { nodes: [], edges: [] },
    update: { nodes: [], edges: [] },
    remove: { nodeIds: [], edgeIds: [] },
  };
}
