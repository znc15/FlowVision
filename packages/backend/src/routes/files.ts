import { FastifyRequest, FastifyReply } from 'fastify';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname, parse as parsePath } from 'node:path';
import { homedir, platform } from 'node:os';
import { execSync } from 'node:child_process';

/** 排除的目录和文件 */
const EXCLUDE = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
  '.DS_Store', 'Thumbs.db', '__pycache__', '.pytest_cache',
  '.venv', 'venv', '.idea', '.vscode',
]);

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
}

/** 递归构建文件树（限制深度防止性能问题） */
function buildTree(absPath: string, basePath: string, depth = 0, maxDepth = 6): FileTreeNode[] {
  if (depth > maxDepth) return [];

  const entries = readdirSync(absPath, { withFileTypes: true })
    .filter((e) => !EXCLUDE.has(e.name) && !e.name.startsWith('.'))
    .sort((a, b) => {
      // 文件夹在前
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return entries.map((entry) => {
    const fullPath = join(absPath, entry.name);
    const relPath = relative(basePath, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      return {
        name: entry.name,
        path: relPath,
        type: 'folder' as const,
        children: buildTree(fullPath, basePath, depth + 1, maxDepth),
      };
    }
    return {
      name: entry.name,
      path: relPath,
      type: 'file' as const,
    };
  });
}

/** GET /api/files?projectPath=... */
export async function listFiles(
  request: FastifyRequest<{ Querystring: { projectPath?: string } }>,
  reply: FastifyReply,
) {
  const projectPath = request.query.projectPath;
  if (!projectPath) {
    reply.code(400);
    return { success: false, error: '缺少 projectPath 参数' };
  }

  try {
    statSync(projectPath);
  } catch {
    reply.code(404);
    return { success: false, error: '目录不存在' };
  }

  const tree = buildTree(projectPath, projectPath);
  return { success: true, data: tree };
}

/** GET /api/file-content?projectPath=...&filePath=... */
export async function readFileContent(
  request: FastifyRequest<{ Querystring: { projectPath?: string; filePath?: string } }>,
  reply: FastifyReply,
) {
  const { projectPath, filePath } = request.query;
  if (!projectPath || !filePath) {
    reply.code(400);
    return { success: false, error: '缺少 projectPath 或 filePath 参数' };
  }

  // GitHub 仓库路径：通过 GitHub API 获取文件内容
  if (projectPath.startsWith('github:')) {
    const token = (request.query as Record<string, string>).token;
    return readGithubFileContent(projectPath, filePath, reply, token);
  }

  const absPath = join(projectPath, filePath);

  // 防止路径遍历
  if (!absPath.startsWith(projectPath)) {
    reply.code(403);
    return { success: false, error: '禁止访问项目目录外的文件' };
  }

  try {
    const stat = statSync(absPath);
    if (!stat.isFile()) {
      reply.code(400);
      return { success: false, error: '路径不是文件' };
    }
    if (stat.size > 1024 * 512) {
      reply.code(413);
      return { success: false, error: '文件过大（>512KB）' };
    }
    const content = readFileSync(absPath, 'utf-8');
    return { success: true, data: { content, size: stat.size } };
  } catch {
    reply.code(404);
    return { success: false, error: '文件不存在' };
  }
}

/** 通过 GitHub API 读取文件内容 */
async function readGithubFileContent(projectPath: string, filePath: string, reply: FastifyReply, token?: string) {
  const repo = projectPath.replace('github:', '');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    reply.code(400);
    return { success: false, error: '无效的 GitHub 仓库路径' };
  }

  const [owner, repoName] = repo.split('/');
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'FlowVision',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/contents/${encodeURIComponent(filePath)}`,
      { headers },
    );

    if (response.status === 403) {
      reply.code(429);
      return { success: false, error: 'GitHub API 请求频率限制，请稍后重试' };
    }

    if (!response.ok) {
      reply.code(404);
      return { success: false, error: '文件不存在或无法访问' };
    }

    const data = await response.json() as { content?: string; size?: number; encoding?: string };
    if (!data.content || data.encoding !== 'base64') {
      reply.code(400);
      return { success: false, error: '无法读取文件内容（可能是目录或过大文件）' };
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return { success: true, data: { content, size: data.size || content.length } };
  } catch {
    reply.code(500);
    return { success: false, error: '获取 GitHub 文件失败' };
  }
}

/** 关键文件名，用于 AI 分析时自动读取 */
const KEY_FILES = new Set([
  'package.json', 'README.md', 'readme.md', 'README.MD',
  'tsconfig.json', 'vite.config.ts', 'vite.config.js',
  'next.config.js', 'next.config.mjs', 'next.config.ts',
  'webpack.config.js', 'rollup.config.js',
  '.env.example', 'Cargo.toml', 'go.mod', 'pom.xml',
  'requirements.txt', 'pyproject.toml', 'Dockerfile',
  'docker-compose.yml', 'docker-compose.yaml',
]);

/** 代码文件扩展名 */
const CODE_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs',
  '.java', '.vue', '.svelte', '.css', '.scss', '.md',
]);

/** 收集项目关键文件内容（用于 AI 分析） */
function collectKeyFiles(
  absPath: string,
  basePath: string,
  depth = 0,
  maxDepth = 6,
  maxFiles = 50,
  results: { path: string; content: string }[] = [],
): { path: string; content: string }[] {
  if (depth > maxDepth || results.length >= maxFiles) return results;

  let entries;
  try {
    entries = readdirSync(absPath, { withFileTypes: true });
  } catch {
    return results;
  }

  // 先处理关键文件
  for (const entry of entries) {
    if (results.length >= maxFiles) break;
    if (entry.isFile() && KEY_FILES.has(entry.name)) {
      const fullPath = join(absPath, entry.name);
      const relPath = relative(basePath, fullPath).replace(/\\/g, '/');
      try {
        const stat = statSync(fullPath);
        if (stat.size <= 1024 * 50) { // 最大 50KB
          results.push({ path: relPath, content: readFileSync(fullPath, 'utf-8') });
        }
      } catch { /* 跳过 */ }
    }
  }

  // 收集入口代码文件（src/index.*, src/main.*, src/app.* 等）
  for (const entry of entries) {
    if (results.length >= maxFiles) break;
    if (entry.isFile()) {
      const ext = extname(entry.name);
      const baseName = entry.name.replace(ext, '').toLowerCase();
      if (CODE_EXTS.has(ext) && ['index', 'main', 'app', 'server'].includes(baseName)) {
        const fullPath = join(absPath, entry.name);
        const relPath = relative(basePath, fullPath).replace(/\\/g, '/');
        if (results.some((r) => r.path === relPath)) continue;
        try {
          const stat = statSync(fullPath);
          if (stat.size <= 1024 * 30) {
            results.push({ path: relPath, content: readFileSync(fullPath, 'utf-8') });
          }
        } catch { /* 跳过 */ }
      }
    }
  }

  // 递归进入子目录
  for (const entry of entries) {
    if (results.length >= maxFiles) break;
    if (entry.isDirectory() && !EXCLUDE.has(entry.name) && !entry.name.startsWith('.')) {
      collectKeyFiles(join(absPath, entry.name), basePath, depth + 1, maxDepth, maxFiles, results);
    }
  }

  return results;
}

/** 将文件树扁平化为按文件夹分组的文件路径列表 */
function flattenTree(tree: FileTreeNode[], prefix = ''): { folder: string; files: string[] }[] {
  const result: { folder: string; files: string[] }[] = [];
  const filesInCurrent: string[] = [];

  for (const node of tree) {
    if (node.type === 'file') {
      filesInCurrent.push(node.name);
    } else if (node.type === 'folder' && node.children) {
      const subResult = flattenTree(node.children, node.path);
      result.push(...subResult);
    }
  }

  if (filesInCurrent.length > 0) {
    result.unshift({ folder: prefix || '.', files: filesInCurrent });
  }

  return result;
}

/** GET /api/file-context?projectPath=...&maxDepth=...&maxFiles=... — 返回项目结构+关键文件内容（供 AI 分析） */
export async function getFileContext(
  request: FastifyRequest<{ Querystring: { projectPath?: string; maxDepth?: string; maxFiles?: string } }>,
  reply: FastifyReply,
) {
  const projectPath = request.query.projectPath;
  if (!projectPath) {
    reply.code(400);
    return { success: false, error: '缺少 projectPath 参数' };
  }

  const maxDepth = Math.min(parseInt(request.query.maxDepth || '6', 10) || 6, 12);
  const maxFiles = Math.min(parseInt(request.query.maxFiles || '50', 10) || 50, 500);

  // GitHub 仓库路径：通过 GitHub API 获取上下文
  if (projectPath.startsWith('github:')) {
    const token = (request.query as Record<string, string>).token;
    return getGithubFileContext(projectPath, reply, token);
  }

  try {
    statSync(projectPath);
  } catch {
    reply.code(404);
    return { success: false, error: '目录不存在' };
  }

  const tree = buildTree(projectPath, projectPath, 0, maxDepth);
  const keyFiles = collectKeyFiles(projectPath, projectPath, 0, maxDepth, maxFiles);

  // 收集完整文件清单（按文件夹分组）
  const allFiles = flattenTree(tree);

  return {
    success: true,
    data: { tree, keyFiles, allFiles },
  };
}

/** GitHub 仓库的 file-context：获取文件树和关键文件 */
async function getGithubFileContext(projectPath: string, reply: FastifyReply, token?: string) {
  const repo = projectPath.replace('github:', '');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    reply.code(400);
    return { success: false, error: '无效的 GitHub 仓库路径' };
  }

  const [owner, repoName] = repo.split('/');
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'FlowVision',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // 获取文件树
  const branchCandidates = ['main', 'master'];
  let tree: FileTreeNode[] = [];

  for (const branch of branchCandidates) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/git/trees/${branch}?recursive=1`,
        { headers },
      );
      if (response.status === 404) continue;
      if (response.status === 403) {
        reply.code(429);
        return { success: false, error: 'GitHub API 请求频率限制，请稍后重试' };
      }
      if (!response.ok) continue;

      const data = (await response.json()) as { tree?: { path: string; type: string }[] };
      tree = buildGithubTree(data.tree || []);
      break;
    } catch {
      continue;
    }
  }

  // 获取关键文件内容
  const keyFileNames = ['package.json', 'README.md', 'readme.md', 'tsconfig.json', 'go.mod', 'Cargo.toml', 'pyproject.toml', 'requirements.txt'];
  const keyFiles: { path: string; content: string }[] = [];

  for (const fileName of keyFileNames) {
    if (keyFiles.length >= 5) break;
    try {
      const response = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/contents/${fileName}`,
        { headers },
      );
      if (!response.ok) continue;

      const data = await response.json() as { content?: string; encoding?: string };
      if (data.content && data.encoding === 'base64') {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        keyFiles.push({ path: fileName, content: content.slice(0, 5000) });
      }
    } catch {
      continue;
    }
  }

  return {
    success: true,
    data: { tree, keyFiles },
  };
}

/** GET /api/browse-dirs?path=... — 列出指定路径下的子目录（用于文件夹选择器） */
export async function browseDirs(
  request: FastifyRequest<{ Querystring: { path?: string } }>,
  reply: FastifyReply,
) {
  let dirPath = request.query.path;

  // 特殊路径：列出 Windows 驱动器列表
  if (dirPath === '__drives__' && platform() === 'win32') {
    try {
      const stdout = execSync('wmic logicaldisk get name', { encoding: 'utf-8' });
      const drives = stdout.split('\n')
        .map((line) => line.trim())
        .filter((line) => /^[A-Z]:$/.test(line))
        .map((drive) => ({
          name: drive,
          path: drive + '\\',
        }));
      return {
        success: true,
        data: { current: '我的电脑', dirs: drives, parentPath: null, isDriveList: true },
      };
    } catch {
      // fallback: 列举常见盘符
      const fallbackDrives = [];
      for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
        const drivePath = `${letter}:\\`;
        try {
          statSync(drivePath);
          fallbackDrives.push({ name: `${letter}:`, path: drivePath });
        } catch { /* 驱动器不存在 */ }
      }
      return {
        success: true,
        data: { current: '我的电脑', dirs: fallbackDrives, parentPath: null, isDriveList: true },
      };
    }
  }

  // 默认返回用户主目录
  if (!dirPath) {
    dirPath = homedir();
  }

  // 规范化路径，防止路径注入
  dirPath = join(dirPath, '.');

  try {
    const stat = statSync(dirPath);
    if (!stat.isDirectory()) {
      reply.code(400);
      return { success: false, error: '路径不是目录' };
    }
  } catch {
    reply.code(404);
    return { success: false, error: '目录不存在' };
  }

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    const dirs = entries
      .filter((e) => {
        if (!e.isDirectory()) return false;
        if (e.name.startsWith('.') || e.name.startsWith('$')) return false;
        if (EXCLUDE.has(e.name)) return false;
        return true;
      })
      .map((e) => ({
        name: e.name,
        path: join(dirPath!, e.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // 计算父目录路径
    const parentPath = join(dirPath, '..');
    const hasParent = parentPath !== dirPath;

    // Windows 下在根目录时提供"我的电脑"入口
    const isWindows = platform() === 'win32';
    const parsed = parsePath(dirPath);
    const isRootDrive = isWindows && parsed.root === dirPath;

    return {
      success: true,
      data: {
        current: dirPath,
        dirs,
        parentPath: hasParent ? parentPath : null,
        canBrowseDrives: isRootDrive && isWindows,
      },
    };
  } catch {
    reply.code(403);
    return { success: false, error: '无权访问该目录' };
  }
}

/** GET /api/github-tree?repo=owner/repo&branch=main — 获取 GitHub 仓库文件树 */
export async function fetchGithubTree(
  request: FastifyRequest<{ Querystring: { repo?: string; branch?: string; token?: string } }>,
  reply: FastifyReply,
) {
  const { repo, branch, token } = request.query;
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    reply.code(400);
    return { success: false, error: '缺少或无效的 repo 参数（格式: owner/repo）' };
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'FlowVision',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const owner = encodeURIComponent(repo.split('/')[0]);
  const repoName = encodeURIComponent(repo.split('/')[1]);

  // 按顺序尝试分支: 用户指定 > main > master
  const branchCandidates = branch ? [branch] : ['main', 'master'];

  for (const branchName of branchCandidates) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/git/trees/${encodeURIComponent(branchName)}?recursive=1`,
        { headers },
      );

      if (response.status === 404 && branchCandidates.length > 1) {
        // 分支不存在，尝试下一个候选分支
        continue;
      }

      if (response.status === 403) {
        reply.code(429);
        return { success: false, error: 'GitHub API 请求频率限制，请稍后重试或提供 Token' };
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || `GitHub API 返回 ${response.status}`);
      }

      const data = (await response.json()) as { tree?: { path: string; type: string }[] };
      const tree = buildGithubTree(data.tree || []);
      return { success: true, data: tree };
    } catch (e) {
      // 如果还有候选分支，继续尝试
      if (branchCandidates.indexOf(branchName) < branchCandidates.length - 1) continue;
      reply.code(500);
      return { success: false, error: (e as Error).message || '获取 GitHub 仓库失败' };
    }
  }

  reply.code(404);
  return { success: false, error: '未找到仓库或分支，请检查仓库地址是否正确' };
}

