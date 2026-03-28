import { describe, expect, it } from 'vitest';
import { applyDiffToGraph } from '../state/graphDiff.js';
import { GraphData, GraphDiff, GraphNode } from '../types/graph.js';

function buildAddNodeDiff(node: GraphNode): GraphDiff {
  return {
    add: { nodes: [node], edges: [] },
    update: { nodes: [], edges: [] },
    remove: { nodeIds: [], edgeIds: [] },
  };
}

describe('MCP 工具辅助逻辑', () => {
  it('add_node 通过最小 diff 生成包含新节点的整图', () => {
    const current: GraphData = { nodes: [], edges: [] };
    const node: GraphNode = {
      id: 'process-1',
      type: 'process',
      position: { x: 0, y: 0 },
      data: { label: '审批' },
    };

    const next = applyDiffToGraph(current, buildAddNodeDiff(node));

    expect(next.nodes).toHaveLength(1);
    expect(next.nodes[0]).toMatchObject({ id: 'process-1', type: 'process' });
  });

  it('connect_nodes 通过最小 diff 生成包含新边的整图', () => {
    const current: GraphData = {
      nodes: [
        { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: { label: '开始' } },
        { id: 'end-1', type: 'end', position: { x: 100, y: 0 }, data: { label: '结束' } },
      ],
      edges: [],
    };

    const diff: GraphDiff = {
      add: {
        nodes: [],
        edges: [
          {
            id: 'edge-1',
            source: 'start-1',
            target: 'end-1',
            type: 'smoothstep',
          },
        ],
      },
      update: { nodes: [], edges: [] },
      remove: { nodeIds: [], edgeIds: [] },
    };

    const next = applyDiffToGraph(current, diff);

    expect(next.edges).toHaveLength(1);
    expect(next.edges[0]).toMatchObject({ source: 'start-1', target: 'end-1' });
  });
});
