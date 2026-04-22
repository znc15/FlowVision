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

/** 延迟导入 tabStore 避免循环依赖 */
let _getTabStore: (() => any) | null = null;
function getTabStore() {
  if (!_getTabStore) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./tabStore');
    _getTabStore = () => mod.useTabStore.getState();
  }
  return _getTabStore();
}

/** 持久化当前画布到 tabStore */
function persistToTabs(nodes: GraphNode[], edges: GraphEdge[], diagramType: DiagramType) {
  try {
    const tabStore = getTabStore();
    tabStore.saveTabGraph(tabStore.activeTabId, { nodes, edges, meta: { diagramType } });
  } catch {
    // tabStore 尚未初始化，忽略
  }
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

  /** 从 tabStore 恢复当前标签页的图数据 */
  restoreFromActiveTab: () => void;

  clear: () => void;
}

export const useGraphStore = create<GraphStore>((set, get) => {
  return {
    nodes: [],
    edges: [],
    diagramType: 'flowchart',

    addNode: (node) =>
      set((state) => {
        const nodes = [...state.nodes, node];
        persistToTabs(nodes, state.edges, state.diagramType);
        return { nodes };
      }),

    removeNode: (nodeId) =>
      set((state) => {
        const nodes = state.nodes.filter((n) => n.id !== nodeId);
        const edges = state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
        persistToTabs(nodes, edges, state.diagramType);
        return { nodes, edges };
      }),

    updateNode: (nodeId, data) =>
      set((state) => {
        const nodes = state.nodes.map((n) => (n.id === nodeId ? { ...n, ...data } : n));
        persistToTabs(nodes, state.edges, state.diagramType);
        return { nodes };
      }),

    addEdge: (edge) =>
      set((state) => {
        const edges = [...state.edges, cleanEdge(edge)];
        persistToTabs(state.nodes, edges, state.diagramType);
        return { edges };
      }),

    removeEdge: (edgeId) =>
      set((state) => {
        const edges = state.edges.filter((e) => e.id !== edgeId);
        persistToTabs(state.nodes, edges, state.diagramType);
        return { edges };
      }),

    applyDiff: (diff) =>
      set((state) => {
        const currentGraph = { nodes: state.nodes, edges: state.edges };
        const newGraph = applyDiff(currentGraph, diff);
        persistToTabs(newGraph.nodes, newGraph.edges, state.diagramType);
        return newGraph;
      }),

    replaceGraph: (graph) =>
      set(() => {
        const sanitizedEdges = graph.edges.map(cleanEdge);
        const hasUnpositioned = graph.nodes.some(
          (n) => !n.position || (n.position.x === 0 && n.position.y === 0)
        );
        let result: { nodes: GraphNode[]; edges: GraphEdge[]; diagramType: DiagramType };
        if (hasUnpositioned && graph.nodes.length > 0) {
          const laid = applyAutoLayout({ nodes: graph.nodes, edges: sanitizedEdges });
          result = {
            nodes: laid.nodes,
            edges: laid.edges,
            diagramType: graph.meta?.diagramType ?? 'flowchart',
          };
        } else {
          result = {
            nodes: graph.nodes,
            edges: sanitizedEdges,
            diagramType: graph.meta?.diagramType ?? 'flowchart',
          };
        }
        persistToTabs(result.nodes, result.edges, result.diagramType);
        return result;
      }),

    setDiagramType: (type) =>
      set((state) => {
        persistToTabs(state.nodes, state.edges, type);
        return { diagramType: type };
      }),

    restoreFromActiveTab: () => {
      try {
        const tabStore = getTabStore();
        const activeTab = tabStore.tabs.find((t: any) => t.id === tabStore.activeTabId);
        if (activeTab?.graph) {
          const sanitizedEdges = activeTab.graph.edges.map(cleanEdge);
          const diagramType = activeTab.graph.meta?.diagramType || 'flowchart';
          set({
            nodes: activeTab.graph.nodes,
            edges: sanitizedEdges,
            diagramType,
          });
        }
      } catch {
        // tabStore 尚未初始化
      }
    },

    clear: () =>
      set(() => {
        persistToTabs([], [], get().diagramType);
        return { nodes: [], edges: [] };
      }),
  };
});
