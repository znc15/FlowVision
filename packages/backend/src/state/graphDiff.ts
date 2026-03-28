import { GraphData, GraphDiff, GraphEdge, GraphNode } from '../types/graph';

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
      return update ? { ...edge, ...update } : edge;
    });
  }

  const existingNodeIds = new Set(nodes.map((node) => node.id));
  const newNodes = diff.add.nodes.filter((node) => !existingNodeIds.has(node.id));
  nodes = [...nodes, ...newNodes];

  const existingEdgeIds = new Set(edges.map((edge) => edge.id));
  const newEdges = diff.add.edges.filter((edge) => !existingEdgeIds.has(edge.id));
  edges = [...edges, ...newEdges];

  return { ...current, nodes, edges };
}
