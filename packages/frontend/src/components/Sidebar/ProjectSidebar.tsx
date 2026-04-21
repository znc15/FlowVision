import { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useGraphStore } from '../../store/graphStore';
import { useLogStore } from '../../store/logStore';
import { createIdleStreamTimeout } from '../../utils/streamTimeout';
import { extractOverviewJsonText, formatStreamingOverviewText } from '../../utils/projectOverviewStream';

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
  fileStats?: { totalFiles: number; totalLines: number; languages: { name: string; files: number; percentage: number }[] };
  testInfo?: { framework: string; coverage: string; testFiles: number };
  apiEndpoints?: { method: string; path: string; description: string }[];
  securityNotes?: string[];
  performanceNotes?: string[];
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

function buildAnalysisLogDetail(detail: Record<string, unknown>): string {
  return JSON.stringify(detail, null, 2);
}

function getStreamPreview(text: string, maxChars = 800): string | undefined {
  const normalized = text.trim();
  if (!normalized) return undefined;
  return normalized.length > maxChars ? `...[截断]\n${normalized.slice(-maxChars)}` : normalized;
}

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
  const [streamingOverviewText, setStreamingOverviewText] = useState('');
  const [streamingCanvasText, setStreamingCanvasText] = useState('');
  const [generatingCanvas, setGeneratingCanvas] = useState(false);
  const [canvasError, setCanvasError] = useState('');
  const [, setAnalysisStep] = useState(0);
  const [, setCanvasStep] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // 一言 (Hitokoto) 随机句子
  const [hitokoto, setHitokoto] = useState<{ text: string; from?: string } | null>(null);
  useEffect(() => {
    fetch('https://v1.hitokoto.cn/?c=a&c=b&c=d&c=i&c=k&encode=json')
      .then((r) => r.json())
      .then((d) => { if (d.hitokoto) setHitokoto({ text: d.hitokoto, from: d.from || '' }); })
      .catch(() => { /* 忽略 */ });
  }, []);

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
    setStreamingOverviewText('');
    setAnalysisStep(1);
    useLogStore.getState().add('info', 'AI分析', `开始生成项目概览: ${projectPath}`);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const { provider, apiKey, model, baseURL, customHeaders, githubToken, httpProxy } = useSettingsStore.getState();
    let fullText = '';

    try {
      // 先获取项目上下文（文件树+关键文件内容）
      let fileContext = '';
      try {
        const { maxDepth, maxSubCalls } = useSettingsStore.getState();
        const ctxParams = new URLSearchParams({ projectPath });
        if (githubToken) ctxParams.set('token', githubToken);
        ctxParams.set('maxDepth', String(maxDepth));
        ctxParams.set('maxFiles', String(maxSubCalls));
        const ctxRes = await fetch(
          `http://localhost:3001/api/file-context?${ctxParams}`,
          { signal: controller.signal },
        );
        if (ctxRes.ok) {
          const ctxData = await ctxRes.json();
          if (ctxData.success && ctxData.data) {
            const { keyFiles, allFiles } = ctxData.data;
            // 完整文件清单（按文件夹分组）
            if (allFiles && allFiles.length > 0) {
              fileContext += '\n\n项目完整文件结构:\n' +
                allFiles.map((g: { folder: string; files: string[] }) =>
                  `📁 ${g.folder}/\n${g.files.map((f: string) => `  - ${f}`).join('\n')}`
                ).join('\n');
            }
            if (keyFiles && keyFiles.length > 0) {
              fileContext += '\n\n以下是项目关键文件内容:\n' +
                keyFiles.map((f: { path: string; content: string }) =>
                  `--- ${f.path} ---\n${f.content.slice(0, 3000)}`
                ).join('\n\n');
            }
          }
        }
      } catch {
        // 获取文件上下文失败不阻断概览生成
      }

      setAnalysisStep(2);
      const prompt = `分析以下项目路径的完整文件结构，逐一分析每个文件夹和子文件，生成项目概览。项目路径: ${projectPath}${fileContext}

请基于完整的项目文件结构（包含所有文件夹和子文件），进行全面分析。
需要覆盖每一个目录层级，识别各文件夹的职责和包含的关键文件。
除了基础分析外，还需要分析：文件统计（总文件数、总行数、语言分布）、测试信息、API端点、安全注意事项、性能建议。

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
  "codeQuality": [{"label": "可维护性", "score": "高/中/低", "color": "green/yellow/red"}],
  "fileStats": {"totalFiles": 100, "totalLines": 5000, "languages": [{"name": "TypeScript", "files": 50, "percentage": 60}]},
  "testInfo": {"framework": "Jest", "coverage": "80%", "testFiles": 10},
  "apiEndpoints": [{"method": "GET", "path": "/api/xxx", "description": "说明"}],
  "securityNotes": ["安全注意事项1"],
  "performanceNotes": ["性能建议1"]
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
          ...(httpProxy && { httpProxy }),
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
            if (event.type === 'chunk') {
              fullText += event.text;
              setStreamingOverviewText(formatStreamingOverviewText(fullText));
            }
            if (event.type === 'error') throw new Error(event.error);
          } catch (e) {
            if (e instanceof Error && e.message !== jsonStr) throw e;
          }
        }
      }

      // 从响应文本中提取 JSON（去除 markdown 代码块包裹）
      const jsonText = extractOverviewJsonText(fullText);

      let data: ProjectOverview;
      try {
        data = JSON.parse(jsonText);
      } catch {
        // 尝试修复常见 JSON 错误（尾随逗号等）
        const cleaned = jsonText.replace(/,\s*([\]\}])/g, '$1');
        data = JSON.parse(cleaned);
      }
      setOverview(data);
      setAnalysisStep(4);
      saveCachedOverview(projectPath, data);
      useLogStore.getState().add('success', 'AI分析', `项目概览生成完成: ${data.name}`);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        const msg = e instanceof Error ? e.message : '生成失败';
        setGenError(msg);
        useLogStore.getState().add(
          'error',
          'AI分析',
          `项目概览生成失败: ${msg}`,
          buildAnalysisLogDetail({
            stage: 'project-overview',
            projectPath,
            provider,
            model: model || '默认模型',
            message: msg,
            partialOutput: getStreamPreview(fullText),
          }),
        );
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
    setStreamingCanvasText('');
    setCanvasStep(1);

    const { provider, apiKey, model, baseURL, customHeaders: customHeaders2, githubToken: githubToken2, httpProxy: httpProxy2 } = useSettingsStore.getState();
  let fullText = '';

    // 获取项目文件上下文，为 AI 识别入口和调用链提供支撑
    let fileContextStr = '';
    try {
      const { maxDepth, maxSubCalls } = useSettingsStore.getState();
      const ctxParams = new URLSearchParams({ projectPath });
      if (githubToken2) ctxParams.set('token', githubToken2);
      ctxParams.set('maxDepth', String(maxDepth));
      ctxParams.set('maxFiles', String(maxSubCalls));
      const ctxRes = await fetch(`http://localhost:3001/api/file-context?${ctxParams}`);
      if (ctxRes.ok) {
        const ctxData = await ctxRes.json();
        if (ctxData.success && ctxData.data) {
          // 完整文件清单
          if (ctxData.data.allFiles?.length) {
            fileContextStr += '\n\n项目完整文件结构:\n' +
              ctxData.data.allFiles.map((g: { folder: string; files: string[] }) =>
                `📁 ${g.folder}/\n${g.files.map((f: string) => `  - ${f}`).join('\n')}`
              ).join('\n');
          }
          if (ctxData.data.keyFiles?.length) {
            fileContextStr += '\n\n关键源文件内容:\n' +
              ctxData.data.keyFiles.map((f: { path: string; content: string }) =>
                `--- ${f.path} ---\n${f.content.slice(0, 3000)}`
              ).join('\n\n');
          }
        }
      }
    } catch { /* 不阻断 */ }

    useLogStore.getState().add('info', 'AI分析', '开始生成架构流程图和调用链');

    setCanvasStep(2);
    // 仅在流长时间无数据时中断，避免把慢任务误判为超时
    const timeout = createIdleStreamTimeout(180000);

    const prompt = `根据以下项目信息和源代码，生成一个详细的项目架构调用链流程图：
项目名称: ${overview.name}
项目描述: ${overview.description}
技术栈: ${overview.techStack.join(', ')}
核心模块: ${overview.modules.map((m) => `${m.name}(${m.status})`).join(', ')}
${overview.entryPoints?.length ? `入口文件: ${overview.entryPoints.join(', ')}` : ''}
${overview.progress ? `进度: ${overview.progress}` : ''}
${fileContextStr}

要求：
1. 识别项目入口文件和入口函数，作为 start 节点
2. 逐层展开关键调用链，用 process 节点表示核心函数/模块
3. 用 decision 节点表示分支逻辑（如路由分发、条件处理）
4. 用 data 节点表示数据源（数据库、API、配置文件等）
5. 用 end 节点表示输出/终端
6. 每个节点的 data.filePath 填写文件路径，data.lineStart 填写行号（如已知）
7. 每个节点的 data.description 简要说明该函数/模块的职责
8. 使用 data.tags 标注模块分类（如 ["入口", "路由"], ["核心逻辑"], ["数据层"]）
9. 连线 label 标注调用方式或条件（如 "HTTP请求", "import", "事件触发"）

重要：这是自动化一键生成场景，不允许提问或要求澄清。请根据已有信息直接生成最佳的架构流程图。如果信息不足，请基于合理推断生成。`;

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
          ...(httpProxy2 && { httpProxy: httpProxy2 }),
        }),
        signal: timeout.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: '请求失败' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      // 消费 SSE 流 — 后端会自动解析 GraphDiff 并通过 WebSocket 广播到画布
      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法获取响应流');

      setCanvasStep(3);
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        timeout.touch();

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === 'chunk') {
              fullText += event.text;
              setStreamingCanvasText(formatStreamingOverviewText(fullText, '正在流式输出架构图内容...'));
            }
            if (event.type === 'error') {
              throw new Error(event.error || '生成失败');
            }
            if (event.type === 'done' && event.graph) {
              useGraphStore.getState().replaceGraph(event.graph);
              useLogStore.getState().add('success', 'AI分析', `架构图生成完成，${event.graph.nodes?.length || 0} 个节点`);
            }
            // AI 返回文本而非 JSON（可能是提问或说明）
            if (event.type === 'done' && event.text && !event.graph) {
              // 检查是否包含问题标记
              const hasQuestion = event.text.includes('❓') || event.text.includes('?') || event.text.includes('？');
              if (hasQuestion) {
                setCanvasError('AI 需要更多信息才能生成架构图。建议：使用 Chat 面板与 AI 对话澄清需求后再生成。');
                useLogStore.getState().add(
                  'warn',
                  'AI分析',
                  'AI 返回了提问而非架构图',
                  buildAnalysisLogDetail({
                    stage: 'architecture-canvas',
                    projectPath,
                    aiResponse: event.text.slice(0, 500),
                    hint: '请使用 Chat 面板与 AI 对话，或提供更详细的项目信息。',
                  }),
                );
              } else {
                setCanvasError('AI 返回了文本说明而非架构图 JSON');
                useLogStore.getState().add(
                  'warn',
                  'AI分析',
                  'AI 返回了文本而非架构图',
                  buildAnalysisLogDetail({
                    stage: 'architecture-canvas',
                    projectPath,
                    aiResponse: event.text.slice(0, 500),
                  }),
                );
              }
            }
          } catch (e) {
            if (e instanceof Error && e.message !== jsonStr) throw e;
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '架构图生成失败';
      if ((e as Error).name === 'AbortError') {
        setCanvasError('生成超时，请尝试简化项目或检查网络连接');
        useLogStore.getState().add(
          'error',
          'AI分析',
          '架构图生成超时',
          buildAnalysisLogDetail({
            stage: 'architecture-canvas',
            projectPath,
            provider,
            model: model || '默认模型',
            idleTimeoutMs: 180000,
            partialOutput: getStreamPreview(fullText),
            hint: '请尝试缩小项目范围、减少上下文文件数量，或检查网络连接。',
          }),
        );
      } else {
        setCanvasError(msg);
        useLogStore.getState().add(
          'error',
          'AI分析',
          `架构图生成失败: ${msg}`,
          buildAnalysisLogDetail({
            stage: 'architecture-canvas',
            projectPath,
            provider,
            model: model || '默认模型',
            message: msg,
            partialOutput: getStreamPreview(fullText),
          }),
        );
      }
    } finally {
      timeout.dispose();
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
        fileStats: overview.fileStats || undefined,
        testInfo: overview.testInfo || undefined,
        apiEndpoints: Array.isArray(overview.apiEndpoints) ? overview.apiEndpoints : undefined,
        securityNotes: Array.isArray(overview.securityNotes) ? overview.securityNotes : undefined,
        performanceNotes: Array.isArray(overview.performanceNotes) ? overview.performanceNotes : undefined,
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
              {!displayOverview?.description && hitokoto && (
                <p className="text-[11px] text-on-surface-variant/60 leading-relaxed italic line-clamp-2">
                  「{hitokoto.text}」{hitokoto.from && <span className="text-[10px] not-italic ml-1">—— {hitokoto.from}</span>}
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
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors disabled:opacity-50 text-xs font-medium mt-2"
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
          {/* 项目分析流输出窗口 */}
          {generating && streamingOverviewText && (
            <div className="mb-6 rounded-2xl border border-primary/10 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">terminal</span>
                  <span className="text-[11px] font-semibold text-slate-700">流式输出</span>
                </div>
                <span className="text-[9px] text-slate-400">{streamingOverviewText.length} 字符</span>
              </div>
              <div className="px-4 py-3 max-h-64 overflow-y-auto bg-slate-900 font-mono">
                <pre className="text-[10px] text-green-400 leading-relaxed whitespace-pre-wrap break-words">{streamingOverviewText}</pre>
              </div>
            </div>
          )}

          {/* 架构图流输出窗口 */}
          {generatingCanvas && streamingCanvasText && (
            <div className="mb-6 rounded-2xl border border-secondary/10 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-sm">terminal</span>
                  <span className="text-[11px] font-semibold text-slate-700">流式输出</span>
                </div>
                <span className="text-[9px] text-slate-400">{streamingCanvasText.length} 字符</span>
              </div>
              <div className="px-4 py-3 max-h-64 overflow-y-auto bg-slate-900 font-mono">
                <pre className="text-[10px] text-green-400 leading-relaxed whitespace-pre-wrap break-words">{streamingCanvasText}</pre>
              </div>
            </div>
          )}

          {/* 技术栈 */}
          {!generating && displayOverview && displayOverview.techStack.length > 0 && (
            <div className="mb-6">
              <label className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-on-surface-variant/60 mb-3">
                <span className="material-symbols-outlined text-sm text-primary/50">code</span>
                技术栈
              </label>
              <div className="flex flex-wrap gap-2">
                {displayOverview.techStack.map((tech, i) => (
                  <span key={tech} className="px-2.5 py-1.5 bg-surface-container-highest text-on-surface text-xs rounded-lg flex items-center gap-1.5 ghost-border-soft shadow-sm">
                    <span className={`w-2 h-2 rounded-full ${TAG_COLORS[i % TAG_COLORS.length]}`}></span> {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 核心模块列表 */}
          {!generating && displayOverview && displayOverview.modules.length > 0 && (
            <div className="mb-6 pt-4 border-t border-outline-variant/6">
              <label className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-on-surface-variant/60 mb-3">
                <span className="material-symbols-outlined text-sm text-primary/50">widgets</span>
                核心模块
              </label>
              <div className="space-y-2.5">
                {displayOverview.modules.map((mod, i) => {
                  const color = MODULE_COLORS[i % MODULE_COLORS.length];
                  return (
                    <div key={mod.name} className="flex items-center gap-3 py-1">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${color.bg}`}></div>
                      <span className="text-xs text-on-surface font-medium shrink-0">{mod.name}</span>
                      <span className="text-[11px] text-on-surface-variant/60 truncate">{mod.status}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-on-surface-variant/50 mt-3">
                已识别 {displayOverview.modules.length} 个模块
              </p>
            </div>
          )}

          {/* 架构模式 */}
          {!generating && displayOverview?.architecture && (
            <div className="mb-6 pt-4 border-t border-outline-variant/6">
              <label className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-on-surface-variant/60 mb-3">
                <span className="material-symbols-outlined text-sm text-primary/50">architecture</span>
                架构模式
              </label>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-surface-container-highest/40 ghost-border-soft">
                <span className="material-symbols-outlined text-base text-primary shrink-0 mt-0.5">architecture</span>
                <p className="text-xs text-on-surface leading-relaxed">{displayOverview.architecture}</p>
              </div>
            </div>
          )}

          {/* 核心依赖 */}
          {!generating && displayOverview && displayOverview.dependencies && displayOverview.dependencies.length > 0 && (
            <div className="mb-6 pt-4 border-t border-outline-variant/6">
              <label className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-on-surface-variant/60 mb-3">
                <span className="material-symbols-outlined text-sm text-primary/50">link</span>
                核心依赖
              </label>
              <div className="flex flex-wrap gap-1.5">
                {displayOverview.dependencies.map((dep) => (
                  <span key={dep} className="px-2 py-0.5 bg-surface-container-highest/60 text-on-surface-variant text-[11px] rounded-md ghost-border-soft">
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 项目指标 */}
          {!generating && displayOverview && displayOverview.metrics && displayOverview.metrics.length > 0 && (
            <div className="mb-6 pt-4 border-t border-outline-variant/6">
              <label className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-on-surface-variant/60 mb-3">
                <span className="material-symbols-outlined text-sm text-primary/50">monitoring</span>
                项目指标
              </label>
              <div className="grid grid-cols-2 gap-2">
                {displayOverview.metrics.map((m) => (
                  <div key={m.label} className="p-2.5 rounded-xl bg-surface-container-highest/30 ghost-border-soft text-center">
                    <p className="text-xs font-semibold text-on-surface">{m.value}</p>
                    <p className="text-[10px] text-on-surface-variant/60 mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 代码质量评估 */}
          {!generating && displayOverview && displayOverview.codeQuality && displayOverview.codeQuality.length > 0 && (
            <div className="mb-6 pt-4 border-t border-outline-variant/6">
              <label className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-on-surface-variant/60 mb-3">
                <span className="material-symbols-outlined text-sm text-primary/50">verified</span>
                质量评估
              </label>
              <div className="space-y-2">
                {displayOverview.codeQuality.map((q) => (
                  <div key={q.label} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-surface-container-highest/30 ghost-border-soft">
                    <span className="text-xs text-on-surface">{q.label}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
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
            <div className="mb-6 pt-4 border-t border-outline-variant/6">
              <label className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-on-surface-variant/60 mb-3">
                <span className="material-symbols-outlined text-sm text-primary/50">design_services</span>
                设计模式
              </label>
              <div className="flex flex-wrap gap-1.5">
                {displayOverview.designPatterns.map((pattern) => (
                  <span key={pattern} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[11px] rounded-md font-medium">
                    {pattern}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 入口文件 */}
          {!generating && displayOverview && displayOverview.entryPoints && displayOverview.entryPoints.length > 0 && (
            <div className="mb-6 pt-4 border-t border-outline-variant/6">
              <label className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-on-surface-variant/60 mb-3">
                <span className="material-symbols-outlined text-sm text-primary/50">login</span>
                入口文件
              </label>
              <div className="space-y-1.5">
                {displayOverview.entryPoints.map((entry) => (
                  <div key={entry} className="flex items-center gap-2 py-1">
                    <span className="material-symbols-outlined text-xs text-on-surface-variant/50">description</span>
                    <span className="text-[11px] text-on-surface-variant font-mono">{entry}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 构建工具 */}
          {!generating && displayOverview && displayOverview.buildTools && displayOverview.buildTools.length > 0 && (
            <div className="mb-6 pt-4 border-t border-outline-variant/6">
              <label className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-on-surface-variant/60 mb-3">
                <span className="material-symbols-outlined text-sm text-primary/50">build</span>
                构建工具
              </label>
              <div className="flex flex-wrap gap-1.5">
                {displayOverview.buildTools.map((tool) => (
                  <span key={tool} className="px-2 py-0.5 bg-surface-container-highest/60 text-on-surface-variant text-[11px] rounded-md ghost-border-soft flex items-center gap-1">
                    <span className="material-symbols-outlined text-[11px]">build</span>
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 进度描述 */}
          {!generating && displayOverview?.progress && (
            <div className="mb-6 pt-4 border-t border-outline-variant/6">
              <label className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-on-surface-variant/60 mb-3">
                <span className="material-symbols-outlined text-sm text-primary/50">trending_up</span>
                进度概要
              </label>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 ghost-border-soft">
                <span className="material-symbols-outlined text-base text-primary shrink-0 mt-0.5">info</span>
                <p className="text-xs text-on-surface leading-relaxed">{displayOverview.progress}</p>
              </div>
            </div>
          )}

          {/* 风险与技术债务 */}
          {!generating && displayOverview && displayOverview.risks && displayOverview.risks.length > 0 && (
            <div className="mb-6 pt-4 border-t border-outline-variant/6">
              <label className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-on-surface-variant/60 mb-3">
                <span className="material-symbols-outlined text-xs text-amber-500/70">warning</span>
                风险提示
              </label>
              <div className="space-y-1.5">
                {displayOverview.risks.map((risk, i) => (
                  <div key={i} className="flex items-start gap-2 py-1">
                    <span className="material-symbols-outlined text-xs text-amber-500 shrink-0 mt-0.5">warning</span>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">{risk}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 文件统计 */}
          {!generating && displayOverview?.fileStats && (
            <div className="mb-6 pt-4 border-t border-outline-variant/6">
              <label className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-on-surface-variant/60 mb-3">
                <span className="material-symbols-outlined text-sm text-primary/50">insert_chart</span>
                文件统计
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-3 rounded-xl bg-blue-50 text-center shadow-sm">
                  <p className="text-sm font-bold text-blue-700">{displayOverview.fileStats.totalFiles}</p>
                  <p className="text-[10px] text-blue-500 mt-0.5">总文件数</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 text-center shadow-sm">
                  <p className="text-sm font-bold text-purple-700">{displayOverview.fileStats.totalLines?.toLocaleString()}</p>
                  <p className="text-[10px] text-purple-500 mt-0.5">估计总行数</p>
                </div>
              </div>
              {displayOverview.fileStats.languages && displayOverview.fileStats.languages.length > 0 && (
                <div className="space-y-2">
                  {displayOverview.fileStats.languages.map((lang: { name: string; percentage: number }) => (
                    <div key={lang.name} className="flex items-center gap-2">
                      <span className="text-xs text-on-surface font-medium w-20 truncate">{lang.name}</span>
                      <div className="flex-1 h-2 rounded-full bg-surface-container-highest/40 overflow-hidden">
                        <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.min(100, lang.percentage)}%` }}></div>
                      </div>
                      <span className="text-[10px] text-on-surface-variant w-10 text-right">{lang.percentage}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 测试信息 */}
          {!generating && displayOverview?.testInfo && (
            <div className="mb-6 pt-4 border-t border-outline-variant/6">
              <label className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-on-surface-variant/60 mb-3">
                <span className="material-symbols-outlined text-sm text-primary/50">science</span>
                测试信息
              </label>
              <div className="p-3 rounded-xl bg-green-50/50 ghost-border-soft space-y-2 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-on-surface-variant truncate">框架</span>
                  <span className="text-xs font-medium text-on-surface text-right break-words min-w-0">{displayOverview.testInfo.framework}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-on-surface-variant truncate">覆盖率</span>
                  <span className="text-xs font-medium text-green-600 text-right break-words min-w-0">{displayOverview.testInfo.coverage}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-on-surface-variant truncate">测试文件数</span>
                  <span className="text-xs font-medium text-on-surface text-right break-words min-w-0">{displayOverview.testInfo.testFiles}</span>
                </div>
              </div>
            </div>
          )}

          {/* API 端点 */}
          {!generating && displayOverview?.apiEndpoints && displayOverview.apiEndpoints.length > 0 && (
            <div className="mb-6 pt-4 border-t border-outline-variant/6">
              <label className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-on-surface-variant/60 mb-3">
                <span className="material-symbols-outlined text-sm text-primary/50">api</span>
                API 端点
              </label>
              <div className="space-y-1.5">
                {displayOverview.apiEndpoints.map((ep: { method: string; path: string }, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-highest/30 ghost-border-soft">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      ep.method === 'GET' ? 'bg-green-100 text-green-700' :
                      ep.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                      ep.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                      ep.method === 'DELETE' ? 'bg-red-100 text-red-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>{ep.method}</span>
                    <span className="text-[11px] text-on-surface font-mono truncate flex-1">{ep.path}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 性能建议 */}
          {!generating && displayOverview?.performanceNotes && displayOverview.performanceNotes.length > 0 && (
            <div className="mb-6 pt-4 border-t border-outline-variant/6">
              <label className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-on-surface-variant/60 mb-3">
                <span className="material-symbols-outlined text-sm text-blue-500/70">speed</span>
                性能建议
              </label>
              <div className="space-y-1.5">
                {displayOverview.performanceNotes.map((note: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 py-1">
                    <span className="material-symbols-outlined text-xs text-blue-500 shrink-0 mt-0.5">bolt</span>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 安全备注 */}
          {!generating && displayOverview?.securityNotes && displayOverview.securityNotes.length > 0 && (
            <div className="mb-6 pt-4 border-t border-outline-variant/6">
              <label className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-on-surface-variant/60 mb-3">
                <span className="material-symbols-outlined text-sm text-emerald-500/70">shield</span>
                安全备注
              </label>
              <div className="space-y-1.5">
                {displayOverview.securityNotes.map((note: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 py-1">
                    <span className="material-symbols-outlined text-xs text-emerald-500 shrink-0 mt-0.5">check_circle</span>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">{note}</p>
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
