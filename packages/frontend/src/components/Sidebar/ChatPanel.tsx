import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useGraphStore } from '../../store/graphStore';
import { usePreviewStore } from '../../store/previewStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useChatStore } from '../../store/chatStore';
import { logger } from '../../utils/logger';

// 预设 prompt 模板
const PRESET_TEMPLATES = [
  { icon: 'login', label: '用户登录流程', prompt: '生成一个用户登录流程图，包含输入账号密码、验证、成功/失败分支' },
  { icon: 'shopping_cart', label: '订单处理流程', prompt: '生成一个电商订单处理流程图，包含下单、支付、发货、确认收货' },
  { icon: 'approval', label: '审批流程', prompt: '生成一个多级审批流程图，包含提交申请、部门审批、领导审批、通知结果' },
  { icon: 'sync', label: '数据同步流程', prompt: '生成一个数据同步流程图，包含数据采集、清洗、转换、加载、校验' },
  { icon: 'bug_report', label: '异常处理流程', prompt: '生成一个异常处理流程图，包含错误检测、分类、处理、重试、上报' },
  { icon: 'rocket_launch', label: 'CI/CD 流程', prompt: '生成一个 CI/CD 部署流程图，包含代码提交、构建、测试、部署、监控' },
];

/** 节点类型对应的图标和颜色 */
const NODE_TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  start: { icon: 'play_circle', color: 'text-green-600 bg-green-50', label: '开始' },
  end: { icon: 'stop_circle', color: 'text-red-500 bg-red-50', label: '结束' },
  process: { icon: 'settings', color: 'text-blue-600 bg-blue-50', label: '流程' },
  decision: { icon: 'call_split', color: 'text-amber-600 bg-amber-50', label: '判断' },
  data: { icon: 'database', color: 'text-purple-600 bg-purple-50', label: '数据' },
  group: { icon: 'folder', color: 'text-slate-600 bg-slate-50', label: '分组' },
};

/** 尝试从消息内容中解析 GraphDiff JSON */
function tryParseGraphDiff(content: string) {
  try {
    const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.add && parsed.add.nodes && Array.isArray(parsed.add.nodes)) {
      return parsed;
    }
  } catch { /* 不是有效的 GraphDiff */ }
  return null;
}

/** 可折叠的思考内容块 */
function ThinkingBlock({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[10px] text-violet-600 hover:text-violet-700 font-medium transition-colors group"
      >
        <span className={`material-symbols-outlined text-xs transition-transform duration-150 ${open ? 'rotate-90' : ''}`}>
          chevron_right
        </span>
        <span className="material-symbols-outlined text-xs">psychology</span>
        {isStreaming && !content ? '思考中...' : `思考过程 (${content.length} 字)`}
        {isStreaming && content && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse ml-1"></span>
        )}
      </button>
      <div className={`overflow-hidden transition-all duration-200 ease-out ${open ? 'max-h-[2000px] opacity-100 mt-1.5' : 'max-h-0 opacity-0'}`}>
        <div className="pl-5 border-l-2 border-violet-200">
          <p className="text-[10px] text-slate-500 leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  );
}

