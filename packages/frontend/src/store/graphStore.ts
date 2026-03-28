import { create } from 'zustand';
import { GraphNode, GraphEdge, GraphData, GraphDiff } from '../types/graph';
import { applyDiff } from '../utils/graphDiff';
import { applyAutoLayout } from '../utils/layout';

interface GraphStore {
  // 状态
  nodes: GraphNode[];
  edges: GraphEdge[];

  // 基础 CRUD
  addNode: (node: GraphNode) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, data: Partial<GraphNode>) => void;
  addEdge: (edge: GraphEdge) => void;
  removeEdge: (edgeId: string) => void;

  // 批量操作（来自 AI 或 MCP）
  applyDiff: (diff: GraphDiff) => void;
  replaceGraph: (graph: GraphData) => void;

  // 清空画布
  clear: () => void;
}

export const useGraphStore = create<GraphStore>((set) => ({
  nodes: [],
  edges: [],

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),

  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    })),

  updateNode: (nodeId, data) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, ...data } : n)),
    })),

  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
    })),

  removeEdge: (edgeId) =>
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
    })),

  applyDiff: (diff) =>
    set((state) => {
      const currentGraph = { nodes: state.nodes, edges: state.edges };
      const newGraph = applyDiff(currentGraph, diff);
      return newGraph;
    }),

  replaceGraph: (graph) =>
    set(() => {
      // 对位于原点(0,0)的节点自动计算布局
      const hasUnpositioned = graph.nodes.some(
        (n) => !n.position || (n.position.x === 0 && n.position.y === 0)
      );
      if (hasUnpositioned && graph.nodes.length > 0) {
        const laid = applyAutoLayout(graph);
        return { nodes: laid.nodes, edges: laid.edges };
      }
      return { nodes: graph.nodes, edges: graph.edges };
    }),

  clear: () =>
    set({
      nodes: [],
      edges: [],
    }),
}));
