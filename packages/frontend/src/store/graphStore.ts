import { create } from 'zustand';
import { GraphNode, GraphEdge, GraphData, GraphDiff, DiagramType } from '../types/graph';
import { applyDiff } from '../utils/graphDiff';
import { applyAutoLayout } from '../utils/layout';

/** 清理边的 null handle 属性，避免 React Flow 报错 */
function cleanEdge(edge: GraphEdge): GraphEdge {
  const cleaned = { ...edge };
  if ('sourceHandle' in cleaned && (cleaned.sourceHandle == null || cleaned.sourceHandle === 'null')) {
    delete (cleaned as any).sourceHandle;
  }
  if ('targetHandle' in cleaned && (cleaned.targetHandle == null || cleaned.targetHandle === 'null')) {
    delete (cleaned as any).targetHandle;
  }
  return cleaned;
}

interface GraphStore {
  nodes: GraphNode[];
  edges: GraphEdge[];
  diagramType: DiagramType;

  addNode: (node: GraphNode) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, data: Partial<GraphNode>) => void;
  addEdge: (edge: GraphEdge) => void;
  removeEdge: (edgeId: string) => void;

  applyDiff: (diff: GraphDiff) => void;
  replaceGraph: (graph: GraphData) => void;
  setDiagramType: (type: DiagramType) => void;

  clear: () => void;
}

export const useGraphStore = create<GraphStore>((set) => ({
  nodes: [],
  edges: [],
  diagramType: 'flowchart',

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
      edges: [...state.edges, cleanEdge(edge)],
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
      const sanitizedEdges = graph.edges.map(cleanEdge);
      const hasUnpositioned = graph.nodes.some(
        (n) => !n.position || (n.position.x === 0 && n.position.y === 0)
      );
      if (hasUnpositioned && graph.nodes.length > 0) {
        const laid = applyAutoLayout({ nodes: graph.nodes, edges: sanitizedEdges });
        return {
          nodes: laid.nodes,
          edges: laid.edges,
          diagramType: graph.meta?.diagramType ?? 'flowchart',
        };
      }
      return {
        nodes: graph.nodes,
        edges: sanitizedEdges,
        diagramType: graph.meta?.diagramType ?? 'flowchart',
      };
    }),

  setDiagramType: (type) =>
    set({ diagramType: type }),

  clear: () =>
    set({
      nodes: [],
      edges: [],
    }),
}));
