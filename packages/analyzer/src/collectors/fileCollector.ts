import fg from 'fast-glob';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CollectedFile } from '../types.js';

/** 单文件大小上限 100KB */
const MAX_FILE_SIZE = 100 * 1024;

/** 默认排除的目录和文件模式 */
const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/coverage/**',
  '**/*.min.js',
  '**/*.min.css',
  '**/package-lock.json',
  '**/pnpm-lock.yaml',
  '**/yarn.lock',
  '**/*.png',
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.gif',
  '**/*.svg',
  '**/*.ico',
  '**/*.woff',
  '**/*.woff2',
  '**/*.ttf',
  '**/*.eot',
  '**/*.mp3',
  '**/*.mp4',
  '**/*.zip',
  '**/*.tar',
  '**/*.gz',
];

/** 支持的代码文件扩展名 → 语言映射 */
const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.rb': 'ruby',
  '.php': 'php',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.md': 'markdown',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.html': 'html',
  '.sql': 'sql',
  '.sh': 'shell',
  '.bash': 'shell',
  '.ps1': 'powershell',
};

/** 代码文件扩展名列表（用于 glob 匹配） */
const CODE_EXTENSIONS = Object.keys(EXTENSION_LANGUAGE_MAP)
  .map((ext) => ext.slice(1))
  .join(',');

function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_LANGUAGE_MAP[ext] ?? 'text';
}

export interface CollectOptions {
  projectPath: string;
  maxFiles?: number;
  excludePatterns?: string[];
  entryFile?: string;
}

/**
 * 收集项目中的代码文件
 *
 * 遍历指定目录，排除二进制和无关文件，返回代码文件列表
 * （含相对路径、内容、语言标识）。
 */
export async function collectFiles(options: CollectOptions): Promise<CollectedFile[]> {
  const {
    projectPath,
    maxFiles = 200,
    excludePatterns = [],
    entryFile,
  } = options;

  const ignore = [...DEFAULT_EXCLUDE, ...excludePatterns];

  // 如果指定了入口文件，优先收集入口文件所在目录附近的文件
  const pattern = `**/*.{${CODE_EXTENSIONS}}`;

  const paths = await fg(pattern, {
    cwd: projectPath,
    ignore,
    absolute: false,
    onlyFiles: true,
    dot: false,
  });

  // 如果指定了入口文件，将其排在最前
  if (entryFile) {
    const normalizedEntry = entryFile.replace(/\\/g, '/');
    const idx = paths.indexOf(normalizedEntry);
    if (idx > 0) {
      paths.splice(idx, 1);
      paths.unshift(normalizedEntry);
    }
  }

  // 限制文件数量
  const selectedPaths = paths.slice(0, maxFiles);

  const files: CollectedFile[] = [];

  for (const relativePath of selectedPaths) {
    const absolutePath = path.join(projectPath, relativePath);
    try {
      const raw = await readFile(absolutePath, 'utf-8');
      const content = raw.length > MAX_FILE_SIZE
        ? raw.slice(0, MAX_FILE_SIZE) + '\n// ... 文件已截断（超过 100KB）'
        : raw;

      files.push({
        path: relativePath.replace(/\\/g, '/'),
        content,
        language: detectLanguage(relativePath),
      });
    } catch {
      // 跳过无法读取的文件
    }
  }

  return files;
}
