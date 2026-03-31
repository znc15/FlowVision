import { describe, expect, it } from 'vitest';
import {
  buildFileImportContext,
  buildProjectImportContext,
  composePromptWithImports,
} from './chatContext';

describe('chatContext', () => {
  it('会把项目上下文和文件上下文拼进最终 prompt', () => {
    const prompt = composePromptWithImports('请帮我梳理调用链', {
      projectContext: '项目上下文片段',
      fileContext: '文件上下文片段',
    });

    expect(prompt).toContain('## 已导入项目上下文');
    expect(prompt).toContain('项目上下文片段');
    expect(prompt).toContain('## 已导入文件上下文');
    expect(prompt).toContain('文件上下文片段');
    expect(prompt).toContain('## 用户当前请求');
    expect(prompt).toContain('请帮我梳理调用链');
  });

  it('会把项目文件结构和关键文件内容整理成项目导入上下文', () => {
    const context = buildProjectImportContext('O:/demo', {
      allFiles: [
        { folder: 'src', files: ['index.ts', 'service.ts'] },
      ],
      keyFiles: [
        { path: 'src/index.ts', content: 'export const boot = true;' },
      ],
    });

    expect(context).toContain('项目路径：O:/demo');
    expect(context).toContain('src/index.ts');
    expect(context).toContain('service.ts');
    expect(context).toContain('export const boot = true;');
  });

  it('会把文件内容整理成文件导入上下文并保留文件路径', () => {
    const context = buildFileImportContext('src/app.ts', 'console.log("hello");');

    expect(context).toContain('文件路径：src/app.ts');
    expect(context).toContain('console.log("hello");');
  });
});