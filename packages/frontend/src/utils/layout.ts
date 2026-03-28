import dagre from 'dagre';
import { GraphData, GraphNode } from '../types/graph';

/**
 * 使用 dagre 算法自动计算节点布局
 * 仅对 position 为 {x:0, y:0} 的节点重新计算位置
 */
export function applyAutoLayout(graph: GraphData): GraphData {
  const g = new dagre.graphlib.Graph();

  // 配置布局参数
  g.setGraph({
    rankdir: 'TB', // 从上到下布局
    nodesep: 80, // 节点水平间距
    ranksep: 120, // 层级垂直间距
    marginx: 40,
    marginy: 40,
  });

  g.setDefaultEdgeLabel(() => ({}));

  // 添加节点到 dagre 图
  graph.nodes.forEach((node) => {
    g.setNode(node.id, {
      width: node.width || 224, // 默认宽度 56 * 4 = 224px (w-56)
      height: node.height || 120, // 默认高度
    });
  });

  // 添加边到 dagre 图
  graph.edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // 执行布局计算
  dagre.layout(g);

  // 更新节点位置（仅更新未设置位置的节点）
  const updatedNodes: GraphNode[] = graph.nodes.map((node) => {
    const dagreNode = g.node(node.id);

    // 如果节点已有非零位置，保持不变
    if (node.position && (node.position.x !== 0 || node.position.y !== 0)) {
      return node;
    }

    // 否则使用 dagre 计算的位置
    return {
      ...node,
      position: {
        x: dagreNode.x - (node.width || 224) / 2,
        y: dagreNode.y - (node.height || 120) / 2,
      },
    };
  });

  return {
    ...graph,
    nodes: updatedNodes,
  };
}

/**
 * 强制重新计算所有节点的布局
 * 用于"重新布局"功能
 */
export function forceRelayout(graph: GraphData): GraphData {
  // 将所有节点位置重置为 (0, 0)
  const resetGraph: GraphData = {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      position: { x: 0, y: 0 },
    })),
  };

  return applyAutoLayout(resetGraph);
}
