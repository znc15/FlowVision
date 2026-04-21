import { useState, useRef, useCallback } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useLogStore } from '../../store/logStore';
import { useToastStore } from '../../store/toastStore';
import { useTabStore } from '../../store/tabStore';
import { getBackendUrl } from '../../utils/backend';
import { buildFileImportContext, buildProjectImportContext } from '../../utils/chatContext';

const PROJECT_PATH_KEY = 'flowvision-project-path';
const SELECTED_FILE_KEY = 'flowvision-selected-file';

interface ImportedContextItem {
  path: string;
  label: string;
  text: string;
}

/** 生成 Prompt 的元提示词 */
const META_SYSTEM_PROMPT = `你是一个专业的流程图 Prompt 工程师。用户会描述一个场景或提供现有流程图/代码，你需要生成一段高质量的 Prompt，帮助 AI 流程图生成器产出清晰、完整、专业的流程图。

## 输出规则
1. 直接输出 Prompt 文本，不要包含解释或前缀
2. Prompt 应包含：场景描述、核心流程步骤、判断分支、异常处理路径
3. 长度适中（100-300 字），既详细又不冗余
4. 使用自然语言描述，不要输出 JSON 或代码
5. 包含关键节点类型提示（如"使用 decision 节点表示分支判断"）
6. 尽量覆盖正常流程和异常流程
7. 如果用户提供了现有流程图或代码，基于其内容优化和扩展`;

