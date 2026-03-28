import { GraphDiff } from '../types/graph.js';
import { applyDiffToGraph } from '../state/graphDiff.js';
import { fetchCurrentGraph, replaceGraph } from './httpClient.js';

export async function applyRemoteDiff(diff: GraphDiff) {
  const currentGraph = await fetchCurrentGraph();
  const nextGraph = applyDiffToGraph(currentGraph, diff);
  await replaceGraph(nextGraph);
  return nextGraph;
}
