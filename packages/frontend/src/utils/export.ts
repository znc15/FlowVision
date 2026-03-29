import { GraphData, GraphNode } from '../types/graph';

/** 将当前图数据导出为 JSON 文件并触发下载 */
export function exportJSON(graph: GraphData, filename = 'flowvision-graph.json') {
  const json = JSON.stringify(graph, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  triggerDownload(blob, filename);
}

/** 从 JSON 文件导入图数据 */
export function importJSON(): Promise<GraphData | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      try {
        const text = await file.text();
        const data = JSON.parse(text) as GraphData;
        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
          throw new Error('无效的图数据格式');
        }
        resolve(data);
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}

/** 节点类型中文映射 */
const NODE_TYPE_LABELS: Record<string, string> = {
  process: '流程', decision: '判断', start: '开始', end: '结束', data: '数据', group: '分组',
};

/** 将当前图数据导出为 Markdown 全景报告 */
export function exportMarkdown(graph: GraphData, filename = 'flowvision-report.md') {
  const { nodes, edges, meta } = graph;
  const title = meta?.title || '项目全景报告';
  const now = new Date().toLocaleString('zh-CN');

  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`> 由 FlowVision 生成 · ${now}`);
  if (meta?.sourceProject) lines.push(`> 项目路径: \`${meta.sourceProject}\``);
  if (meta?.description) { lines.push(''); lines.push(meta.description); }
  lines.push('');

  // 统计概览
  lines.push('## 概览');
  lines.push('');
  lines.push(`| 指标 | 数量 |`);
  lines.push(`| --- | --- |`);
  lines.push(`| 节点总数 | ${nodes.length} |`);
  lines.push(`| 连线总数 | ${edges.length} |`);
  const typeCounts: Record<string, number> = {};
  for (const n of nodes) { typeCounts[n.type] = (typeCounts[n.type] || 0) + 1; }
  for (const [type, count] of Object.entries(typeCounts)) {
    lines.push(`| ${NODE_TYPE_LABELS[type] || type} 节点 | ${count} |`);
  }
  lines.push('');

  // 节点清单
  lines.push('## 节点清单');
  lines.push('');
  const nodeMap = new Map<string, GraphNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  for (const node of nodes) {
    const typeLabel = NODE_TYPE_LABELS[node.type] || node.type;
    lines.push(`### ${node.data.label} \`[${typeLabel}]\``);
    lines.push('');
    if (node.data.description) { lines.push(node.data.description); lines.push(''); }
    if (node.data.filePath) {
      const loc = node.data.lineStart ? `${node.data.filePath}:${node.data.lineStart}` : node.data.filePath;
      lines.push(`- **源文件**: \`${loc}\``);
    }
    if (node.data.tags?.length) lines.push(`- **标签**: ${node.data.tags.join(', ')}`);

    // 出边
    const outEdges = edges.filter((e) => e.source === node.id);
    if (outEdges.length > 0) {
      lines.push(`- **调用**:`);
      for (const e of outEdges) {
        const target = nodeMap.get(e.target);
        const label = e.label || e.data?.condition || '';
        lines.push(`  - → ${target?.data.label || e.target}${label ? ` (${label})` : ''}`);
      }
    }
    lines.push('');
  }

  // 调用关系
  lines.push('## 调用关系');
  lines.push('');
  lines.push('```mermaid');
  lines.push('graph TD');
  for (const node of nodes) {
    const escaped = node.data.label.replace(/"/g, '\\"');
    lines.push(`  ${node.id}["${escaped}"]`);
  }
  for (const edge of edges) {
    const label = edge.label || edge.data?.condition;
    if (label) {
      lines.push(`  ${edge.source} -->|"${label.replace(/"/g, '\\"')}"|${edge.target}`);
    } else {
      lines.push(`  ${edge.source} --> ${edge.target}`);
    }
  }
  lines.push('```');
  lines.push('');

  const md = lines.join('\n');
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  triggerDownload(blob, filename);
}

/** 将 React Flow 视口导出为 PNG 图片 */
export async function exportPNG(filename = 'flowvision-graph.png') {
  const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
  if (!viewport) {
    console.error('找不到 React Flow 视口元素');
    return;
  }

  const { toPng } = await import('html-to-image');

  const dataUrl = await toPng(viewport, {
    backgroundColor: '#fafafa',
    quality: 1,
    pixelRatio: 2,
  });

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
