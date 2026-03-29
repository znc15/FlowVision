import { GraphData, GraphNode } from '../types/graph';

/** 导出所有应用数据（设置、对话、图数据）用于备份 */
export function exportBackup(graph: GraphData) {
  const backup: Record<string, any> = { _version: 1, _exportedAt: new Date().toISOString() };

  // 收集所有 flowvision 相关的 localStorage 数据
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('flowvision-')) {
      try {
        backup[key] = JSON.parse(localStorage.getItem(key)!);
      } catch {
        backup[key] = localStorage.getItem(key);
      }
    }
  }

  // 包含当前画布数据
  backup['flowvision-current-graph'] = graph;

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  triggerDownload(blob, `flowvision-backup-${new Date().toISOString().slice(0, 10)}.json`);
}

/** 从备份文件导入所有应用数据 */
export function importBackup(): Promise<{ graph?: GraphData; restored: number } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data._version) throw new Error('无效的备份文件');

        let restored = 0;
        let graph: GraphData | undefined;

        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith('_')) continue;
          if (key === 'flowvision-current-graph') {
            graph = value as GraphData;
            continue;
          }
          if (key.startsWith('flowvision-')) {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            restored++;
          }
        }
        resolve({ graph, restored });
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}

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
  subprocess: '子流程', delay: '延迟', document: '文档', manual_input: '手动输入',
  annotation: '注释', connector: '连接器',
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

/** 将完整流程图导出为 PNG 图片（包含所有节点，而非仅视口可见区域） */
export async function exportPNG(filename = 'flowvision-graph.png') {
  const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
  if (!viewport) {
    console.error('找不到 React Flow 视口元素');
    return;
  }

  const { toPng } = await import('html-to-image');

  // 获取所有节点的边界，计算完整流程图范围
  const nodeElements = viewport.querySelectorAll('.react-flow__node');
  if (nodeElements.length === 0) {
    console.error('画布上没有节点');
    return;
  }

  // 计算所有节点的包围盒（相对于 viewport）
  const vpRect = viewport.getBoundingClientRect();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodeElements.forEach((node) => {
    const rect = node.getBoundingClientRect();
    minX = Math.min(minX, rect.left - vpRect.left);
    minY = Math.min(minY, rect.top - vpRect.top);
    maxX = Math.max(maxX, rect.right - vpRect.left);
    maxY = Math.max(maxY, rect.bottom - vpRect.top);
  });

  // 添加内边距
  const padding = 60;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = maxX - minX;
  const height = maxY - minY;

  const dataUrl = await toPng(viewport, {
    backgroundColor: '#fafafa',
    quality: 1,
    pixelRatio: 2,
    width,
    height,
    style: {
      transform: `translate(${-minX}px, ${-minY}px)`,
    },
  });

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  triggerDownload(blob, filename);
}

/** 将流程图转换为系统提示词并复制到剪贴板 */
export async function exportSystemPrompt(graph: GraphData) {
  const { nodes, edges, meta } = graph;
  if (nodes.length === 0) return;

  const nodeMap = new Map<string, GraphNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const lines: string[] = [];
  const title = meta?.title || '工作流';

  lines.push(`你是一个严格按照以下流程执行任务的 AI 助手。`);
  lines.push(`请根据用户输入，遵循下方"${title}"流程进行处理。`);
  lines.push('');

  // 流程概述
  lines.push(`## 流程概述`);
  lines.push('');
  if (meta?.description) { lines.push(meta.description); lines.push(''); }
  lines.push(`本流程包含 ${nodes.length} 个步骤和 ${edges.length} 个流转关系。`);
  lines.push('');

  // 找到开始节点
  const startNodes = nodes.filter((n) => n.type === 'start');
  const endNodes = nodes.filter((n) => n.type === 'end');

  // 详细步骤
  lines.push(`## 流程步骤`);
  lines.push('');

  for (const node of nodes) {
    const typeLabel = NODE_TYPE_LABELS[node.type] || node.type;
    lines.push(`### [${typeLabel}] ${node.data.label}`);
    lines.push('');

    if (node.data.description) {
      lines.push(`说明：${node.data.description}`);
      lines.push('');
    }

    // 出边 = 后续步骤
    const outEdges = edges.filter((e) => e.source === node.id);
    if (outEdges.length > 0) {
      if (node.type === 'decision') {
        lines.push('判断逻辑：');
        for (const e of outEdges) {
          const target = nodeMap.get(e.target);
          const condition = e.label || e.data?.condition || '默认';
          lines.push(`- 如果"${condition}" → 转到「${target?.data.label || e.target}」`);
        }
      } else {
        lines.push('后续步骤：');
        for (const e of outEdges) {
          const target = nodeMap.get(e.target);
          const label = e.label || e.data?.condition;
          lines.push(`- → 「${target?.data.label || e.target}」${label ? `（${label}）` : ''}`);
        }
      }
      lines.push('');
    }
  }

  // 流程约束
  lines.push(`## 执行约束`);
  lines.push('');
  if (startNodes.length > 0) {
    lines.push(`- 流程从「${startNodes.map((n) => n.data.label).join('」或「')}」开始`);
  }
  if (endNodes.length > 0) {
    lines.push(`- 流程在「${endNodes.map((n) => n.data.label).join('」或「')}」结束`);
  }
  lines.push('- 严格按照流程步骤和判断条件执行，不跳过任何步骤');
  lines.push('- 遇到判断节点时，根据实际条件选择对应分支');
  lines.push('- 每个步骤完成后明确标注当前进度');
  lines.push('');

  const prompt = lines.join('\n');

  // 复制到剪贴板并提供下载
  try {
    await navigator.clipboard.writeText(prompt);
  } catch { /* 剪贴板不可用 */ }

  const blob = new Blob([prompt], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, `${title}-系统提示词.md`);
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
