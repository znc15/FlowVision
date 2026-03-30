import { GraphData, GraphDiff, GraphEdge, GraphNode } from '../types/graph';

/** 清理边的 null handle 属性，避免 React Flow 报错 */
function sanitizeEdge(edge: GraphEdge): GraphEdge {
  const cleaned = { ...edge };
  if ('sourceHandle' in cleaned && (cleaned.sourceHandle == null || (cleaned as any).sourceHandle === 'null')) {
    delete (cleaned as any).sourceHandle;
  }
  if ('targetHandle' in cleaned && (cleaned.targetHandle == null || (cleaned as any).targetHandle === 'null')) {
    delete (cleaned as any).targetHandle;
  }
  return cleaned;
}

function filterValidEdges(nodes: GraphNode[], edges: GraphEdge[]): GraphEdge[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  return edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge) => sanitizeEdge(edge));
}

/**
 * 在后端将 GraphDiff 应用到图结构
 * 保持与前端 graphDiff 的行为一致，但不依赖前端包
 */
export function applyDiffToGraph(current: GraphData, diff: GraphDiff): GraphData {
  let nodes: GraphNode[] = [...current.nodes];
  let edges: GraphEdge[] = [...current.edges];

  if (diff.remove.nodeIds.length > 0) {
    nodes = nodes.filter((node) => !diff.remove.nodeIds.includes(node.id));
    edges = edges.filter(
      (edge) =>
        !diff.remove.nodeIds.includes(edge.source) && !diff.remove.nodeIds.includes(edge.target)
    );
  }

  if (diff.remove.edgeIds.length > 0) {
    edges = edges.filter((edge) => !diff.remove.edgeIds.includes(edge.id));
  }

  if (diff.update.nodes.length > 0) {
    nodes = nodes.map((node) => {
      const update = diff.update.nodes.find((item) => item.id === node.id);
      return update ? { ...node, ...update } : node;
    });
  }

  if (diff.update.edges.length > 0) {
    edges = edges.map((edge) => {
      const update = diff.update.edges.find((item) => item.id === edge.id);
      return update ? sanitizeEdge({ ...edge, ...update }) : sanitizeEdge(edge);
    });
  }

  const existingNodeIds = new Set(nodes.map((node) => node.id));
  const newNodes = diff.add.nodes.filter((node) => !existingNodeIds.has(node.id));
  nodes = [...nodes, ...newNodes];

  const existingEdgeIds = new Set(edges.map((edge) => edge.id));
  const newEdges = diff.add.edges
    .filter((edge) => !existingEdgeIds.has(edge.id))
    .map(sanitizeEdge);
  edges = filterValidEdges(nodes, [...edges, ...newEdges]);

  return { ...current, nodes, edges };
}