/** 将 GitHub API 平面树转为嵌套文件树结构 */
function buildGithubTree(entries: { path: string; type: string }[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const map = new Map<string, FileTreeNode>();

  // 先排序：目录在前，同级按名称排序
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const entry of entries) {
    // 跳过排除目录
    const topDir = entry.path.split('/')[0];
    if (EXCLUDE.has(topDir)) continue;

    const parts = entry.path.split('/');
    const name = parts[parts.length - 1];
    const node: FileTreeNode = {
      name,
      path: entry.path,
      type: entry.type === 'tree' ? 'folder' : 'file',
      ...(entry.type === 'tree' ? { children: [] } : {}),
    };

    map.set(entry.path, node);

    if (parts.length === 1) {
      root.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join('/');
      const parent = map.get(parentPath);
      if (parent?.children) {
        parent.children.push(node);
      }
    }
  }

  return root;
}

/** GET /api/gitee-tree?repo=owner/repo&branch=master — 获取 Gitee 仓库文件树 */
export async function fetchGiteeTree(
  request: FastifyRequest<{ Querystring: { repo?: string; branch?: string } }>,
  reply: FastifyReply,
) {
  const { repo, branch } = request.query;
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    reply.code(400);
    return { success: false, error: '缺少或无效的 repo 参数（格式: owner/repo）' };
  }

  const owner = encodeURIComponent(repo.split('/')[0]);
  const repoName = encodeURIComponent(repo.split('/')[1]);

  // Gitee 默认分支通常是 master
  const branchCandidates = branch ? [branch] : ['master', 'main'];

  for (const branchName of branchCandidates) {
    try {
      const response = await fetch(
        `https://gitee.com/api/v5/repos/${owner}/${repoName}/git/trees/${encodeURIComponent(branchName)}?recursive=1`,
        { headers: { 'User-Agent': 'FlowVision' } },
      );

      if (response.status === 404 && branchCandidates.length > 1) {
        continue;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || `Gitee API 返回 ${response.status}`);
      }

      const data = (await response.json()) as { tree?: { path: string; type: string }[] };
      const tree = buildGithubTree(data.tree || []);
      return { success: true, data: tree };
    } catch (e) {
      if (branchCandidates.indexOf(branchName) < branchCandidates.length - 1) continue;
      reply.code(500);
      return { success: false, error: (e as Error).message || '获取 Gitee 仓库失败' };
    }
  }

  reply.code(404);
  return { success: false, error: '未找到仓库或分支，请检查仓库地址是否正确' };
}
