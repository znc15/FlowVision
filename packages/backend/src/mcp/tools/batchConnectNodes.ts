import { GraphEdge } from '../../types/graph.js';
import { createEmptyDiff } from '../httpClient.js';
import { applyDiffTool } from './applyDiff.js';

export interface BatchConnectNodesInput {
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    type?: GraphEdge['type'];
    relation?: string;
  }>;
}

export async function batchConnectNodesTool(input: BatchConnectNodesInput) {
  const diff = createEmptyDiff();

  for (const edge of input.edges) {
    const edgeData: GraphEdge = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: edge.type || 'smoothstep',
    };
    if (edge.relation) {
      edgeData.data = { relation: edge.relation as GraphEdge['data'] extends { relation?: infer R } ? R : never };
    }
    diff.add.edges.push(edgeData);
  }

  return applyDiffTool(diff);
}
