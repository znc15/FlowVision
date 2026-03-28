import { describe, expect, it, vi, beforeEach } from 'vitest';
import path from 'node:path';

// Mock Claude API
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  };
});

import Anthropic from '@anthropic-ai/sdk';
import { analyzeProject } from './index.js';

/** module 模式的模拟 AI 响应 */
const MODULE_RESPONSE = JSON.stringify({
  nodes: [
    { id: 'main.ts', type: 'start', position: { x: 0, y: 0 }, data: { label: 'main.ts', filePath: 'main.ts' } },
    { id: 'helper.ts', type: 'process', position: { x: 0, y: 0 }, data: { label: 'helper.ts', filePath: 'helper.ts' } },
    { id: 'config.ts', type: 'data', position: { x: 0, y: 0 }, data: { label: 'config.ts', filePath: 'config.ts' } },
  ],
  edges: [
    { id: 'e-main-helper', source: 'main.ts', target: 'helper.ts', label: 'import', type: 'smoothstep' },
  ],
  meta: { title: 'simple-project', analyzeMode: 'module' },
});

/** function 模式的模拟 AI 响应 */
const FUNCTION_RESPONSE = JSON.stringify({
  nodes: [
    { id: 'run', type: 'start', position: { x: 0, y: 0 }, data: { label: 'run', filePath: 'main.ts', lineStart: 3 } },
    { id: 'helper', type: 'process', position: { x: 0, y: 0 }, data: { label: 'helper', filePath: 'helper.ts', lineStart: 1 } },
    { id: 'format', type: 'process', position: { x: 0, y: 0 }, data: { label: 'format', filePath: 'helper.ts', lineStart: 5 } },
  ],
  edges: [
    { id: 'e-run-helper', source: 'run', target: 'helper', label: '调用', type: 'smoothstep' },
  ],
  meta: { title: 'simple-project', analyzeMode: 'function' },
});

describe('analyzeProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('在 module 模式下返回文件级节点与 import 依赖边', async () => {
    // 设置 mock 返回值
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: MODULE_RESPONSE }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });
    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    }) as any);

    const fixtureDir = path.resolve('src/__fixtures__/simple-project');
    const result = await analyzeProject({
      projectPath: fixtureDir,
      mode: 'module',
      options: {},
    });

    // 验证返回了正确的节点
    expect(result.nodes.length).toBeGreaterThanOrEqual(2);
    expect(result.nodes.some((node) => node.data.label === 'main.ts')).toBe(true);
    expect(result.nodes.some((node) => node.data.label === 'helper.ts')).toBe(true);
    expect(result.edges.some((edge) => edge.source.includes('main.ts') && edge.target.includes('helper.ts'))).toBe(true);

    // 验证 dagre 布局已应用（坐标不再全为 0）
    const mainNode = result.nodes.find((n) => n.data.label === 'main.ts');
    expect(mainNode).toBeDefined();

    // 验证 meta 信息
    expect(result.meta?.analyzeMode).toBe('module');
    expect(result.meta?.sourceProject).toBe(fixtureDir);

    // 验证 Claude API 被调用
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it('在 function 模式下返回函数级节点与调用边', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: FUNCTION_RESPONSE }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });
    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    }) as any);

    const fixtureDir = path.resolve('src/__fixtures__/simple-project');
    const result = await analyzeProject({
      projectPath: fixtureDir,
      mode: 'function',
      options: {},
    });

    expect(result.nodes.some((node) => node.data.label === 'run')).toBe(true);
    expect(result.nodes.some((node) => node.data.label === 'helper')).toBe(true);
    expect(result.edges.some((edge) => edge.source.includes('run') && edge.target.includes('helper'))).toBe(true);
    expect(result.meta?.analyzeMode).toBe('function');
  });

  it('空项目返回空图', async () => {
    const mockCreate = vi.fn();
    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate },
    }) as any);

    const emptyDir = path.resolve('src/__fixtures__/empty-dir-that-does-not-exist');
    const result = await analyzeProject({
      projectPath: emptyDir,
      mode: 'module',
      options: {},
    });

    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    // 空项目不应调用 Claude API
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
