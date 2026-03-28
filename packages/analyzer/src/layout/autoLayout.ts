import dagre from 'dagre';
import type { GraphData, GraphNode } from '../types.js';

/**
 * 使用 dagre 算法计算节点布局坐标
 *
 * 所有节点的 position 将被重新计算（分析器输出的节点 position 全为 0,0）。
 */
export function applyAutoLayout(graph: GraphData): GraphData {
  const g = new dagre.graphlib.Graph();

  g.setGraph({
    rankdir: 'TB',
    nodesep: 80,
    ranksep: 120,
    marginx: 40,
    marginy: 40,
  });

  g.setDefaultEdgeLabel(() => ({}));

  for (const node of graph.nodes) {
    g.setNode(node.id, {
      width: node.width ?? 224,
      height: node.height ?? 120,
    });
  }

  for (const edge of graph.edges) {
    // 只添加两端节点都存在的边
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  const updatedNodes: GraphNode[] = graph.nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;

    return {
      ...node,
      position: {
        x: dagreNode.x - (node.width ?? 224) / 2,
        y: dagreNode.y - (node.height ?? 120) / 2,
      },
    };
  });

  return { ...graph, nodes: updatedNodes };
}
