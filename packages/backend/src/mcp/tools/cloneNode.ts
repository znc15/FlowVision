import { graphState } from '../../state/graphState.js';
import { createEmptyDiff } from '../httpClient.js';
import { applyDiffTool } from './applyDiff.js';

export interface CloneNodeInput {
  nodeId: string;
  newId?: string;
  offsetX?: number;
  offsetY?: number;
}

export async function cloneNodeTool(input: CloneNodeInput) {
  const graph = graphState.getGraph();
  const node = graph.nodes.find((n) => n.id === input.nodeId);

  if (!node) {
    throw new Error(`节点不存在: ${input.nodeId}`);
  }

  const newId = input.newId || `${input.nodeId}_copy_${Date.now()}`;
  const offsetX = input.offsetX ?? 50;
  const offsetY = input.offsetY ?? 50;

  const diff = createEmptyDiff();
  diff.add.nodes.push({
    ...node,
    id: newId,
    position: {
      x: node.position.x + offsetX,
      y: node.position.y + offsetY,
    },
  });

  return applyDiffTool(diff);
}
