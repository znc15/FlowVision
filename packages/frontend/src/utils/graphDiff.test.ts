import { describe, expect, it } from 'vitest';
import { applyDiff } from './graphDiff';
import type { GraphData, GraphDiff } from '../types/graph';

describe('applyDiff', () => {
  it('忽略引用不存在节点的新增边', () => {
    const current: GraphData = {
      nodes: [
        {
          id: 'start-1',
          type: 'start',
          position: { x: 40, y: 40 },
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

    const next = applyDiff(current, diff);

    expect(next.edges.map((edge) => edge.id)).toEqual(['edge-valid']);
  });
});