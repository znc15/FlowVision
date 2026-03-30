import { describe, expect, it } from 'vitest';
import { applyDiffToGraph } from './graphDiff';
import { GraphData, GraphDiff } from '../types/graph';

describe('applyDiffToGraph', () => {
  it('应用 diff 后返回包含新增节点和边的新图结构', () => {
    const current: GraphData = {
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

    const next = applyDiffToGraph(current, diff);

    expect(next.nodes.map((node) => node.id)).toEqual(['start-1', 'process-1']);
    expect(next.edges.map((edge) => edge.id)).toEqual(['edge-1']);
    expect(next.edges[0]).toMatchObject({ source: 'start-1', target: 'process-1' });
  });

  it('删除节点时级联删除关联边', () => {
    const current: GraphData = {
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
          position: { x: 120, y: 0 },
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
    };

    const diff: GraphDiff = {
      add: { nodes: [], edges: [] },
      update: { nodes: [], edges: [] },
      remove: { nodeIds: ['process-1'], edgeIds: [] },
    };

    const next = applyDiffToGraph(current, diff);

    expect(next.nodes.map((node) => node.id)).toEqual(['start-1']);
    expect(next.edges).toHaveLength(0);
  });

  it('忽略引用不存在节点的新增边', () => {
    const current: GraphData = {
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
            id: 'process-1',
            type: 'process',
            position: { x: 120, y: 0 },
            data: { label: '审批' },
          },
        ],
        edges: [
          {
            id: 'edge-valid',
            source: 'start-1',
            target: 'process-1',
            type: 'smoothstep',
          },
          {
            id: 'edge-invalid',
            source: 'missing-node',
            target: 'process-1',
            type: 'smoothstep',
          },
        ],
      },
      update: { nodes: [], edges: [] },
      remove: { nodeIds: [], edgeIds: [] },
    };

    const next = applyDiffToGraph(current, diff);

    expect(next.edges.map((edge) => edge.id)).toEqual(['edge-valid']);
  });
});
