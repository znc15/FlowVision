import Anthropic from '@anthropic-ai/sdk';
import { collectFiles } from './collectors/fileCollector.js';
import { buildSystemPrompt, buildUserMessage } from './prompts/analyzePrompt.js';
import { applyAutoLayout } from './layout/autoLayout.js';
import type { AnalyzeOptions, GraphData } from './types.js';

/**
 * 使用 AI 分析项目代码结构，生成流程图数据
 *
 * 流程：文件收集 → 构建提示词 → Claude API 分析 → dagre 布局 → 返回 GraphData
 */
export async function analyzeProject(options: AnalyzeOptions): Promise<GraphData> {
  const { projectPath, mode, options: analyzeOpts } = options;

  // 1. 收集项目文件
  const files = await collectFiles({
    projectPath,
    maxFiles: analyzeOpts?.maxNodes ? Math.min(analyzeOpts.maxNodes, 200) : 200,
    excludePatterns: analyzeOpts?.excludePatterns,
    entryFile: analyzeOpts?.entryFile,
  });

  if (files.length === 0) {
    return {
      nodes: [],
      edges: [],
      meta: {
        sourceProject: projectPath,
        analyzeMode: mode,
        description: '未找到可分析的代码文件',
      },
    };
  }

  // 2. 构建提示词
  const systemPrompt = buildSystemPrompt(mode);
  const userMessage = buildUserMessage(files, mode, projectPath);

  // 3. 调用 Claude API 分析
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('AI 返回了非文本内容');
  }

  // 4. 解析 JSON 响应
  const rawText = content.text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');

  const graphData = JSON.parse(rawText) as GraphData;

  // 确保 meta 信息完整
  graphData.meta = {
    ...graphData.meta,
    sourceProject: projectPath,
    analyzeMode: mode,
    createdAt: new Date().toISOString(),
  };

  // 5. 计算布局坐标
  return applyAutoLayout(graphData);
}
