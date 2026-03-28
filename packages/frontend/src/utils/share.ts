import { GraphData } from '../types/graph';

/**
 * 将图数据编码为可分享的 URL hash
 * 使用 base64 编码的 JSON（适合中小型图）
 */
export function encodeGraphToHash(graph: GraphData): string {
  const json = JSON.stringify({ nodes: graph.nodes, edges: graph.edges });
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return encoded;
}

/**
 * 从 URL hash 解码图数据
 */
export function decodeGraphFromHash(hash: string): GraphData | null {
  try {
    const json = decodeURIComponent(escape(atob(hash)));
    const data = JSON.parse(json);
    if (data && Array.isArray(data.nodes) && Array.isArray(data.edges)) {
      return data as GraphData;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 生成分享链接并复制到剪贴板
 */
export async function shareGraph(graph: GraphData): Promise<string> {
  const hash = encodeGraphToHash(graph);
  const url = `${window.location.origin}${window.location.pathname}#share=${hash}`;

  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // 降级处理
  }

  return url;
}

/**
 * 检查当前 URL 是否包含分享数据并解析
 */
export function loadSharedGraph(): GraphData | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#share=')) return null;
  const encoded = hash.slice('#share='.length);
  return decodeGraphFromHash(encoded);
}
