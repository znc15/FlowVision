import { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useGraphStore } from '../../store/graphStore';

/** AI 生成的项目概览数据 */
interface ProjectOverview {
  name: string;
  description: string;
  techStack: string[];
  modules: { name: string; status: string }[];
  progress: string;
  architecture?: string;
  dependencies?: string[];
  risks?: string[];
  metrics?: { label: string; value: string }[];
  designPatterns?: string[];
  entryPoints?: string[];
  buildTools?: string[];
  codeQuality?: { label: string; score: string; color: 'green' | 'yellow' | 'red' }[];
}

const OVERVIEW_KEY = 'flowvision-project-overview';
const PROJECT_PATH_KEY = 'flowvision-project-path';

/** 颜色池，循环分配给技术栈标签 */
const TAG_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500',
  'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
];

/** 模块指示点颜色池 */
const MODULE_COLORS = [
  { bg: 'bg-primary', shadow: 'shadow-[0_0_8px_rgba(0,80,203,0.4)]' },
  { bg: 'bg-secondary', shadow: 'shadow-[0_0_8px_rgba(152,72,0,0.4)]' },
  { bg: 'bg-tertiary', shadow: 'shadow-[0_0_8px_rgba(0,105,20,0.4)]' },
  { bg: 'bg-blue-500', shadow: 'shadow-[0_0_8px_rgba(59,130,246,0.4)]' },
  { bg: 'bg-purple-500', shadow: 'shadow-[0_0_8px_rgba(168,85,247,0.4)]' },
];

