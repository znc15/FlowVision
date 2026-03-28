import { create } from 'zustand';
import { GraphNode, GraphEdge, GraphDiff } from '../types/graph';
import { applyAutoLayout } from '../utils/layout';

interface PreviewStore {
  // 预览状态的节点和边
  previewNodes: GraphNode[];
  previewEdges: GraphEdge[];

  // 是否显示预览
  isPreviewMode: boolean;

  // 添加预览节点/边
  addPreviewNodes: (nodes: GraphNode[]) => void;
  addPreviewEdges: (edges: GraphEdge[]) => void;

  // 使用 diff 覆盖预览状态
  setPreviewFromDiff: (diff: GraphDiff, currentNodeIds?: string[], currentEdgeIds?: string[]) => void;

  // 清空预览
  clear: () => void;

  // 切换预览模式
  setPreviewMode: (enabled: boolean) => void;
}

export const usePreviewStore = create<PreviewStore>((set) => ({
  previewNodes: [],
  previewEdges: [],
  isPreviewMode: false,

  addPreviewNodes: (nodes) =>
    set((state) => ({
      previewNodes: [...state.previewNodes, ...nodes],
      isPreviewMode: true,
    })),

  addPreviewEdges: (edges) =>
    set((state) => ({
      previewEdges: [...state.previewEdges, ...edges],
      isPreviewMode: true,
    })),

  setPreviewFromDiff: (diff, currentNodeIds = [], currentEdgeIds = []) => {
    const nodeIdSet = new Set(currentNodeIds);
    const edgeIdSet = new Set(currentEdgeIds);

    const rawNodes = diff.add.nodes.filter((node) => !nodeIdSet.has(node.id));
    const rawEdges = diff.add.edges.filter((edge) => !edgeIdSet.has(edge.id));

    // 对预览节点应用自动布局，避免堆叠
    const laid = applyAutoLayout({ nodes: rawNodes, edges: rawEdges });

    set({
      previewNodes: laid.nodes,
      previewEdges: laid.edges,
      isPreviewMode: rawNodes.length > 0 || rawEdges.length > 0,
    });
  },

  clear: () =>
    set({
      previewNodes: [],
      previewEdges: [],
      isPreviewMode: false,
    }),

  setPreviewMode: (enabled) =>
    set({
      isPreviewMode: enabled,
    }),
}));
