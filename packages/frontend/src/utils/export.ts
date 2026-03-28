import { GraphData } from '../types/graph';

/** 将当前图数据导出为 JSON 文件并触发下载 */
export function exportJSON(graph: GraphData, filename = 'flowvision-graph.json') {
  const json = JSON.stringify(graph, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
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
