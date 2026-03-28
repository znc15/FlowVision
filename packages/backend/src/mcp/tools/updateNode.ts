import { GraphNode } from '../../types/graph.js';
import { createEmptyDiff } from '../httpClient.js';
import { applyDiffTool } from './applyDiff.js';

export interface UpdateNodeInput {
  nodeId: string;
  label?: string;
  description?: string;
  type?: GraphNode['type'];
  color?: string;
}

export async function updateNodeTool(input: UpdateNodeInput) {
  const diff = createEmptyDiff();

  const nodeUpdate: Partial<GraphNode> & { id: string } = { id: input.nodeId };
  const dataUpdate: Partial<GraphNode['data']> = {};

  if (input.label !== undefined) dataUpdate.label = input.label;
  if (input.description !== undefined) dataUpdate.description = input.description;
  if (input.color !== undefined) dataUpdate.color = input.color;
  if (input.type !== undefined) nodeUpdate.type = input.type;

  if (Object.keys(dataUpdate).length > 0) {
    (nodeUpdate as any).data = dataUpdate;
  }

  diff.update.nodes.push(nodeUpdate);

  return applyDiffTool(diff);
}
