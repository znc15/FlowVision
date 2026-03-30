import { useState, useRef } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useLogStore } from '../../store/logStore';
import { useGraphStore } from '../../store/graphStore';
import { useTabStore } from '../../store/tabStore';

/** 快速场景卡片 */
const QUICK_SCENARIOS = [
  { icon: 'login', label: '用户认证', hint: '用户登录注册流程，包含 OAuth 第三方登录、密码重置、验证码校验' },
  { icon: 'shopping_cart', label: '电商交易', hint: '电商订单完整生命周期，包含下单、支付、库存扣减、发货、退款' },
  { icon: 'approval', label: '审批流程', hint: '多级审批流程，包含提交、逐级审核、驳回修改、最终通知' },
  { icon: 'cloud_sync', label: '数据管道', hint: 'ETL 数据处理管道，包含采集、清洗、转换、加载、质量校验' },
  { icon: 'rocket_launch', label: 'DevOps', hint: 'CI/CD 持续集成部署流程，包含构建、测试、灰度发布、回滚' },
  { icon: 'support_agent', label: '客服工单', hint: '客服工单处理流程，包含创建、分配、处理、升级、关闭' },
];

/** 生成 Prompt 的元提示词 */
const META_SYSTEM_PROMPT = `你是一个专业的流程图 Prompt 工程师。用户会描述一个场景，你需要生成一段高质量的 Prompt，帮助 AI 流程图生成器产出清晰、完整、专业的流程图。

## 输出规则
1. 直接输出 Prompt 文本，不要包含解释或前缀
2. Prompt 应包含：场景描述、核心流程步骤、判断分支、异常处理路径
3. 长度适中（100-300 字），既详细又不冗余
4. 使用自然语言描述，不要输出 JSON 或代码
5. 包含关键节点类型提示（如"使用 decision 节点表示分支判断"）
6. 尽量覆盖正常流程和异常流程`;

function PromptGenerator() {
  const [input, setInput] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [useCanvas, setUseCanvas] = useState(false);
  const [selectedTabId, setSelectedTabId] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);

  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const currentNodes = useGraphStore((s) => s.nodes);
  const currentEdges = useGraphStore((s) => s.edges);

  /** 获取选中画布数据描述 */
  const getCanvasContext = (): string => {
    if (!useCanvas) return '';
    const tabId = selectedTabId || activeTabId;
    let nodes = currentNodes;
    let edges = currentEdges;

    if (tabId && tabId !== activeTabId) {
      const tab = tabs.find((t) => t.id === tabId);
      if (tab) {
        nodes = tab.graph.nodes;
        edges = tab.graph.edges;
      }
    }

    if (nodes.length === 0) return '';

    const nodeDescriptions = nodes.map((n) =>
      `- [${n.type}] ${n.data.label}${n.data.description ? ': ' + n.data.description : ''}`
    ).join('\n');
    const edgeDescriptions = edges.map((e) => {
      const srcNode = nodes.find((n) => n.id === e.source);
      const tgtNode = nodes.find((n) => n.id === e.target);
      return `- ${srcNode?.data.label || e.source} → ${tgtNode?.data.label || e.target}${e.label ? ' (' + e.label + ')' : ''}`;
    }).join('\n');

    return `\n\n当前画布包含以下流程图内容，请基于此生成优化的 Prompt：\n节点 (${nodes.length} 个):\n${nodeDescriptions}\n连线 (${edges.length} 条):\n${edgeDescriptions}`;
  };

  /** 获取项目上下文 */
  const getProjectContext = (): string => {
    try {
      const raw = localStorage.getItem('flowvision-project-overview');
      if (!raw) return '';
      const overview = JSON.parse(raw)?.data;
      if (!overview) return '';
      return `\n\n项目信息: ${overview.name} - ${overview.description}\n技术栈: ${(overview.techStack || []).join(', ')}`;
    } catch { return ''; }
  };

  const handleGenerate = async (scenarioHint?: string) => {
    const userInput = (scenarioHint || input).trim();
    if (!userInput || generating) return;

    setGenerating(true);
    setGeneratedPrompt('');

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const { provider, apiKey, model, baseURL, customHeaders, httpProxy } = useSettingsStore.getState();
    useLogStore.getState().add('info', 'Prompt生成', `开始生成 Prompt: ${userInput}`);

    const canvasCtx = getCanvasContext();
    const projectCtx = getProjectContext();
    const fullPrompt = userInput + canvasCtx + projectCtx;

    try {
      const response = await fetch('http://localhost:3001/api/ai/generate-stream', {
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
          <p className="text-[9px] text-on-surface-variant/50 mt-0.5">AI 辅助生成高质量流程图 Prompt</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* 快速场景卡片 */}
        <div>
          <p className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-widest mb-2">快速场景</p>
          <div className="grid grid-cols-3 gap-1.5">
            {QUICK_SCENARIOS.map((s) => (
              <button
                key={s.label}
                onClick={() => { setInput(s.hint); void handleGenerate(s.hint); }}
                disabled={generating}
                className="flex flex-col items-center gap-1 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all duration-200 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] ghost-border-soft"
              >
                <span className="material-symbols-outlined text-base text-primary">{s.icon}</span>
                <span className="text-[9px] text-on-surface-variant leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

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

        {/* 画布和项目选择 */}
        <div className="space-y-2">
          <label
            className="flex items-center gap-2 cursor-pointer select-none group"
            onClick={() => setUseCanvas((v) => !v)}
          >
            <span className={`w-4 h-4 rounded flex items-center justify-center border transition-all duration-200 ${useCanvas ? 'bg-primary border-primary' : 'border-slate-300 group-hover:border-primary/50'}`}>
              {useCanvas && <span className="material-symbols-outlined text-white text-xs">check</span>}
            </span>
            <span className="text-[10px] text-on-surface-variant">基于画布流程图生成 Prompt</span>
          </label>
          {useCanvas && tabs.length > 0 && (
            <select
              value={selectedTabId || activeTabId}
              onChange={(e) => setSelectedTabId(e.target.value)}
              className="w-full rounded-lg bg-surface-container-highest/60 py-1.5 px-3 text-[10px] text-on-surface outline-none ghost-border-soft"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.title}{tab.id === activeTabId ? ' (当前)' : ''} · {tab.graph.nodes.length} 节点
                </option>
              ))}
            </select>
          )}
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
              描述你想要的流程图场景<br />AI 将生成优化的 Prompt
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PromptGenerator;
