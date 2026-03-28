import { GraphEdge } from '../../types/graph.js';
import { createEmptyDiff } from '../httpClient.js';
import { applyDiffTool } from './applyDiff.js';

export interface ConnectNodesInput {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: GraphEdge['type'];
}

export async function connectNodesTool(input: ConnectNodesInput) {
  const diff = createEmptyDiff();
  diff.add.edges.push({
    id: input.id,
    source: input.source,
    target: input.target,
    label: input.label,
    type: input.type || 'smoothstep',
  });

  return applyDiffTool(diff);
}
