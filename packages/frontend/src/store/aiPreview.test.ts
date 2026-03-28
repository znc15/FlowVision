import { describe, expect, it } from 'vitest';
import { GraphData, GraphDiff } from '../types/graph';

function buildPreviewGraph(currentGraph: GraphData, diff: GraphDiff) {
  return {
    previewNodes: diff.add.nodes.filter(
      (node) => !currentGraph.nodes.some((currentNode) => currentNode.id === node.id)
    ),
    previewEdges: diff.add.edges.filter(
      (edge) => !currentGraph.edges.some((currentEdge) => currentEdge.id === edge.id)
    ),
  };
}

describe('AI 预览图构建', () => {
  it('只提取 diff 中新增且当前图不存在的节点与边', () => {
    const currentGraph: GraphData = {
      nodes: [
        {
          id: 'start-1',
          type: 'start',
          position: { x: 0, y: 0 },
          data: { label: '开始' },
        },
      ],
      edges: [],
    };

    const diff: GraphDiff = {
      add: {
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 0, y: 0 },
            data: { label: '开始' },
          },
          {
            id: 'process-1',
            type: 'process',
            position: { x: 0, y: 0 },
            data: { label: '审批' },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'start-1',
            target: 'process-1',
            type: 'smoothstep',
          },
        ],
      },
      update: { nodes: [], edges: [] },
      remove: { nodeIds: [], edgeIds: [] },
    };

    const preview = buildPreviewGraph(currentGraph, diff);

    expect(preview.previewNodes.map((node) => node.id)).toEqual(['process-1']);
    expect(preview.previewEdges.map((edge) => edge.id)).toEqual(['edge-1']);
  });
});
