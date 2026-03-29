/**
 * 清理项目分析流式输出中的 markdown 围栏，便于在生成过程中直接展示。
 */
export function formatStreamingOverviewText(rawText: string, emptyMessage = '正在流式输出分析内容...'): string {
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .replace(/^\s+/, '')
    .replace(/\n+$/g, '');

  return cleaned.trim().length > 0 ? cleaned : emptyMessage;
}

/**
 * 从完整流式文本中提取最终 JSON 对象。
 */
export function extractOverviewJsonText(rawText: string): string {
  const cleaned = formatStreamingOverviewText(rawText);
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI 未返回有效 JSON');
  }
  return jsonMatch[0];
}