/** 格式化 AI 消息内容：将 GraphDiff 渲染为步骤卡片 */
function FormattedAIMessage({ content, graphDiff, thinking, onApplyDiff, isStreaming }: { content: string; graphDiff?: any; thinking?: string; onApplyDiff?: (diff: any) => void; isStreaming?: boolean }) {
  const diff = useMemo(() => graphDiff || tryParseGraphDiff(content), [content, graphDiff]);

  // 流式传输中且内容看起来像 JSON，显示加载指示器
  if (isStreaming && !graphDiff && content.trim().startsWith('{')) {
    return (
      <div>
        {thinking && <ThinkingBlock content={thinking} isStreaming={isStreaming} />}
        <div className="flex items-center gap-2 py-3">
          <span className="material-symbols-outlined text-sm text-primary animate-spin">progress_activity</span>
          <span className="text-xs text-slate-500">AI 正在生成流程图...</span>
        </div>
      </div>
    );
  }

  if (!diff) {
    // 普通文本消息
    return (
      <div>
        {thinking && <ThinkingBlock content={thinking} isStreaming={isStreaming} />}
        <p className="text-xs leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    );
  }

  const nodes = diff.add?.nodes || [];
  const edges = diff.add?.edges || [];

  return (
    <div className="space-y-3">
      {/* 思考过程 */}
      {thinking && <ThinkingBlock content={thinking} isStreaming={isStreaming} />}
      {/* 概要信息 */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <span className="material-symbols-outlined text-sm text-primary">auto_awesome</span>
        已生成 {nodes.length} 个节点、{edges.length} 条连线
      </div>

      {/* 节点卡片列表 */}
      <div className="space-y-2">
        {nodes.map((node: any, i: number) => {
          const meta = NODE_TYPE_META[node.type] || NODE_TYPE_META.process;
          return (
            <div key={node.id || i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${meta.color}`}>
                <span className="material-symbols-outlined text-sm">{meta.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400">#{i + 1}</span>
                  <span className="text-xs font-medium text-slate-800 truncate">{node.data?.label || node.id}</span>
                </div>
                {node.data?.description && (
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{node.data.description}</p>
                )}
                {node.data?.tags && node.data.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {node.data.tags.map((tag: string) => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-primary/8 text-primary rounded">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[9px] text-slate-400 shrink-0">{meta.label}</span>
            </div>
          );
        })}
      </div>

      {/* 连线信息 */}
      {edges.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 mb-1.5 font-medium">连线关系</p>
          <div className="flex flex-wrap gap-1.5">
            {edges.map((edge: any, i: number) => (
              <span key={edge.id || i} className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded">
                {edge.source} <span className="text-slate-300">→</span> {edge.target}
                {edge.label && <span className="text-slate-400">({edge.label})</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 预览提示 */}
      {content.includes('已生成预览') && (
        <div className="flex items-center gap-1.5 pt-1 text-[10px] text-primary font-medium">
          <span className="material-symbols-outlined text-sm">visibility</span>
          已生成预览，请到画布确认是否应用
        </div>
      )}

      {/* 再次填入按钮 */}
      {diff && onApplyDiff && (
        <button
          onClick={() => onApplyDiff(diff)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-all duration-200 active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-sm">replay</span>
          再次填入画布
        </button>
      )}
    </div>
  );
}

function ChatPanel() {
  const {
    messages, isLoading, conversations, activeConversationId,
    addMessage, appendToMessage, updateMessage, clearMessages, setLoading,
    createConversation, switchConversation, deleteConversation, setMessageDiff,
    appendThinking,
  } = useChatStore();
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const streamingMsgId = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const clearPreview = usePreviewStore((state) => state.clear);
  const setPreviewFromDiff = usePreviewStore((state) => state.setPreviewFromDiff);

  // 消息列表自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /** 再次填入画布 */
  const handleApplyDiff = useCallback((diff: any) => {
    if (!diff) return;
    clearPreview();
    setPreviewFromDiff(
      diff,
      nodes.map((n) => n.id),
      edges.map((e) => e.id)
    );
  }, [clearPreview, setPreviewFromDiff, nodes, edges]);

  const handleSend = async (promptOverride?: string) => {
    const userPrompt = (promptOverride || input).trim();
    if (!userPrompt || isLoading) return;

    addMessage({ role: 'user', content: userPrompt });
    setInput('');
    setLoading(true);
    clearPreview();

    // 创建流式 assistant 消息
    const assistantId = addMessage({ role: 'assistant', content: '' });
    streamingMsgId.current = assistantId;

    const { provider, apiKey, model, baseURL, systemPrompt: customSystemPrompt } = useSettingsStore.getState();

    try {
      const response = await fetch('http://localhost:3001/api/ai/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          currentGraph: { nodes, edges },
          mode: 'incremental',
          provider,
          ...(apiKey && { apiKey }),
          ...(model && { model }),
          ...(baseURL && { baseURL }),
          ...(customSystemPrompt && { systemPrompt: customSystemPrompt }),
          ...(thinkingEnabled && { thinking: true }),
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 解析 SSE 事件
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === 'chunk') {
              appendToMessage(assistantId, event.text);
            } else if (event.type === 'thinking') {
              appendThinking(assistantId, event.text);
            } else if (event.type === 'done') {
              if (event.diff) {
                // 保存 diff 到消息，以供"再次填入"
                setMessageDiff(assistantId, event.diff);
                setPreviewFromDiff(
                  event.diff,
                  nodes.map((n) => n.id),
                  edges.map((e) => e.id)
                );
                appendToMessage(assistantId, '\n\n已生成预览，请到画布确认是否应用。');
              } else if (event.text) {
                // AI 返回自然语言对话（非 JSON），确保完整文本已设置
                const currentMsg = useChatStore.getState().messages.find((m) => m.id === assistantId);
                if (!currentMsg?.content) {
                  updateMessage(assistantId, event.text);
                }
              }
            } else if (event.type === 'error') {
              updateMessage(assistantId, `生成失败：${event.error}`);
            }
          } catch {
            // 非 JSON 行，跳过
          }
        }
      }

      // 流结束但消息还是空的（边缘情况）
      const finalMsg = useChatStore.getState().messages.find((m) => m.id === assistantId);
      if (finalMsg && !finalMsg.content) {
        updateMessage(assistantId, 'AI 未返回有效内容');
      }
    } catch (error) {
      logger.error('AI 流式生成失败', error);
      updateMessage(assistantId, `生成失败：${error instanceof Error ? error.message : '请检查后端服务和 API Key 配置'}`);
    } finally {
      streamingMsgId.current = null;
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 标题 */}
      <div className="workbench-panel-header px-5">
        <div>
          <h2 className="text-title-sm font-semibold text-on-surface">AI 对话</h2>
          <p className="text-[10px] text-on-surface-variant mt-1">通过自然语言生成和修改流程图</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={`icon-button-soft h-8 w-8 transition-colors duration-200 ${showHistory ? 'text-primary bg-primary/10' : ''}`}
            title="历史对话"
          >
            <span className="material-symbols-outlined text-sm">history</span>
          </button>
          <button
            onClick={() => createConversation()}
            className="icon-button-soft h-8 w-8"
            title="新建对话"
          >
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="icon-button-soft h-8 w-8"
              title="清空对话"
            >
              <span className="material-symbols-outlined text-sm">delete_sweep</span>
            </button>
          )}
        </div>
      </div>

      {/* 对话历史列表 */}
      {showHistory && (
        <div className="border-b border-slate-100 bg-slate-50/50 max-h-48 overflow-y-auto animate-[slideDown_200ms_ease-out]">
          {conversations.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">暂无历史对话</p>
          ) : (
            conversations.slice().reverse().map((conv) => (
              <div
                key={conv.id}
                className={`flex items-center gap-2 px-5 py-2.5 cursor-pointer transition-all duration-150 hover:bg-slate-100/80 ${
                  conv.id === activeConversationId ? 'bg-primary/8 border-l-2 border-primary' : ''
                }`}
                onClick={() => { switchConversation(conv.id); setShowHistory(false); }}
              >
                <span className="material-symbols-outlined text-sm text-slate-400">chat_bubble</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{conv.title}</p>
                  <p className="text-[9px] text-slate-400">
                    {conv.messages.length} 条消息 · {new Date(conv.updatedAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 icon-button-soft h-6 w-6 hover:text-red-500 transition-all duration-150"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 消息列表 */}
      <div className={`flex-1 ${messages.length > 0 ? 'overflow-y-auto' : 'overflow-hidden'} px-5 py-4 space-y-4`}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="flex flex-col items-center text-center px-4 pt-4 mb-5">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-3">chat</span>
              <p className="text-sm text-on-surface-variant">开始与 AI 对话</p>
              <p className="text-xs text-on-surface-variant/60 mt-1 leading-relaxed">选择模板快速开始，或输入自定义描述</p>
            </div>
            {/* 预设模板网格 */}
            <div className="grid grid-cols-2 gap-2 px-1">
              {PRESET_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  onClick={() => void handleSend(tpl.prompt)}
                  disabled={isLoading}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-surface-container-highest/60 hover:bg-surface-container-highest transition-all duration-200 text-center ghost-border-soft disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-lg text-primary">{tpl.icon}</span>
                  <span className="text-[10px] text-on-surface-variant leading-tight">{tpl.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-[fadeIn_200ms_ease-out]`}>
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 ghost-border-soft transition-all duration-200 ${
                  msg.role === 'user'
                    ? 'bg-primary text-on-primary'
                    : 'bg-white text-on-surface shadow-sm'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <FormattedAIMessage content={msg.content} graphDiff={msg.graphDiff} thinking={msg.thinking} onApplyDiff={handleApplyDiff} isStreaming={isLoading && msg.id === streamingMsgId.current} />
                ) : (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
                <p className="text-[9px] mt-1 opacity-60">
                  {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}

        {/* 生成中指示器 */}
        {isLoading && (
          <div className="flex justify-start animate-[fadeIn_200ms_ease-out]">
            <div className="bg-surface-container-highest text-on-surface rounded-xl px-4 py-3 ghost-border-soft">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-xs text-on-surface-variant">AI 正在思考...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="px-5 py-4 ghost-border-soft border-x-0 border-b-0 bg-surface-container-low/45 backdrop-blur-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setThinkingEnabled((v) => !v)}
            className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
              thinkingEnabled
                ? 'bg-violet-100 text-violet-600 ring-1 ring-violet-200'
                : 'bg-surface-container-highest/60 text-on-surface-variant/50 hover:bg-surface-container-highest'
            }`}
            title={thinkingEnabled ? '关闭思考模式' : '开启思考模式'}
          >
            <span className="material-symbols-outlined text-base">psychology</span>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
            placeholder="描述需求或输入「生成XX流程图」..."
            className="flex-1 bg-surface-container-highest/92 rounded-xl py-2 px-4 text-xs text-on-surface outline-none transition-all duration-200 ghost-border-soft focus:ring-2 focus:ring-primary/20"
            disabled={isLoading}
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || isLoading}
            className="gradient-button px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-base">send</span>
          </button>
        </div>
        <p className="text-[9px] text-on-surface-variant/60 mt-2">
          {thinkingEnabled ? '🧠 思考模式已开启 · AI 将展示推理过程' : '提示：描述需求进行分析，或输入「生成XX流程图」直接生成'}
        </p>
      </div>
    </div>
  );
}

export default ChatPanel;
