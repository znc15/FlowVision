import { describe, expect, it } from 'vitest';
import { calculateExportBounds, buildExportViewportStyle, toDesktopCaptureRect } from './export';
import type { GraphNode } from '../types/graph';

describe('calculateExportBounds', () => {
  it('返回覆盖所有节点并带留白的导出范围', () => {
    const nodes: GraphNode[] = [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 20, y: 40 },
        width: 100,
        height: 80,
        data: { label: '开始' },
      },
      {
        id: 'process-1',
        type: 'process',
        position: { x: 300, y: 220 },
        width: 120,
        height: 90,
        data: { label: '处理' },
      },
    ];

    expect(calculateExportBounds(nodes, 60)).toEqual({
      x: -40,
      y: -20,
      width: 520,
      height: 390,
    });
  });

  it('在没有节点时返回 null', () => {
    expect(calculateExportBounds([], 60)).toBeNull();
  });
});

describe('buildExportViewportStyle', () => {
  it('基于导出范围生成平移样式，确保完整画布可见', () => {
    const style = buildExportViewportStyle({
      x: -40,
      y: -20,
      width: 520,
      height: 390,
    });

    expect(style).toEqual({
      width: '520px',
      height: '390px',
      transform: 'translate(40px, 20px) scale(1)',
    });
  });
});

describe('toDesktopCaptureRect', () => {
  it('将 DOM 边界转换为可用于 Electron 截图的矩形并做安全取整', () => {
    expect(
      toDesktopCaptureRect({
        left: -2.6,
        top: 18.4,
        width: 920.8,
        height: 0.2,
      }),
    ).toEqual({
      x: 0,
      y: 18,
      width: 921,
      height: 1,
    });
  });
});