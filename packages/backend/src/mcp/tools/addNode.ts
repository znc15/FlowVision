import { GraphNode } from '../../types/graph.js';
import { createEmptyDiff } from '../httpClient.js';
import { applyDiffTool } from './applyDiff.js';

export interface AddNodeInput {
  id: string;
  type: GraphNode['type'];
  label: string;
  description?: string;
  tags?: string[];
}

export async function addNodeTool(input: AddNodeInput) {
  const diff = createEmptyDiff();
  diff.add.nodes.push({
    id: input.id,
    type: input.type,
    position: { x: 0, y: 0 },
    data: {
      label: input.label,
      description: input.description,
      tags: input.tags,
    },
  });

  return applyDiffTool(diff);
}
