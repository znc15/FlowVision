import { GraphDiff } from '../../types/graph.js';
import { applyRemoteDiff } from '../applyRemoteDiff.js';

export async function applyDiffTool(diff: GraphDiff) {
  const graph = await applyRemoteDiff(diff);
  return {
    success: true,
    graph,
  };
}
