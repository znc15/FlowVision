import { useState, useCallback, useEffect, useRef } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useLogStore } from '../../store/logStore';
import { getBackendUrl } from '../../utils/backend';

/** 文件树节点数据结构 */
export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
}

interface FileExplorerProps {
  /** 项目路径（传入后自动从后端获取文件树） */
  projectPath?: string;
  /** 文件树数据（直接传入则不走 API） */
  tree?: FileTreeNode[];
  /** 当前选中的文件路径 */
  selectedFile?: string;
  /** 文件选中回调 */
  onFileSelect?: (path: string) => void;
  /** 隐藏标题栏 */
  hideHeader?: boolean;
}

/** 文件树项组件 */
function TreeItem({
  node,
  depth,
  selectedFile,
  expandedPaths,
  onToggle,
  onFileSelect,
}: {
  node: FileTreeNode;
  depth: number;
  selectedFile?: string;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onFileSelect?: (path: string) => void;
}) {
  const isFolder = node.type === 'folder';
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedFile === node.path;
  const isInSelectedFolder = selectedFile?.startsWith(node.path + '/');

  const handleClick = () => {
    if (isFolder) {
      onToggle(node.path);
    } else {
      onFileSelect?.(node.path);
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        style={{ paddingLeft: `${depth * 1.25 + 1}rem` }}
        className={`flex items-center gap-2 pr-4 py-1.5 rounded-r-lg cursor-pointer transition-all ${
          isSelected
            ? 'bg-primary-container/10 border-l-2 border-primary text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]'
            : isInSelectedFolder && isFolder
              ? 'bg-primary-fixed/35 text-primary font-semibold'
              : 'text-on-surface/80 hover:bg-surface-container-high/80'
        }`}
      >
        {/* 展开/折叠箭头 */}
        {isFolder ? (
          <span className={`material-symbols-outlined text-[18px] transition-colors ${isInSelectedFolder || isExpanded ? 'text-primary/70' : 'text-slate-300'}`}>
            {isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
          </span>
        ) : (
          <span className={`material-symbols-outlined text-[18px] ml-[18px] ${isSelected ? 'text-primary/80' : node.name.endsWith('.md') ? 'text-blue-500/70' : 'text-slate-400'}`}>
            {node.name.endsWith('.md') ? 'article' : 'description'}
          </span>
        )}

        {/* 文件夹图标 */}
        {isFolder && (
          <span
            className={`material-symbols-outlined text-[18px] ${isInSelectedFolder || isExpanded ? 'text-primary' : 'text-amber-500/70'}`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {isExpanded ? 'folder_open' : 'folder'}
          </span>
        )}

        {/* 名称 */}
        <span className="text-xs truncate">{node.name}</span>
      </div>

      {/* 子节点 */}
      {isFolder && isExpanded && node.children?.map((child) => (
        <TreeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedFile={selectedFile}
          expandedPaths={expandedPaths}
          onToggle={onToggle}
          onFileSelect={onFileSelect}
        />
      ))}
    </>
  );
}

const PROJECT_PATH_KEY = 'flowvision-project-path';
const EXPANDED_PATHS_KEY = 'flowvision-expanded-paths';

/** 文件浏览器面板 */
function FileExplorer({ projectPath: propProjectPath, tree: propTree, selectedFile, onFileSelect, hideHeader }: FileExplorerProps) {
  const [fetchedTree, setFetchedTree] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pathInput, setPathInput] = useState('');
  const [currentPath, setCurrentPath] = useState('');

  // 启动时从 localStorage 加载上次的路径
  useEffect(() => {
    if (propProjectPath || propTree) return;
    const saved = localStorage.getItem(PROJECT_PATH_KEY);
    if (saved) {
      setPathInput(saved);
      setCurrentPath(saved);
    }
  }, [propProjectPath, propTree]);

  // 从后端获取文件树（跳过 GitHub 仓库，其文件树已由导入时设置）
  useEffect(() => {
    const path = propProjectPath || currentPath;
    if (!path || propTree || path.startsWith('github:') || path.startsWith('gitee:')) return;
    setLoading(true);
    setError('');
    fetch(`${getBackendUrl()}/api/files?projectPath=${encodeURIComponent(path)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setFetchedTree(data.data);
        } else {
          setError(data.error || '加载失败');
          setFetchedTree([]);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '获取文件树失败');
        setFetchedTree([]);
      })
      .finally(() => setLoading(false));
  }, [propProjectPath, currentPath, propTree]);

  const handleImport = () => {
    const trimmed = pathInput.trim();
    if (!trimmed) return;
    setCurrentPath(trimmed);
    try {
      localStorage.setItem(PROJECT_PATH_KEY, trimmed);
    } catch {
      // 忽略
    }
  };

  const handleClear = () => {
    setCurrentPath('');
    setPathInput('');
    setFetchedTree([]);
    setError('');
    setGithubRepo('');
    setIsGithub(false);
    setGiteeRepo('');
    setIsGitee(false);
    setExpandedPaths(new Set());
    try {
      localStorage.removeItem(PROJECT_PATH_KEY);
      localStorage.removeItem(EXPANDED_PATHS_KEY);
    } catch {
      // 忽略
    }
  };

  const tree = propTree ?? fetchedTree;

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(EXPANDED_PATHS_KEY);
      if (saved) return new Set(JSON.parse(saved));
    } catch { /* 忽略 */ }
    return new Set();
  });

  // ===== 文件夹浏览器 =====
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);
  const [browsePath, setBrowsePath] = useState('');
  const [browseParent, setBrowseParent] = useState<string | null>(null);
  const [browseDirs, setBrowseDirs] = useState<{ name: string; path: string }[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseCanDrives, setBrowseCanDrives] = useState(false);
  const [browseIsDriveList, setBrowseIsDriveList] = useState(false);

  const fetchBrowseDirs = async (path?: string) => {
    setBrowseLoading(true);
    try {
      const url = path
        ? `${getBackendUrl()}/api/browse-dirs?path=${encodeURIComponent(path)}`
        : `${getBackendUrl()}/api/browse-dirs`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setBrowsePath(data.data.current);
        setBrowseDirs(data.data.dirs);
        setBrowseParent(data.data.parentPath);
        setBrowseCanDrives(data.data.canBrowseDrives || data.data.isDriveList || false);
        setBrowseIsDriveList(data.data.isDriveList || false);
      }
    } catch { /* 忽略 */ }
    setBrowseLoading(false);
  };

  const handleOpenFolderBrowser = () => {
    setShowFolderBrowser(true);
    fetchBrowseDirs();
  };

  const handleSelectBrowseFolder = (path: string) => {
    setPathInput(path);
    setCurrentPath(path);
    setShowFolderBrowser(false);
    setIsGithub(false);
    try { localStorage.setItem(PROJECT_PATH_KEY, path); } catch { /* 忽略 */ }
  };

  // ===== GitHub 仓库导入 =====
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [showGithubInput, setShowGithubInput] = useState(false);
  const [githubRepo, setGithubRepo] = useState('');
  const [githubLoading, setGithubLoading] = useState(false);
  const [isGithub, setIsGithub] = useState(false);
  const sourceMenuRef = useRef<HTMLDivElement>(null);

  // ===== Gitee 仓库导入 =====
  const [showGiteeInput, setShowGiteeInput] = useState(false);
  const [giteeRepo, setGiteeRepo] = useState('');
  const [giteeLoading, setGiteeLoading] = useState(false);
  const [isGitee, setIsGitee] = useState(false);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    if (!showSourceMenu) return;
    const handler = (e: MouseEvent) => {
      if (sourceMenuRef.current && !sourceMenuRef.current.contains(e.target as Node)) {
        setShowSourceMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSourceMenu]);

  const handleGithubImport = async () => {
    const trimmed = githubRepo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
    if (!trimmed || !/^[\w.-]+\/[\w.-]+$/.test(trimmed)) {
      setError('请输入有效的 GitHub 仓库（格式: owner/repo）');
      return;
    }

    setGithubLoading(true);
    setError('');
    try {
      const githubToken = useSettingsStore.getState().githubToken;
      const params = new URLSearchParams({ repo: trimmed });
      if (githubToken) params.set('token', githubToken);
      const res = await fetch(`${getBackendUrl()}/api/github-tree?${params}`);
      const data = await res.json();
      if (data.success) {
        setFetchedTree(data.data);
        setIsGithub(true);
        setCurrentPath(`github:${trimmed}`);
        setShowGithubInput(false);
        useLogStore.getState().add('success', 'GitHub导入', `仓库 ${trimmed} 导入成功`);
        try { localStorage.setItem(PROJECT_PATH_KEY, `github:${trimmed}`); } catch { /* 忽略 */ }
      } else {
        setError(data.error || 'GitHub 仓库加载失败');
        useLogStore.getState().add('error', 'GitHub导入', data.error || 'GitHub 仓库加载失败');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取 GitHub 仓库失败');
    } finally {
      setGithubLoading(false);
    }
  };

  const handleGiteeImport = async () => {
    const trimmed = giteeRepo.trim().replace(/^https?:\/\/gitee\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
    if (!trimmed || !/^[\w.-]+\/[\w.-]+$/.test(trimmed)) {
      setError('请输入有效的 Gitee 仓库（格式: owner/repo）');
      return;
    }

    setGiteeLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ repo: trimmed });
      const res = await fetch(`${getBackendUrl()}/api/gitee-tree?${params}`);
      const data = await res.json();
      if (data.success) {
        setFetchedTree(data.data);
        setIsGitee(true);
        setIsGithub(false);
        setCurrentPath(`gitee:${trimmed}`);
        setShowGiteeInput(false);
        useLogStore.getState().add('success', 'Gitee导入', `仓库 ${trimmed} 导入成功`);
        try { localStorage.setItem(PROJECT_PATH_KEY, `gitee:${trimmed}`); } catch { /* 忽略 */ }
      } else {
        setError(data.error || 'Gitee 仓库加载失败');
        useLogStore.getState().add('error', 'Gitee导入', data.error || 'Gitee 仓库加载失败');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取 Gitee 仓库失败');
    } finally {
      setGiteeLoading(false);
    }
  };

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      try { localStorage.setItem(EXPANDED_PATHS_KEY, JSON.stringify([...next])); } catch { /* 忽略 */ }
      return next;
    });
  }, []);

  return (
    <section className="h-full bg-surface-container flex flex-col ghost-border-soft border-y-0 border-r-0">
      {/* 标题栏 */}
      {!hideHeader && (
      <div className="workbench-panel-header px-4 shrink-0">
        <span className="text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">
          文件浏览器
        </span>
        {currentPath && (
          <button onClick={handleClear} className="icon-button-soft h-8 w-8" title="关闭项目">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>
      )}

      {/* 路径导入区域 */}
      {!propTree && !propProjectPath && (
        <div className="px-3 py-2 shrink-0 ghost-border-soft border-x-0 border-t-0">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImport()}
              placeholder="输入项目路径..."
              className="flex-1 min-w-0 bg-surface-container-highest/80 rounded-xl py-1.5 px-2.5 text-[11px] text-on-surface outline-none ghost-border-soft focus:ring-1 focus:ring-primary/20 transition-all duration-200"
            />
            <div className="relative" ref={sourceMenuRef}>
              <button
                onClick={() => setShowSourceMenu((v) => !v)}
                className="px-2 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-200"
                title="添加项目源"
              >
                <span className="material-symbols-outlined text-base">add</span>
              </button>
              {showSourceMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 w-40 animate-[fadeIn_150ms_ease-out] overflow-hidden">
                  <button
                    onClick={() => { setShowSourceMenu(false); handleOpenFolderBrowser(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors duration-150 rounded-lg mx-0.5"
                  >
                    <span className="material-symbols-outlined text-sm text-amber-500">folder</span>
                    本地文件夹
                  </button>
                  <button
                    onClick={() => { setShowSourceMenu(false); setShowGithubInput(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors duration-150 rounded-lg mx-0.5"
                  >
                    <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                    GitHub 仓库
                  </button>
                  <button
                    onClick={() => { setShowSourceMenu(false); setShowGiteeInput(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors duration-150 rounded-lg mx-0.5"
                  >
                    <span className="material-symbols-outlined text-sm text-red-500">cloud_download</span>
                    Gitee 仓库
                  </button>
                </div>
              )}
            </div>
          </div>
          {isGithub && currentPath && (
            <p className="text-[10px] text-primary mt-1.5 flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              {currentPath.replace('github:', '')}
            </p>
          )}
          {isGitee && currentPath && (
            <p className="text-[10px] text-red-500 mt-1.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">cloud_download</span>
              {currentPath.replace('gitee:', '')}
            </p>
          )}
          {error && (
            <p className="text-[10px] text-red-500 mt-1.5 leading-tight">{error}</p>
          )}
        </div>
      )}

      {/* 文件树 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        {loading && (
          <div className="px-4 py-2 text-xs text-on-surface-variant">加载中...</div>
        )}
        {!loading && tree.length === 0 && (
          <div className="px-4 py-2 text-xs text-on-surface-variant">暂无项目文件</div>
        )}
        <div className="space-y-0.5">
          {tree.map((node) => (
            <TreeItem
              key={node.path}
              node={node}
              depth={0}
              selectedFile={selectedFile}
              expandedPaths={expandedPaths}
              onToggle={handleToggle}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      </div>

      {/* GitHub 仓库输入弹窗 */}
      {showGithubInput && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]" onClick={() => setShowGithubInput(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[380px] ghost-border-soft animate-[scaleIn_250ms_ease-out]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                导入 GitHub 仓库
              </h3>
              <button onClick={() => setShowGithubInput(false)} className="icon-button-soft h-7 w-7">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            <div className="px-5 py-4">
              <label className="text-xs text-slate-500 block mb-2">仓库地址（owner/repo 或完整 URL）</label>
              <input
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGithubImport()}
                placeholder="例如: facebook/react"
                className="w-full bg-slate-50 rounded-lg py-2.5 px-3 text-xs text-slate-800 outline-none border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                autoFocus
              />
              <button
                onClick={handleGithubImport}
                disabled={githubLoading || !githubRepo.trim()}
                className="w-full mt-3 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {githubLoading && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                {githubLoading ? '加载中...' : '导入仓库'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gitee 仓库输入弹窗 */}
      {showGiteeInput && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]" onClick={() => setShowGiteeInput(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[380px] ghost-border-soft animate-[scaleIn_250ms_ease-out]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500 text-lg">cloud_download</span>
                导入 Gitee 仓库
              </h3>
              <button onClick={() => setShowGiteeInput(false)} className="icon-button-soft h-7 w-7">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            <div className="px-5 py-4">
              <label className="text-xs text-slate-500 block mb-2">仓库地址（owner/repo 或完整 URL）</label>
              <input
                type="text"
                value={giteeRepo}
                onChange={(e) => setGiteeRepo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGiteeImport()}
                placeholder="例如: openharmony/docs"
                className="w-full bg-slate-50 rounded-lg py-2.5 px-3 text-xs text-slate-800 outline-none border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                autoFocus
              />
              <button
                onClick={handleGiteeImport}
                disabled={giteeLoading || !giteeRepo.trim()}
                className="w-full mt-3 py-2.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {giteeLoading && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                {giteeLoading ? '加载中...' : '导入仓库'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 文件夹浏览器弹窗 */}
      {showFolderBrowser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]" onClick={() => setShowFolderBrowser(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[540px] max-h-[75vh] flex flex-col ghost-border-soft animate-[scaleIn_250ms_ease-out]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">folder_open</span>
                选择项目文件夹
              </h3>
              <button onClick={() => setShowFolderBrowser(false)} className="icon-button-soft h-7 w-7">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* 当前路径 + 操作栏 */}
            <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-100 shrink-0 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
              <p className="text-[11px] text-slate-600 truncate font-mono flex-1">{browsePath || '加载中...'}</p>
              {!browseIsDriveList && (
                <button
                  onClick={() => fetchBrowseDirs('__drives__')}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200/70 text-slate-600 text-[10px] font-medium hover:bg-slate-300/70 transition-colors"
                  title="切换磁盘"
                >
                  <span className="material-symbols-outlined text-xs">hard_drive</span>
                  切换磁盘
                </button>
              )}
            </div>

            {/* 目录列表 */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {browseLoading ? (
                <div className="flex items-center justify-center gap-2 py-8">
                  <span className="material-symbols-outlined text-sm text-primary animate-spin">progress_activity</span>
                  <p className="text-xs text-slate-400">加载中...</p>
                </div>
              ) : (
                <>
                  {browseParent && !browseIsDriveList && (
                    <button
                      onClick={() => fetchBrowseDirs(browseParent)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base text-slate-400">arrow_upward</span>
                      <span className="font-medium">上级目录</span>
                    </button>
                  )}
                  {browseCanDrives && !browseIsDriveList && !browseParent && (
                    <button
                      onClick={() => fetchBrowseDirs('__drives__')}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base text-slate-400">hard_drive</span>
                      <span className="font-medium">我的电脑（所有磁盘）</span>
                    </button>
                  )}
                  {browseDirs.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">此目录下无子目录</p>
                  )}
                  {browseDirs.map((dir) => (
                    <button
                      key={dir.path}
                      onClick={() => fetchBrowseDirs(dir.path)}
                      onDoubleClick={() => handleSelectBrowseFolder(dir.path)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-slate-700 hover:bg-primary/5 transition-all duration-150 group"
                      title="单击进入，双击选择"
                    >
                      <span className="material-symbols-outlined text-lg text-amber-500/70" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {browseIsDriveList ? 'hard_drive' : 'folder'}
                      </span>
                      <span className="flex-1 text-left truncate font-medium">{dir.name}</span>
                      <span className="material-symbols-outlined text-sm text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* 底部操作栏 */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 shrink-0 bg-slate-50/50">
              <p className="text-[10px] text-slate-400">单击进入目录，双击直接选择</p>
              <button
                onClick={() => handleSelectBrowseFolder(browsePath)}
                disabled={!browsePath || browseIsDriveList}
                className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 shadow-md active:scale-[0.98]"
              >
                选择当前目录
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default FileExplorer;