function PromptGenerator() {
  const [input, setInput] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [includeCanvas, setIncludeCanvas] = useState(false);
  const [importingFile, setImportingFile] = useState(false);
  const [importingProject, setImportingProject] = useState(false);
  const [importedFiles, setImportedFiles] = useState<ImportedContextItem[]>([]);
  const [importedProject, setImportedProject] = useState<ImportedContextItem | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canvasTabs = useTabStore((s) => s.tabs);

  const handleImportProject = useCallback(async () => {
    const projectPath = (() => {
      try { return localStorage.getItem(PROJECT_PATH_KEY) || ''; } catch { return ''; }
    })();

    if (!projectPath) {
      useToastStore.getState().show('请先在文件浏览器打开项目', 'info');
      return;
    }

    setImportingProject(true);
    try {
      const params = new URLSearchParams({ projectPath });
      const { maxDepth, maxSubCalls, githubToken } = useSettingsStore.getState();
      params.set('maxDepth', String(maxDepth));
      params.set('maxFiles', String(maxSubCalls));
      if (githubToken && projectPath.startsWith('github:')) {
        params.set('token', githubToken);
      }

      const response = await fetch(`${getBackendUrl()}/api/file-context?${params}`);
      const data = await response.json();
      if (!response.ok || !data.success || !data.data) {
        throw new Error(data.error || '项目上下文导入失败');
      }

      const label = projectPath.split(/[/\\]/).pop() || projectPath;
      setImportedProject({
        path: projectPath,
        label,
        text: buildProjectImportContext(projectPath, data.data),
      });
      useToastStore.getState().show(`已导入项目：${label}`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : '项目上下文导入失败';
      useToastStore.getState().show(message, 'error');
    } finally {
      setImportingProject(false);
    }
  }, []);

  const handleImportFile = useCallback(async () => {
    const projectPath = (() => {
      try { return localStorage.getItem(PROJECT_PATH_KEY) || ''; } catch { return ''; }
    })();
    const filePath = (() => {
      try { return localStorage.getItem(SELECTED_FILE_KEY) || ''; } catch { return ''; }
    })();

    if (!projectPath) {
      useToastStore.getState().show('请先在文件浏览器打开项目', 'info');
      return;
    }
    if (!filePath) {
      useToastStore.getState().show('请先在文件浏览器选中文件', 'info');
      return;
    }

    setImportingFile(true);
    try {
      const params = new URLSearchParams({ projectPath, filePath });
      const { githubToken } = useSettingsStore.getState();
      if (githubToken && projectPath.startsWith('github:')) {
        params.set('token', githubToken);
      }

      const response = await fetch(`${getBackendUrl()}/api/file-content?${params}`);
      const data = await response.json();
      if (!response.ok || !data.success || typeof data.data?.content !== 'string') {
        throw new Error(data.error || '文件上下文导入失败');
      }

      const label = filePath.split(/[/\\]/).pop() || filePath;
      const newItem: ImportedContextItem = {
        path: filePath,
        label,
        text: buildFileImportContext(filePath, data.data.content),
      };
      setImportedFiles((prev) => {
        if (prev.some((f) => f.path === filePath)) return prev;
        return [...prev, newItem];
      });
      useToastStore.getState().show(`已导入文件：${label}`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : '文件上下文导入失败';
      useToastStore.getState().show(message, 'error');
    } finally {
      setImportingFile(false);
    }
  }, []);

  const removeImportedFile = useCallback((path: string) => {
    setImportedFiles((prev) => prev.filter((f) => f.path !== path));
  }, []);

  const handleGenerate = async (scenarioHint?: string) => {
    const userInput = (scenarioHint || input).trim();
    if (!userInput || generating) return;

    setGenerating(true);
    setGeneratedPrompt('');

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const { provider, apiKey, model, baseURL, customHeaders, httpProxy, maxOutputTokens, maxContextTokens } = useSettingsStore.getState();
    useLogStore.getState().add('info', 'Prompt生成', `开始生成 Prompt: ${userInput}`);

    // 构建完整 prompt，包含画布和文件上下文
    let fullPrompt = userInput;

    if (includeCanvas && canvasTabs.length > 0) {
      const allTabsContext = canvasTabs.map((tab) => {
        const tabNodes = tab.graph?.nodes || [];
        const tabEdges = tab.graph?.edges || [];
        if (tabNodes.length === 0) return null;
        return `画布「${tab.title}」（${tabNodes.length} 个节点，${tabEdges.length} 条连线）：
${JSON.stringify({ nodes: tabNodes.map((n: any) => ({ id: n.id, type: n.type, label: n.data?.label })), edges: tabEdges.map((e: any) => ({ source: e.source, target: e.target, label: e.label })) }, null, 2)}`;
      }).filter(Boolean).join('\n\n');

      if (allTabsContext) {
        fullPrompt = `${allTabsContext}\n\n用户需求：${userInput}`;
      }
    }

    if (importedProject) {
      fullPrompt = `${importedProject.text}\n\n${fullPrompt}`;
    }

    for (const file of importedFiles) {
      fullPrompt = `${file.text}\n\n${fullPrompt}`;
    }

    try {
      const response = await fetch(`${getBackendUrl()}/api/ai/generate-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: fullPrompt,
          currentGraph: { nodes: [], edges: [] },
          mode: 'incremental',
          provider,
          ...(apiKey && { apiKey }),
          ...(model && { model }),
          ...(baseURL && { baseURL }),
          systemPrompt: META_SYSTEM_PROMPT,
          ...(Object.keys(customHeaders).length > 0 && { customHeaders }),
          ...(httpProxy && { httpProxy }),
          ...(maxOutputTokens && { maxOutputTokens }),
          ...(maxContextTokens && { maxContextTokens }),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: '请求失败' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法获取响应流');

      const decoder = new TextDecoder();
      let buffer = '';
      let result = '';

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
              result += event.text;
              setGeneratedPrompt(result);
            } else if (event.type === 'done' && event.text) {
              result = event.text;
              setGeneratedPrompt(result);
            }
          } catch { /* 非 JSON 行 */ }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setGeneratedPrompt(`生成失败：${error instanceof Error ? error.message : '请检查 API 配置'}`);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 标题 */}
      <div className="workbench-panel-header px-5">
        <div>
          <h2 className="text-title-sm font-semibold text-on-surface">Prompt 生成</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* 输入区域 */}
        <div>
          <label className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-widest block mb-2">
            描述你的场景
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如：电商平台的用户退货退款流程，包含申请、审核、物流、退款等环节..."
            rows={3}
            className="w-full rounded-xl bg-surface-container-highest/92 py-3 px-4 text-xs text-on-surface placeholder:text-on-surface-variant/40 outline-none ghost-border-soft focus:ring-2 focus:ring-primary/20 transition-all duration-200 resize-none"
            disabled={generating}
          />
        </div>

        {/* 上下文选项 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIncludeCanvas(!includeCanvas)}
            disabled={generating || canvasTabs.length === 0}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
              includeCanvas
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="material-symbols-outlined text-sm">dashboard</span>
            包含画布 ({canvasTabs.length})
          </button>
          <button
            onClick={() => void handleImportProject()}
            disabled={generating || importingProject}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all duration-200 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-sm ${importingProject ? 'animate-spin' : ''}`}>
              {importingProject ? 'progress_activity' : 'folder_open'}
            </span>
            {importingProject ? '导入中...' : '导入项目'}
          </button>
          <button
            onClick={() => void handleImportFile()}
            disabled={generating || importingFile}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all duration-200 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-sm ${importingFile ? 'animate-spin' : ''}`}>
              {importingFile ? 'progress_activity' : 'upload_file'}
            </span>
            {importingFile ? '导入中...' : '导入文件'}
          </button>
          {importedProject && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-blue-50 text-blue-700">
              <span className="material-symbols-outlined text-sm">folder</span>
              项目: {importedProject.label}
              <button
                onClick={() => setImportedProject(null)}
                className="ml-1 hover:text-blue-900"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}
          {importedFiles.map((file) => (
            <div key={file.path} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-green-50 text-green-700">
              <span className="material-symbols-outlined text-sm">description</span>
              {file.label}
              <button
                onClick={() => removeImportedFile(file.path)}
                className="ml-1 hover:text-green-900"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ))}
        </div>

        <div>
          <button
            onClick={() => void handleGenerate()}
            disabled={!input.trim() || generating}
            className="mt-2 w-full gradient-button py-2.5 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                生成中...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                AI 生成 Prompt
              </>
            )}
          </button>
        </div>

        {/* 生成结果 */}
        {generatedPrompt && (
          <div className="animate-[fadeIn_200ms_ease-out]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-widest">生成结果</p>
              <button
                onClick={handleCopy}
                className="icon-button-soft h-7 w-7"
                title="复制"
              >
                <span className="material-symbols-outlined text-sm">
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
            <div className="rounded-xl bg-white p-4 ghost-border-soft shadow-sm">
              <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">{generatedPrompt}</p>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-all duration-200 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
                {copied ? '已复制' : '复制 Prompt'}
              </button>
              <button
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-50 text-slate-600 text-[11px] font-medium hover:bg-slate-100 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                重新生成
              </button>
            </div>
          </div>
        )}

        {/* 空状态提示 */}
        {!generatedPrompt && !generating && (
          <div className="flex flex-col items-center text-center py-6 opacity-60">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 mb-2">auto_awesome</span>
            <p className="text-[10px] text-on-surface-variant/50 leading-relaxed">
              描述你想要的流程图场景<br />可选：包含画布内容或导入文件
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PromptGenerator;
