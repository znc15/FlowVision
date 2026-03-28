import { createEmptyDiff } from '../httpClient.js';
import { applyDiffTool } from './applyDiff.js';

export async function removeNodeTool(nodeId: string) {
  const diff = createEmptyDiff();
  diff.remove.nodeIds.push(nodeId);
  return applyDiffTool(diff);
}
