import { graphState } from '../../state/graphState.js';
import { broadcaster } from '../../ws/broadcaster.js';

export interface AutoLayoutInput {
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  nodeSep?: number;
  rankSep?: number;
}

/** 简单分层布局（不依赖 dagre） */
export async function autoLayoutTool(input: AutoLayoutInput = {}) {
  const graph = graphState.getGraph();
  const direction = input.direction || 'TB';
  const nodeSep = input.nodeSep ?? 120;
  const rankSep = input.rankSep ?? 160;

  // 构建邻接表和入度
  const adj = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  for (const node of graph.nodes) {
    adj.set(node.id, new Set());
    inDegree.set(node.id, 0);
  }
  for (const edge of graph.edges) {
    if (adj.has(edge.source) && adj.has(edge.target)) {
      adj.get(edge.source)!.add(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }

  // 拓扑排序分层
  const layers: string[][] = [];
  const visited = new Set<string>();
  let queue: string[] = [];

  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  while (queue.length > 0) {
    layers.push([...queue]);
    for (const id of queue) visited.add(id);
    const nextQueue: string[] = [];
    for (const id of queue) {
      for (const child of adj.get(id) || []) {
        const deg = (inDegree.get(child) || 1) - 1;
        inDegree.set(child, deg);
        if (deg === 0 && !visited.has(child)) {
          nextQueue.push(child);
        }
      }
    }
    queue = nextQueue;
  }

  // 处理未访问的节点（环或孤立节点）
  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      layers.push([node.id]);
    }
  }

  // 计算位置
  const nodeWidth = 224;
  const nodeHeight = 80;

  const updatedNodes = graph.nodes.map((node) => {
    let layerIdx = -1;
    let posInLayer = -1;
    for (let l = 0; l < layers.length; l++) {
      const idx = layers[l].indexOf(node.id);
      if (idx >= 0) {
        layerIdx = l;
        posInLayer = idx;
        break;
      }
    }
    if (layerIdx < 0) return node;

    const layerSize = layers[layerIdx].length;
    const layerWidth = layerSize * nodeWidth + (layerSize - 1) * nodeSep;

    if (direction === 'LR') {
      return {
        ...node,
        position: {
          x: layerIdx * rankSep,
          y: posInLayer * (nodeHeight + nodeSep) - (layerSize - 1) * (nodeHeight + nodeSep) / 2,
        },
      };
    }

    return {
      ...node,
      position: {
        x: posInLayer * (nodeWidth + nodeSep) - (layerWidth - nodeWidth) / 2 + 60,
        y: layerIdx * (nodeHeight + rankSep) + 60,
      },
    };
  });

  const updatedGraph = { nodes: updatedNodes, edges: graph.edges, meta: graph.meta };
  graphState.setGraph(updatedGraph);
  broadcaster.broadcast({ type: 'graph:replace', payload: updatedGraph });

  return { success: true, graph: updatedGraph };
}
