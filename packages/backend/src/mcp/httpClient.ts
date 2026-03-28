import { GraphData, GraphDiff } from '../types/graph.js';

const BACKEND_BASE_URL = process.env.FLOWVISION_BACKEND_URL || 'http://localhost:3001';

interface GraphResponse {
  success: boolean;
  data?: GraphData;
  error?: string;
}

interface PostGraphResponse {
  success: boolean;
  data?: GraphData;
  error?: string;
}

export async function fetchCurrentGraph(): Promise<GraphData> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/graph`);
  const result = (await response.json()) as GraphResponse;

  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.error || '获取当前图失败');
  }

  return result.data;
}

export async function replaceGraph(graph: GraphData): Promise<GraphData> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/graph`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(graph),
  });

  const result = (await response.json()) as PostGraphResponse;

  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.error || '写入图状态失败');
  }

  return result.data;
}

export function createEmptyDiff(): GraphDiff {
  return {
    add: { nodes: [], edges: [] },
    update: { nodes: [], edges: [] },
    remove: { nodeIds: [], edgeIds: [] },
  };
}
