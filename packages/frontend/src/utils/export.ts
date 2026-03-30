import { GraphData, GraphNode } from '../types/graph';
import { getExportFontEmbedCss } from './exportFonts';
import { getNodesBounds, type Node as ReactFlowNode } from '@xyflow/react';
import { useToastStore } from '../store/toastStore';

export interface ExportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesktopCaptureRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type ExportableNode = Pick<GraphNode, 'id' | 'position' | 'width' | 'height'> | Pick<ReactFlowNode, 'id' | 'position' | 'width' | 'height'>;

const DEFAULT_EXPORT_NODE_WIDTH = 224;
const DEFAULT_EXPORT_NODE_HEIGHT = 120;
const EXPORT_FONT_EMBED_TIMEOUT_MS = 4000;
const EXPORT_RENDER_TIMEOUT_MS = 12000;

function normalizeExportNode(node: ExportableNode): ReactFlowNode {
  return {
    id: node.id,
    position: node.position,
    data: {},
    width: node.width ?? DEFAULT_EXPORT_NODE_WIDTH,
    height: node.height ?? DEFAULT_EXPORT_NODE_HEIGHT,
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function calculateExportBounds(nodes: ExportableNode[], padding = 60): ExportBounds | null {
  if (nodes.length === 0) {
    return null;
  }

  const bounds = getNodesBounds(nodes.map(normalizeExportNode));

  return {
    x: Math.floor(bounds.x - padding),
    y: Math.floor(bounds.y - padding),
    width: Math.ceil(bounds.width + padding * 2),
    height: Math.ceil(bounds.height + padding * 2),
  };
}

export function buildExportViewportStyle(bounds: ExportBounds) {
  return {
    width: `${Math.ceil(bounds.width)}px`,
    height: `${Math.ceil(bounds.height)}px`,
    transform: `translate(${Math.round(-bounds.x)}px, ${Math.round(-bounds.y)}px) scale(1)`,
  };
}

export function toDesktopCaptureRect(rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>): DesktopCaptureRect {
  return {
    x: Math.max(0, Math.round(rect.left)),
    y: Math.max(0, Math.round(rect.top)),
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
  };
}

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

/** 生成备份数据 JSON 字符串 */
export function createBackupData(graph: GraphData): string {
  const backup: Record<string, any> = { _version: 1, _exportedAt: new Date().toISOString() };

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

  backup['flowvision-current-graph'] = graph;
  return JSON.stringify(backup, null, 2);
}

/** 将备份上传到 WebDAV 服务器 */
export async function backupToWebDAV(
  graph: GraphData,
  config: { url: string; username: string; password: string; path?: string },
): Promise<{ success: boolean; message: string }> {
  const json = createBackupData(graph);
  const filename = config.path || `/flowvision-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const fullUrl = config.url.replace(/\/+$/, '') + filename;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.username) {
    headers['Authorization'] = 'Basic ' + btoa(`${config.username}:${config.password}`);
  }

  const res = await fetch(fullUrl, { method: 'PUT', headers, body: json });
  if (res.ok || res.status === 201 || res.status === 204) {
    return { success: true, message: `备份已上传到 ${filename}` };
  }
  return { success: false, message: `上传失败：${res.status} ${res.statusText}` };
}

/** 从 WebDAV 服务器恢复备份 */
export async function restoreFromWebDAV(
  config: { url: string; username: string; password: string; path?: string },
): Promise<{ graph?: GraphData; restored: number } | null> {
  const filename = config.path || '/flowvision-backup-latest.json';
  const fullUrl = config.url.replace(/\/+$/, '') + filename;

  const headers: Record<string, string> = {};
  if (config.username) {
    headers['Authorization'] = 'Basic ' + btoa(`${config.username}:${config.password}`);
  }

  const res = await fetch(fullUrl, { method: 'GET', headers });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data._version) return null;

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

  return { graph, restored };
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

/** 仅导出 AI 对话记录 */
export function exportChatHistory() {
  const raw = localStorage.getItem('flowvision-chat-conversations');
  const data = raw ? JSON.parse(raw) : [];
  const json = JSON.stringify({ _type: 'chat-history', _exportedAt: new Date().toISOString(), conversations: data }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  triggerDownload(blob, `flowvision-chat-${new Date().toISOString().slice(0, 10)}.json`);
}

/** 仅导出应用设置 */
export function exportSettings() {
  const raw = localStorage.getItem('flowvision-settings');
  const data = raw ? JSON.parse(raw) : {};
  const json = JSON.stringify({ _type: 'settings', _exportedAt: new Date().toISOString(), settings: data }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  triggerDownload(blob, `flowvision-settings-${new Date().toISOString().slice(0, 10)}.json`);
}

/** 导出画布标签数据（包含所有标签页的图数据） */
export function exportCanvasTabs() {
  const raw = localStorage.getItem('flowvision-tabs');
  const data = raw ? JSON.parse(raw) : { tabs: [], activeTabId: '' };
  const json = JSON.stringify({ _type: 'canvas-tabs', _exportedAt: new Date().toISOString(), ...data }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  triggerDownload(blob, `flowvision-tabs-${new Date().toISOString().slice(0, 10)}.json`);
}

/** 导出 Agent 日志（纯文本格式） */
export function exportLogs(entries: Array<{ timestamp: number; level: string; source: string; message: string; detail?: string }>) {
  const lines = entries.map((e) => {
    const time = new Date(e.timestamp).toLocaleString('zh-CN');
    const base = `[${time}] [${e.level.toUpperCase()}] [${e.source}] ${e.message}`;
    return e.detail ? `${base}\n  详情: ${e.detail}` : base;
  });
  const text = lines.join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, `flowvision-logs-${new Date().toISOString().slice(0, 10)}.txt`);
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
export async function exportPNG(nodes: ExportableNode[], filename = 'flowvision-graph.png') {
  const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
  if (!viewport) {
    console.error('找不到 React Flow 视口元素');
    return;
  }

  const bounds = calculateExportBounds(nodes);
  if (!bounds) {
    console.error('画布上没有节点');
    return;
  }

  // 始终使用 html-to-image 渲染流程图节点（而非桌面端 capturePage 截屏，后者会包含 UI 元素）
  const { toPng } = await import('html-to-image');
  const viewportStyle = buildExportViewportStyle(bounds);

  document.body.classList.add('flowvision-exporting');

  const exportOptions = {
    backgroundColor: '#fafafa',
    quality: 1,
    pixelRatio: 2,
    width: bounds.width,
    height: bounds.height,
    style: viewportStyle,
  };

  let fontEmbedCSS = '';
  try {
    fontEmbedCSS = await withTimeout(
      getExportFontEmbedCss(),
      EXPORT_FONT_EMBED_TIMEOUT_MS,
      '加载导出字体超时',
    );
  } catch (error) {
    console.warn('加载导出字体超时，导出将回退为默认字体。', error);
  }

  let dataUrl: string;

  if (fontEmbedCSS) {
    try {
      dataUrl = await withTimeout(
        toPng(viewport, {
          ...exportOptions,
          fontEmbedCSS,
          preferredFontFormat: 'woff2',
        }),
        EXPORT_RENDER_TIMEOUT_MS,
        '高保真 PNG 导出超时',
      );
    } catch (error) {
      console.warn('高保真 PNG 导出失败，改用无字体嵌入回退。', error);
      dataUrl = await withTimeout(
        toPng(viewport, {
          ...exportOptions,
          skipFonts: true,
        }),
        EXPORT_RENDER_TIMEOUT_MS,
        '回退模式 PNG 导出超时',
      );
    }
  } else {
    dataUrl = await withTimeout(
      toPng(viewport, {
        ...exportOptions,
        skipFonts: true,
      }),
      EXPORT_RENDER_TIMEOUT_MS,
      'PNG 导出超时',
    );
  }

  document.body.classList.remove('flowvision-exporting');
  triggerDataUrlDownload(dataUrl, filename);
  useToastStore.getState().show(`已导出 PNG: ${filename}`);
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
  triggerDataUrlDownload(url, filename);
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
  useToastStore.getState().show(`已下载: ${filename}`);
}

function triggerDataUrlDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
