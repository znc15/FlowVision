import { describe, expect, it } from 'vitest';
import { extractOverviewJsonText, formatStreamingOverviewText } from './projectOverviewStream';

describe('projectOverviewStream', () => {
  it('空文本时返回等待提示', () => {
    expect(formatStreamingOverviewText('')).toBe('正在流式输出分析内容...');
  });

  it('支持自定义空文本提示', () => {
    expect(formatStreamingOverviewText('', '正在流式输出架构图内容...')).toBe('正在流式输出架构图内容...');
  });

  it('移除 markdown 围栏并保留 JSON 文本', () => {
    expect(formatStreamingOverviewText('```json\n{\n  "name": "FlowVision"\n}\n```')).toBe('{\n  "name": "FlowVision"\n}');
  });

  it('提取完整 JSON 对象', () => {
    expect(extractOverviewJsonText('分析如下\n{\n  "name": "FlowVision"\n}')).toBe('{\n  "name": "FlowVision"\n}');
  });
});