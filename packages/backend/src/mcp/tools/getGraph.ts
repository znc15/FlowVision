import { fetchCurrentGraph } from '../httpClient.js';

export async function getGraphTool() {
  const graph = await fetchCurrentGraph();
  return {
    success: true,
    graph,
  };
}