/** 从缓存加载概览 */
function loadCachedOverview(projectPath: string): ProjectOverview | null {
  try {
    const raw = localStorage.getItem(OVERVIEW_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (cached.path === projectPath && cached.data) return cached.data;
  } catch { /* 忽略 */ }
  return null;
}

/** 保存概览到缓存 */
function saveCachedOverview(projectPath: string, data: ProjectOverview) {
  try {
    localStorage.setItem(OVERVIEW_KEY, JSON.stringify({ path: projectPath, data }));
  } catch { /* 忽略 */ }
}

function ProjectSidebar() {
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [generatingCanvas, setGeneratingCanvas] = useState(false);
  const [canvasError, setCanvasError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // 当前项目路径
  const projectPath = (() => {
    try { return localStorage.getItem(PROJECT_PATH_KEY) || ''; } catch { return ''; }
  })();

  /** 判断是否为 GitHub 项目 */
  const isGithub = projectPath.startsWith('github:');
  /** 提取 GitHub owner/repo 字符串 */
  const githubSlug = isGithub ? projectPath.replace('github:', '') : '';
  /** 显示用项目名称 */
  const fallbackName = isGithub
    ? githubSlug.split('/').pop() || githubSlug
    : projectPath.split(/[/\\]/).pop() || '项目';

  // 启动时加载缓存
  useEffect(() => {
    if (projectPath) {
      const cached = loadCachedOverview(projectPath);
      if (cached) setOverview(cached);
    } else {
      setOverview(null);
    }
  }, [projectPath]);

  /** AI 生成项目概览 */
  const handleGenerate = async () => {
    if (!projectPath || generating) return;
    setGenerating(true);
    setGenError('');

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const { provider, apiKey, model, baseURL, customHeaders } = useSettingsStore.getState();

    try {
      // 先获取项目上下文（文件树+关键文件内容）
      let fileContext = '';
      try {
        const ctxRes = await fetch(
          `http://localhost:3001/api/file-context?projectPath=${encodeURIComponent(projectPath)}`,
          { signal: controller.signal },
        );
        if (ctxRes.ok) {
          const ctxData = await ctxRes.json();
          if (ctxData.success && ctxData.data) {
            const { keyFiles } = ctxData.data;
            if (keyFiles && keyFiles.length > 0) {
              fileContext = '\n\n以下是项目关键文件内容:\n' +
                keyFiles.map((f: { path: string; content: string }) =>
                  `--- ${f.path} ---\n${f.content.slice(0, 3000)}`
                ).join('\n\n');
            }
          }
        }
      } catch {
        // 获取文件上下文失败不阻断概览生成
      }

      const prompt = `分析以下项目路径的文件结构，生成项目概览。项目路径: ${projectPath}${fileContext}

请严格以 JSON 格式返回（不要包含 markdown 代码块），格式如下:
{
  "name": "项目名称",
  "description": "一句话描述项目用途",
  "techStack": ["技术1", "技术2"],
  "modules": [{"name": "模块名", "status": "状态描述"}],
  "progress": "整体进度描述",
  "architecture": "架构模式描述（如 MVC/微服务/单体等）",
  "dependencies": ["核心外部依赖1", "核心外部依赖2"],
  "risks": ["潜在风险或技术债务1", "潜在风险2"],
  "metrics": [{"label": "代码行数(估)", "value": "数值"}, {"label": "测试覆盖", "value": "描述"}],
  "designPatterns": ["使用的设计模式1", "设计模式2"],
  "entryPoints": ["主要入口文件路径1", "入口文件2"],
  "buildTools": ["构建/开发工具1", "工具2"],
  "codeQuality": [{"label": "可维护性", "score": "高/中/低", "color": "green/yellow/red"}]
}`;

      const response = await fetch('http://localhost:3001/api/ai/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          rawMode: true,
          systemPrompt: '你是一个项目分析助手。只返回合法 JSON，不要包含任何解释文字或 markdown 代码块。',
          currentGraph: { nodes: [], edges: [] },
          mode: 'incremental',
          provider,
          ...(apiKey && { apiKey }),
          ...(model && { model }),
          ...(baseURL && { baseURL }),
          ...(Object.keys(customHeaders).length > 0 && { customHeaders }),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: '请求失败' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法获取响应流');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === 'chunk') fullText += event.text;
            if (event.type === 'error') throw new Error(event.error);
          } catch (e) {
            if (e instanceof Error && e.message !== jsonStr) throw e;
          }
        }
      }

      // 从响应文本中提取 JSON
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI 未返回有效 JSON');

      const data: ProjectOverview = JSON.parse(jsonMatch[0]);
      setOverview(data);
      saveCachedOverview(projectPath, data);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setGenError(e instanceof Error ? e.message : '生成失败');
      }
    } finally {
      setGenerating(false);
    }
  };

  /** 根据概览数据生成架构流程图到画布 */
  const handleGenerateCanvas = async () => {
    if (!overview || generatingCanvas) return;
    setGeneratingCanvas(true);
    setCanvasError('');

    const { provider, apiKey, model, baseURL, customHeaders: customHeaders2 } = useSettingsStore.getState();
    const prompt = `根据以下项目信息，生成一个项目架构流程图：
项目名称: ${overview.name}
项目描述: ${overview.description}
技术栈: ${overview.techStack.join(', ')}
核心模块: ${overview.modules.map((m) => `${m.name}(${m.status})`).join(', ')}
${overview.progress ? `进度: ${overview.progress}` : ''}

请生成一个清晰的架构流程图，展示各核心模块之间的关系和数据流向。
使用 start 节点表示入口，process 节点表示各模块，decision 节点表示关键判断，data 节点表示数据存储，end 节点表示输出。`;

    try {
      const response = await fetch('http://localhost:3001/api/ai/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          currentGraph: { nodes: [], edges: [] },
          mode: 'full',
          provider,
          ...(apiKey && { apiKey }),
          ...(model && { model }),
          ...(baseURL && { baseURL }),
          ...(Object.keys(customHeaders2).length > 0 && { customHeaders: customHeaders2 }),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: '请求失败' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      // 消费 SSE 流 — 后端会自动解析 GraphDiff 并通过 WebSocket 广播到画布
      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法获取响应流');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === 'error') {
              throw new Error(event.error || '生成失败');
            }
            if (event.type === 'done' && event.graph) {
              useGraphStore.getState().replaceGraph(event.graph);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== jsonStr) throw e;
          }
        }
      }
    } catch (e) {
      setCanvasError(e instanceof Error ? e.message : '架构图生成失败');
    } finally {
      setGeneratingCanvas(false);
    }
  };

  // 当前展示的概览（AI 生成或默认），防御性合并缺失字段
  const displayOverview: ProjectOverview | null = overview
    ? {
        name: overview.name || '未命名项目',
        description: overview.description || '',
        techStack: Array.isArray(overview.techStack) ? overview.techStack : [],
        modules: Array.isArray(overview.modules) ? overview.modules : [],
        progress: overview.progress || '',
        architecture: overview.architecture || '',
        dependencies: Array.isArray(overview.dependencies) ? overview.dependencies : [],
        risks: Array.isArray(overview.risks) ? overview.risks : [],
        metrics: Array.isArray(overview.metrics) ? overview.metrics : [],
        designPatterns: Array.isArray(overview.designPatterns) ? overview.designPatterns : [],
        entryPoints: Array.isArray(overview.entryPoints) ? overview.entryPoints : [],
        buildTools: Array.isArray(overview.buildTools) ? overview.buildTools : [],
        codeQuality: Array.isArray(overview.codeQuality) ? overview.codeQuality : [],
      }
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* ===== 无项目时的空状态 ===== */}
      {!projectPath && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              folder_open
            </span>
          </div>
          <h3 className="text-sm font-semibold text-on-surface mb-1">尚未打开项目</h3>
          <p className="text-xs text-on-surface-variant mb-6">
            打开本地项目文件夹或从 GitHub 导入，开始分析和生成流程图
          </p>
          <p className="text-[10px] text-on-surface-variant/60">
            通过左侧文件浏览器打开项目
          </p>
        </div>
      )}

      {/* ===== 有项目时的完整界面 ===== */}
      {projectPath && (
        <>
          {/* 固定顶部 —— 项目摘要 + AI 按钮 */}
          <div className="shrink-0 px-5 pt-6 pb-2 border-b border-outline-variant/8 bg-surface">
            {/* 项目摘要 */}
            <div className="mb-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isGithub && (
                    <span className="material-symbols-outlined text-base text-slate-500 shrink-0" title="GitHub 项目">
                      language
                    </span>
                  )}
                  <h2 className="text-title-sm font-semibold text-on-surface truncate">
                    {displayOverview?.name || fallbackName}
                  </h2>
                </div>

              </div>
              {displayOverview?.description && (
                <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                  {displayOverview.description}
                </p>
              )}
              {isGithub && (
                <a
                  href={`https://github.com/${githubSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 mt-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-xs">open_in_new</span>
                  github.com/{githubSlug}
                </a>
              )}
            </div>

            {/* AI 分析 + 生成架构图按钮 */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 text-xs font-semibold shadow-md active:scale-[0.98]"
            >
              <span className={`material-symbols-outlined text-base ${generating ? 'animate-spin' : ''}`}>
                {generating ? 'progress_activity' : 'auto_awesome'}
              </span>
              {generating ? 'AI 分析中...' : displayOverview ? '重新分析项目' : 'AI 分析项目'}
            </button>
            {genError && (
              <p className="text-[10px] text-red-500 mt-1.5 text-center">{genError}</p>
            )}
            {displayOverview && !generating && (
              <>
                <button
                  onClick={handleGenerateCanvas}
                  disabled={generatingCanvas}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors disabled:opacity-50 text-xs font-medium mt-2"
                >
                  <span className={`material-symbols-outlined text-base ${generatingCanvas ? 'animate-spin' : ''}`}>
                    {generatingCanvas ? 'progress_activity' : 'account_tree'}
                  </span>
                  {generatingCanvas ? '生成架构图中...' : '生成架构流程图'}
                </button>
                {canvasError && (
                  <p className="text-[10px] text-red-500 mt-1.5 text-center">{canvasError}</p>
                )}
              </>
            )}
          </div>

          {/* 可滚动内容区域 */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {/* 生成中进度指示器 */}
          {generating && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-base animate-spin">progress_activity</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-on-surface">正在分析项目...</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">AI 正在阅读代码结构</p>
                </div>
              </div>
              <div className="space-y-2 ml-1">
                {[
                  { label: '扫描文件结构', done: true },
                  { label: '读取关键文件', done: true },
                  { label: '分析技术栈与依赖', active: true },
                  { label: '识别核心模块', pending: true },
                  { label: '评估架构与风险', pending: true },
                  { label: '生成项目概览', pending: true },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    {step.done ? (
                      <span className="material-symbols-outlined text-xs text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    ) : step.active ? (
                      <span className="material-symbols-outlined text-xs text-primary animate-pulse">radio_button_checked</span>
                    ) : (
                      <span className="material-symbols-outlined text-xs text-on-surface-variant/30">radio_button_unchecked</span>
                    )}
                    <span className={`text-[11px] ${step.done ? 'text-on-surface-variant/60 line-through' : step.active ? 'text-primary font-medium' : 'text-on-surface-variant/40'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2.5 animate-pulse">
                <div className="h-2.5 bg-surface-container-highest rounded w-3/4"></div>
                <div className="h-2.5 bg-surface-container-highest rounded w-1/2"></div>
                <div className="flex gap-2 mt-2">
                  <div className="h-5 bg-surface-container-highest rounded-md w-14"></div>
                  <div className="h-5 bg-surface-container-highest rounded-md w-18"></div>
                  <div className="h-5 bg-surface-container-highest rounded-md w-12"></div>
                </div>
              </div>
            </div>
          )}

          {/* 技术栈 */}
          {!generating && displayOverview && displayOverview.techStack.length > 0 && (
            <div className="mb-6">
              <label className="text-label-sm uppercase tracking-widest font-bold text-on-surface-variant/60 block mb-3">
                技术栈
              </label>
              <div className="flex flex-wrap gap-2">
                {displayOverview.techStack.map((tech, i) => (
                  <span key={tech} className="px-2 py-1 bg-surface-container-highest text-on-surface text-[11px] rounded flex items-center gap-1.5 ghost-border-soft">
                    <span className={`w-1.5 h-1.5 rounded-full ${TAG_COLORS[i % TAG_COLORS.length]}`}></span> {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 核心模块列表 */}
          {!generating && displayOverview && displayOverview.modules.length > 0 && (
            <div className="mb-6">
              <label className="text-label-sm uppercase tracking-widest font-bold text-on-surface-variant/60 block mb-3">
                核心模块
              </label>
              <div className="space-y-2.5">
                {displayOverview.modules.map((mod, i) => {
                  const color = MODULE_COLORS[i % MODULE_COLORS.length];
                  return (
                    <div key={mod.name} className="flex items-center gap-3 py-1">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${color.bg}`}></div>
                      <span className="text-[11px] text-on-surface font-medium shrink-0">{mod.name}</span>
                      <span className="text-[10px] text-on-surface-variant/60 truncate">{mod.status}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-on-surface-variant/50 mt-3">
                已识别 {displayOverview.modules.length} 个模块
              </p>
            </div>
          )}

          {/* 架构模式 */}
          {!generating && displayOverview?.architecture && (
            <div className="mb-6">
              <label className="text-label-sm uppercase tracking-widest font-bold text-on-surface-variant/60 block mb-3">
                架构模式
              </label>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-surface-container-highest/40 ghost-border-soft">
                <span className="material-symbols-outlined text-base text-primary shrink-0 mt-0.5">architecture</span>
                <p className="text-[11px] text-on-surface leading-relaxed">{displayOverview.architecture}</p>
              </div>
            </div>
          )}

          {/* 核心依赖 */}
          {!generating && displayOverview && displayOverview.dependencies && displayOverview.dependencies.length > 0 && (
            <div className="mb-6">
              <label className="text-label-sm uppercase tracking-widest font-bold text-on-surface-variant/60 block mb-3">
                核心依赖
              </label>
              <div className="flex flex-wrap gap-1.5">
                {displayOverview.dependencies.map((dep) => (
                  <span key={dep} className="px-2 py-0.5 bg-surface-container-highest/60 text-on-surface-variant text-[10px] rounded-md ghost-border-soft">
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 项目指标 */}
          {!generating && displayOverview && displayOverview.metrics && displayOverview.metrics.length > 0 && (
            <div className="mb-6">
              <label className="text-label-sm uppercase tracking-widest font-bold text-on-surface-variant/60 block mb-3">
                项目指标
              </label>
              <div className="grid grid-cols-2 gap-2">
                {displayOverview.metrics.map((m) => (
                  <div key={m.label} className="p-2.5 rounded-xl bg-surface-container-highest/30 ghost-border-soft text-center">
                    <p className="text-xs font-semibold text-on-surface">{m.value}</p>
                    <p className="text-[9px] text-on-surface-variant/60 mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 代码质量评估 */}
          {!generating && displayOverview && displayOverview.codeQuality && displayOverview.codeQuality.length > 0 && (
            <div className="mb-6">
              <label className="text-label-sm uppercase tracking-widest font-bold text-on-surface-variant/60 block mb-3">
                质量评估
              </label>
              <div className="space-y-2">
                {displayOverview.codeQuality.map((q) => (
                  <div key={q.label} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-surface-container-highest/30 ghost-border-soft">
                    <span className="text-[11px] text-on-surface">{q.label}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      q.color === 'green' ? 'bg-green-100 text-green-700' :
                      q.color === 'yellow' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-600'
                    }`}>{q.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 设计模式 */}
          {!generating && displayOverview && displayOverview.designPatterns && displayOverview.designPatterns.length > 0 && (
            <div className="mb-6">
              <label className="text-label-sm uppercase tracking-widest font-bold text-on-surface-variant/60 block mb-3">
                设计模式
              </label>
              <div className="flex flex-wrap gap-1.5">
                {displayOverview.designPatterns.map((pattern) => (
                  <span key={pattern} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] rounded-md font-medium">
                    {pattern}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 入口文件 */}
          {!generating && displayOverview && displayOverview.entryPoints && displayOverview.entryPoints.length > 0 && (
            <div className="mb-6">
              <label className="text-label-sm uppercase tracking-widest font-bold text-on-surface-variant/60 block mb-3">
                入口文件
              </label>
              <div className="space-y-1.5">
                {displayOverview.entryPoints.map((entry) => (
                  <div key={entry} className="flex items-center gap-2 py-1">
                    <span className="material-symbols-outlined text-xs text-on-surface-variant/50">description</span>
                    <span className="text-[10px] text-on-surface-variant font-mono">{entry}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 构建工具 */}
          {!generating && displayOverview && displayOverview.buildTools && displayOverview.buildTools.length > 0 && (
            <div className="mb-6">
              <label className="text-label-sm uppercase tracking-widest font-bold text-on-surface-variant/60 block mb-3">
                构建工具
              </label>
              <div className="flex flex-wrap gap-1.5">
                {displayOverview.buildTools.map((tool) => (
                  <span key={tool} className="px-2 py-0.5 bg-surface-container-highest/60 text-on-surface-variant text-[10px] rounded-md ghost-border-soft flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">build</span>
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 进度描述 */}
          {!generating && displayOverview?.progress && (
            <div className="mb-6">
              <label className="text-label-sm uppercase tracking-widest font-bold text-on-surface-variant/60 block mb-3">
                进度概要
              </label>
              <p className="text-[11px] text-primary leading-relaxed">{displayOverview.progress}</p>
            </div>
          )}

          {/* 风险与技术债务 */}
          {!generating && displayOverview && displayOverview.risks && displayOverview.risks.length > 0 && (
            <div className="mb-6">
              <label className="text-label-sm uppercase tracking-widest font-bold text-on-surface-variant/60 block mb-3">
                风险提示
              </label>
              <div className="space-y-1.5">
                {displayOverview.risks.map((risk, i) => (
                  <div key={i} className="flex items-start gap-2 py-1">
                    <span className="material-symbols-outlined text-xs text-amber-500 shrink-0 mt-0.5">warning</span>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed">{risk}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>


        </>
      )}

    </div>
  );
}

export default ProjectSidebar;
