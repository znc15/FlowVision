interface ProjectFileGroup {
  folder: string;
  files: string[];
}

interface ProjectKeyFile {
  path: string;
  content: string;
}

export interface ProjectImportPayload {
  allFiles?: ProjectFileGroup[];
  keyFiles?: ProjectKeyFile[];
}

interface PromptImportOptions {
  projectContext?: string;
  fileContext?: string;
  searchContext?: string;
}

const PROJECT_CONTEXT_LIMIT = 12000;
const FILE_CONTEXT_LIMIT = 9000;
const KEY_FILE_SNIPPET_LIMIT = 2200;

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n...[已截断 ${text.length - maxChars} 字]`;
}

export function buildProjectImportContext(projectPath: string, payload: ProjectImportPayload): string {
  const sections: string[] = [`项目路径：${projectPath}`];

  if (payload.allFiles && payload.allFiles.length > 0) {
    sections.push(
      `项目文件结构：\n${payload.allFiles
        .map((group) => `📁 ${group.folder}/\n${group.files.map((file) => `  - ${file}`).join('\n')}`)
        .join('\n')}`,
    );
  }

  if (payload.keyFiles && payload.keyFiles.length > 0) {
    sections.push(
      `关键文件内容：\n${payload.keyFiles
        .map((file) => `--- ${file.path} ---\n${truncateText(file.content, KEY_FILE_SNIPPET_LIMIT)}`)
        .join('\n\n')}`,
    );
  }

  return truncateText(sections.join('\n\n'), PROJECT_CONTEXT_LIMIT);
}

export function buildFileImportContext(filePath: string, content: string): string {
  return truncateText(`文件路径：${filePath}\n\n文件内容：\n${content}`, FILE_CONTEXT_LIMIT);
}

export function composePromptWithImports(userPrompt: string, options: PromptImportOptions = {}): string {
  const sections: string[] = [];

  if (options.projectContext) {
    sections.push(`## 已导入项目上下文\n${options.projectContext}`);
  }

  if (options.fileContext) {
    sections.push(`## 已导入文件上下文\n${options.fileContext}`);
  }

  if (options.searchContext) {
    sections.push(options.searchContext);
  }

  if (sections.length === 0) {
    return userPrompt.trim();
  }

  sections.push(`## 用户当前请求\n${userPrompt.trim()}`);

  return `以下上下文由用户主动导入，请优先结合这些信息回答或生成流程图。\n\n${sections.join('\n\n')}`;
}