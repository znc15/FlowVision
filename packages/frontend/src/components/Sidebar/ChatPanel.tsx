import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useGraphStore } from '../../store/graphStore';
import { usePreviewStore } from '../../store/previewStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useChatStore } from '../../store/chatStore';
import { useLogStore } from '../../store/logStore';
import { useMcpStore } from '../../store/mcpStore';
import { useToastStore } from '../../store/toastStore';
import { useTabStore } from '../../store/tabStore';
import { logger } from '../../utils/logger';
import type { GraphData, GraphDiff } from '../../types/graph';
import { applyDiff as applyGraphDiff } from '../../utils/graphDiff';
import {
  buildFileImportContext,
  buildProjectImportContext,
  composePromptWithImports,
} from '../../utils/chatContext';
import { parseSQL, schemaToGraphDiff, buildSQLImportContext } from '../../utils/sqlParser';
import { getBackendUrl } from '../../utils/backend';

const PROJECT_PATH_KEY = 'flowvision-project-path';
const SELECTED_FILE_KEY = 'flowvision-selected-file';

interface ImportedContextItem {
  path: string;
  label: string;
  text: string;
}

function readStoredValue(key: string): string {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function getPathLabel(path: string): string {
  const normalized = path.replace(/^github:/, '').replace(/^gitee:/, '');
  const parts = normalized.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] || normalized || '未命名';
}

function buildCanvasTabTitle(prompt: string): string {
  const normalized = prompt.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'AI 新画布';
  return `AI · ${normalized.slice(0, 12)}`;
}

// 预设 prompt 模板
const PRESET_TEMPLATES = [
  { icon: 'login', label: '用户登录流程', prompt: '生成一个用户登录流程图，包含输入账号密码、验证、成功/失败分支' },
  { icon: 'shopping_cart', label: '订单处理流程', prompt: '生成一个电商订单处理流程图，包含下单、支付、发货、确认收货' },
  { icon: 'approval', label: '审批流程', prompt: '生成一个多级审批流程图，包含提交申请、部门审批、领导审批、通知结果' },
  { icon: 'sync', label: '数据同步流程', prompt: '生成一个数据同步流程图，包含数据采集、清洗、转换、加载、校验' },
  { icon: 'bug_report', label: '异常处理流程', prompt: '生成一个异常处理流程图，包含错误检测、分类、处理、重试、上报' },
  { icon: 'rocket_launch', label: 'CI/CD 流程', prompt: '生成一个 CI/CD 部署流程图，包含代码提交、构建、测试、部署、监控' },
  { icon: 'cloud', label: '微服务架构', prompt: '生成一个微服务架构图，展示 API 网关、用户服务、订单服务、支付服务、消息队列、服务注册发现等组件及调用关系' },
  { icon: 'storage', label: '数据库表设计', prompt: '生成一个 ER 实体关系图，设计用户、订单、商品三个实体及其关系，包含主键、外键和字段' },
  { icon: 'person_add', label: '用户注册流程', prompt: '生成一个用户注册流程图，包含填写信息、验证、发送激活邮件、激活账号、完善资料' },
  { icon: 'payments', label: '支付系统流程', prompt: '生成一个支付系统流程图，包含创建订单、选择支付方式、支付处理、回调通知、对账结算，使用 database 节点表示数据存储' },
  { icon: 'admin_panel_settings', label: '权限管理 RBAC', prompt: '生成一个 RBAC 权限管理流程图，展示用户、角色、权限的关联关系和鉴权流程' },
  { icon: 'cloud_upload', label: '项目部署流程', prompt: '生成一个项目部署流程图，包含环境准备、配置管理、构建打包、部署发布、健康检查、回滚机制' },
  { icon: 'code', label: '代码审查流程', prompt: '生成一个代码审查流程图，包含提交 MR、自动检查、人工审查、修改反馈、合并分支' },
  { icon: 'sprint', label: '敏捷 Sprint', prompt: '生成一个敏捷开发 Sprint 流程图，包含计划会议、任务拆分、每日站会、开发测试、评审回顾' },
  { icon: 'monitor_heart', label: '监控告警处理', prompt: '生成一个监控告警处理流程图，包含告警触发、分级分类、排查定位、处理恢复、复盘总结' },
];

/** 流程图类型模板 */
const FLOWCHART_TYPES = [
  { icon: 'schema', label: '基础流程图', prompt: '生成一个标准流程图，包含开始节点、多个处理步骤、判断分支（是/否）和结束节点，使用 start/process/decision/end 节点类型' },
  { icon: 'hub', label: '系统架构图', prompt: '生成一个系统架构流程图，展示前端、后端、数据库、缓存、消息队列等组件之间的调用关系和数据流向' },
  { icon: 'swap_horiz', label: '数据流程图', prompt: '生成一个数据流程图，使用 data 类型节点展示数据的采集、处理、转换、存储和输出的完整流向' },
  { icon: 'person_pin_circle', label: '用户旅程图', prompt: '生成一个用户旅程流程图，从用户首次访问到完成核心操作的完整路径，包含各触点和决策节点' },
  { icon: 'api', label: 'API 调用链', prompt: '生成一个 API 调用链流程图，展示客户端请求到服务端各层（路由、中间件、控制器、服务、数据库）的处理流程' },
  { icon: 'autorenew', label: '状态机图', prompt: '生成一个 UML 状态图，展示对象在各状态之间的转换条件和触发事件，使用 state/initial_state/final_state 节点类型，设置 diagramType 为 uml_state' },
  { icon: 'view_list', label: 'ER 实体关系图', prompt: '生成一个 ER 实体关系图，使用 entity/attribute/relationship 节点类型，展示实体、属性和关系，支持基数标注，设置 diagramType 为 er' },
  { icon: 'timeline', label: '时序图', prompt: '生成一个 UML 时序图，使用 lifeline/activation 节点类型和 message/return 边关系，展示对象间的消息交互，设置 diagramType 为 sequence' },
  { icon: 'class', label: 'UML 类图', prompt: '生成一个 UML 类图，使用 class/interface/enum_node 节点类型，类节点包含 attributes 和 methods，展示继承、组合、依赖关系，设置 diagramType 为 uml_class' },
  { icon: 'person_play', label: '用例图', prompt: '生成一个 UML 用例图，使用 actor/usecase_item/system_boundary 节点类型，展示参与者和系统功能的交互，设置 diagramType 为 usecase' },
  { icon: 'play_circle', label: 'UML 活动图', prompt: '生成一个 UML 活动图，展示并发活动和同步控制，使用 fork_join 节点表示并行分叉汇合，设置 diagramType 为 uml_activity' },
  { icon: 'widgets', label: '功能结构图', prompt: '生成一个功能结构图，使用 function_block/input_output/control/mechanism 节点类型，展示系统功能的层次分解，设置 diagramType 为 functional' },
  { icon: 'lan', label: '网络拓扑图', prompt: '生成一个网络拓扑图，展示客户端、负载均衡、Web 服务器、应用服务器、数据库集群、CDN 等网络组件的连接关系' },
];

/** 斜杠命令定义 */
const SLASH_COMMANDS = [
  { command: '/help', icon: 'help', label: '帮助', description: '显示所有可用命令' },
  { command: '/clear', icon: 'delete_sweep', label: '清空对话', description: '清除当前所有消息' },
  { command: '/new', icon: 'add_circle', label: '新建对话', description: '创建新的对话会话' },
  { command: '/thinking', icon: 'psychology', label: '思考模式', description: '开启或关闭 AI 推理过程展示' },
  { command: '/export', icon: 'download', label: '导出对话', description: '将当前对话导出为文本文件' },
  { command: '/template', icon: 'view_list', label: '模板列表', description: '显示所有可用场景和流程图模板' },
  ...PRESET_TEMPLATES.map((tpl) => ({
    command: `/scene:${tpl.label}`,
    icon: tpl.icon,
    label: tpl.label,
    description: tpl.prompt,
  })),
  ...FLOWCHART_TYPES.map((tpl) => ({
    command: `/flow:${tpl.label}`,
    icon: tpl.icon,
    label: tpl.label,
    description: tpl.prompt,
  })),
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

/** Markdown 渲染组件 */
function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-base font-bold text-slate-800 mb-2 mt-3 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold text-slate-800 mb-1.5 mt-2.5 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xs font-bold text-slate-700 mb-1 mt-2 first:mt-0">{children}</h3>,
        p: ({ children }) => <p className="text-xs leading-relaxed mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside text-xs mb-2 space-y-0.5 ml-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside text-xs mb-2 space-y-0.5 ml-1">{children}</ol>,
        li: ({ children }) => <li className="text-xs leading-relaxed">{children}</li>,
        code: ({ className, children }) => {
          const isInline = !className;
          if (isInline) {
            return <code className="px-1 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono">{children}</code>;
          }
          return (
            <code className="block bg-slate-800 text-slate-100 p-3 rounded-lg text-[11px] font-mono overflow-x-auto my-2">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="bg-transparent p-0 m-0 overflow-x-auto">{children}</pre>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-slate-300 pl-3 my-2 text-xs text-slate-600 italic">{children}</blockquote>
        ),
        strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>
        ),
        hr: () => <hr className="my-3 border-slate-200" />,
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full text-xs border border-slate-200 rounded">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => <tr className="border-b border-slate-100">{children}</tr>,
        th: ({ children }) => <th className="px-2 py-1.5 text-left font-semibold text-slate-700">{children}</th>,
        td: ({ children }) => <td className="px-2 py-1.5 text-slate-600">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/** 格式化 AI 消息内容：将 GraphDiff 渲染为步骤卡片 */
function FormattedAIMessage({ content, graphDiff, thinking, onApplyDiff, isStreaming }: { content: string; graphDiff?: any; thinking?: string; onApplyDiff?: (diff: any) => void; isStreaming?: boolean }) {
  const diff = useMemo(() => graphDiff || tryParseGraphDiff(content), [content, graphDiff]);

  // 检测内容是否包含 JSON（即使前面有自然语言描述）
  const jsonStarted = content.trim().startsWith('{') || content.includes('{"add"') || content.includes('"add":');
  const isGeneratingGraph = isStreaming && !graphDiff && jsonStarted;

  // 流式传输中正在生成流程图 JSON —— 显示加载指示器，不输出原始 JSON
  if (isGeneratingGraph) {
    // 提取 JSON 之前的文字描述作为摘要
    const jsonIndex = content.indexOf('{');
    const description = jsonIndex > 0 ? content.slice(0, jsonIndex).trim() : '';
    // 尝试从已接收的部分 JSON 中统计节点数
    const nodeCount = (content.match(/"type"\s*:/g) || []).length;
    const edgeCount = (content.match(/"source"\s*:/g) || []).length;

    return (
      <div>
        {thinking && <ThinkingBlock content={thinking} isStreaming={isStreaming} />}
        {description && (
          <div className="text-slate-600 mb-2"><MarkdownContent content={description} /></div>
        )}
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary animate-spin">progress_activity</span>
            <span className="text-xs text-primary font-medium">正在生成流程图...</span>
          </div>
          {(nodeCount > 0 || edgeCount > 0) && (
            <div className="flex items-center gap-3 text-[10px] text-slate-500">
              {nodeCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">crop_square</span>
                  已接收 {nodeCount} 个节点
                </span>
              )}
              {edgeCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  已接收 {edgeCount} 条连线
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!diff) {
    // 普通文本消息 - 使用 Markdown 渲染
    return (
      <div>
        {thinking && <ThinkingBlock content={thinking} isStreaming={isStreaming} />}
        <MarkdownContent content={content} />
      </div>
    );
  }

  // 提取 JSON 之前的自然语言描述
  const jsonIndex = content.indexOf('{');
  const beforeJson = jsonIndex > 0 ? content.slice(0, jsonIndex).trim() : '';

  const nodes = diff.add?.nodes || [];
  const edges = diff.add?.edges || [];
  const diagramType = diff.meta?.diagramType;

  // 图表类型中文映射
  const diagramTypeLabels: Record<string, string> = {
    flowchart: '流程图',
    er: 'ER 实体关系图',
    uml_class: 'UML 类图',
    sequence: '时序图',
    usecase: '用例图',
    uml_activity: '活动图',
    uml_state: '状态图',
    functional: '功能结构图',
  };

  return (
    <div className="space-y-3">
      {/* 思考过程 */}
      {thinking && <ThinkingBlock content={thinking} isStreaming={isStreaming} />}
      {/* 自然语言描述 */}
      {beforeJson && (
        <div className="text-slate-600"><MarkdownContent content={beforeJson} /></div>
      )}
      {/* 概要信息 */}
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
        <div className="flex items-center gap-2 text-[11px] text-primary font-medium mb-2">
          <span className="material-symbols-outlined text-sm">auto_awesome</span>
          {diagramType ? `已生成${diagramTypeLabels[diagramType] || diagramType}` : '已生成图表'}
        </div>
        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs">crop_square</span>
            {nodes.length} 个节点
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs">arrow_forward</span>
            {edges.length} 条连线
          </span>
        </div>
      </div>

      {/* 节点卡片列表 */}
      <div className="space-y-1.5">
        {nodes.map((node: any, i: number) => {
          const meta = NODE_TYPE_META[node.type] || NODE_TYPE_META.process;
          return (
            <div key={node.id || i} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition-colors">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${meta.color}`}>
                <span className="material-symbols-outlined text-xs">{meta.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-medium text-slate-800 truncate">{node.data?.label || node.id}</span>
              </div>
              <span className="text-[9px] text-slate-400 shrink-0">{meta.label}</span>
            </div>
          );
        })}
      </div>

      {/* 连线信息 */}
      {edges.length > 0 && edges.length <= 20 && (
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
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSelectedIdx, setSlashSelectedIdx] = useState(0);
  const [drawInNewTab, setDrawInNewTab] = useState(false);
  const [importingProject, setImportingProject] = useState(false);
  const [importingFile, setImportingFile] = useState(false);
  const [importedProject, setImportedProject] = useState<ImportedContextItem | null>(null);
  const [importedFiles, setImportedFiles] = useState<ImportedContextItem[]>([]);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [sqlContext, setSqlContext] = useState<string | null>(null);
  const streamingMsgId = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const clearPreview = usePreviewStore((state) => state.clear);
  const setPreviewFromDiff = usePreviewStore((state) => state.setPreviewFromDiff);

  const handleImportProject = useCallback(async () => {
    const projectPath = readStoredValue(PROJECT_PATH_KEY).trim();
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

      setImportedProject({
        path: projectPath,
        label: getPathLabel(projectPath),
        text: buildProjectImportContext(projectPath, data.data),
      });
      useToastStore.getState().show(`已导入项目：${getPathLabel(projectPath)}`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : '项目上下文导入失败';
      useToastStore.getState().show(message, 'error');
      useLogStore.getState().add('error', 'AI请求', '导入项目上下文失败', JSON.stringify({ projectPath, message }, null, 2));
    } finally {
      setImportingProject(false);
    }
  }, []);

  const handleImportFile = useCallback(async () => {
    const projectPath = readStoredValue(PROJECT_PATH_KEY).trim();
    const filePath = readStoredValue(SELECTED_FILE_KEY).trim();
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

      const newItem: ImportedContextItem = {
        path: filePath,
        label: getPathLabel(filePath),
        text: buildFileImportContext(filePath, data.data.content),
      };
      setImportedFiles((prev) => {
        if (prev.some((f) => f.path === filePath)) return prev;
        return [...prev, newItem];
      });
      useToastStore.getState().show(`已导入文件：${getPathLabel(filePath)}`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : '文件上下文导入失败';
      useToastStore.getState().show(message, 'error');
      useLogStore.getState().add('error', 'AI请求', '导入文件上下文失败', JSON.stringify({ projectPath, filePath, message }, null, 2));
    } finally {
      setImportingFile(false);
    }
  }, []);

  /** 导入 SQL 文件并解析为 ER 图 */
  const handleImportSQL = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sql';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const schema = parseSQL(text);
        if (schema.tables.length === 0) {
          useToastStore.getState().show('未在 SQL 文件中找到有效的表定义', 'error');
          return;
        }
        const context = buildSQLImportContext(text, schema);
        setSqlContext(context);
        useToastStore.getState().show(`已解析 ${schema.tables.length} 个表、${schema.relationships.length} 个关系`, 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'SQL 解析失败';
        useToastStore.getState().show(message, 'error');
      }
    };
    input.click();
  }, []);

  /** 从导入的 SQL Schema 生成 ER 图 */
  const handleGenerateERFromSQL = useCallback(() => {
    if (!sqlContext) return;
    const sqlMatch = sqlContext.match(/```sql\n([\s\S]*?)```/);
    if (sqlMatch) {
      const schema = parseSQL(sqlMatch[1]);
      const diff = schemaToGraphDiff(schema);
      setPreviewFromDiff(diff, nodes.map(n => n.id), edges.map(e => e.id));
      useToastStore.getState().show('已生成 ER 图预览，请到画布确认', 'success');
    }
  }, [sqlContext, nodes, edges, setPreviewFromDiff]);

  // 消息列表自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /** 斜杠命令过滤 */
  const filteredCommands = useMemo(() => {
    if (!input.startsWith('/')) return SLASH_COMMANDS;
    const q = input.toLowerCase();
    return SLASH_COMMANDS.filter(
      (cmd) => cmd.command.toLowerCase().includes(q) || cmd.label.toLowerCase().includes(q)
    );
  }, [input]);

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

  const openGraphInNewTab = useCallback((sourceTabId: string, baseGraph: GraphData, diff: GraphDiff, prompt: string) => {
    const nextGraph = applyGraphDiff(baseGraph, diff);
    const tabTitle = buildCanvasTabTitle(prompt);
    const { saveTabGraph, addTab } = useTabStore.getState();

    saveTabGraph(sourceTabId, baseGraph);
    addTab(tabTitle, nextGraph);
    clearPreview();
    useGraphStore.getState().replaceGraph(nextGraph);
    useToastStore.getState().show(`已在新画布生成：${tabTitle}`, 'success');
  }, [clearPreview]);

  const handleSend = async (promptOverride?: string, target?: 'current' | 'new-tab') => {
    const userPrompt = (promptOverride || input).trim();
    if (!userPrompt || isLoading) return;

    const renderTarget = target || (drawInNewTab ? 'new-tab' : 'current');
    const sourceTabId = useTabStore.getState().activeTabId;
    const diagramType = useGraphStore.getState().diagramType;
    const baseGraphSnapshot: GraphData = {
      nodes,
      edges,
      ...(diagramType !== 'flowchart' && { meta: { diagramType } }),
    };

    // 联网搜索：先获取搜索结果，再注入到 prompt 中
    let searchContext: string | undefined;
    if (searchEnabled) {
      const searchQuery = userPrompt.slice(0, 100);
      const searchLogId = useLogStore.getState().add('info', '联网搜索', `搜索: ${searchQuery}`, undefined, {
        status: 'running',
        step: '调用 web_search 工具',
        tags: ['联网搜索'],
      });
      const searchStartTime = performance.now();
      try {
        const searchResult = await useMcpStore.getState().webSearch(userPrompt);
        if (searchResult.success && searchResult.content) {
          const textContents = searchResult.content.filter((c: any) => c.type === 'text');
          const texts = textContents.map((c: any) => c.text).join('\n');

          // 检测返回内容是否包含错误信息
          const errorKeywords = ['API 尚未正确设置', '配置出现了问题', 'API key', '未配置', 'error', 'failed', 'invalid'];
          const isErrorResponse = errorKeywords.some((kw) => texts.toLowerCase().includes(kw.toLowerCase()));

          if (texts && !isErrorResponse) {
            searchContext = `\n\n## 联网搜索结果\n以下是来自互联网的搜索结果，请结合这些信息回答用户问题：\n${texts}`;
            // 提取来源摘要（取每段文本的前 200 字符作为摘要）
            const sourceSummaries = textContents.slice(0, 5).map((c: any, i: number) => {
              const text = c.text || '';
              const preview = text.slice(0, 200).replace(/\n/g, ' ');
              return `来源 ${i + 1}: ${preview}${text.length > 200 ? '...' : ''}`;
            });
            useLogStore.getState().update(searchLogId, {
              status: 'completed',
              level: 'success',
              step: '搜索完成',
              message: `搜索完成，获取到 ${textContents.length} 个来源，共 ${texts.length} 字符`,
              duration: Math.round(performance.now() - searchStartTime),
              detail: JSON.stringify({
                query: searchQuery,
                sourcesCount: textContents.length,
                totalChars: texts.length,
                serverId: searchResult.serverId,
                sources: sourceSummaries,
              }, null, 2),
              metrics: [
                { label: '来源数', value: String(textContents.length) },
                { label: '总字符', value: String(texts.length) },
                { label: '耗时', value: `${Math.round(performance.now() - searchStartTime)}ms` },
              ],
            });
          } else if (isErrorResponse) {
            // 搜索返回了错误信息
            useLogStore.getState().update(searchLogId, {
              status: 'failed',
              level: 'error',
              step: 'API 配置错误',
              message: '搜索服务返回错误，请检查 MCP 服务器 API 配置',
              duration: Math.round(performance.now() - searchStartTime),
              detail: JSON.stringify({
                query: searchQuery,
                serverId: searchResult.serverId,
                errorContent: texts.slice(0, 500),
                hint: '请在设置中配置正确的 API Key（如 GROK_API_KEY 或 TAVILY_API_KEY）',
              }, null, 2),
            });
          } else {
            useLogStore.getState().update(searchLogId, {
              status: 'failed',
              level: 'warn',
              step: '搜索无结果',
              message: '搜索未返回有效结果',
              duration: Math.round(performance.now() - searchStartTime),
              detail: JSON.stringify({
                query: searchQuery,
                serverId: searchResult.serverId,
                contentTypes: searchResult.content?.map((c: any) => c.type),
              }, null, 2),
            });
          }
        } else {
          const errorMsg = searchResult.isError ? '搜索服务返回错误' : '搜索请求未成功返回';
          useLogStore.getState().update(searchLogId, {
            status: 'failed',
            level: 'warn',
            step: '搜索失败',
            message: errorMsg,
            duration: Math.round(performance.now() - searchStartTime),
            detail: JSON.stringify({
              query: searchQuery,
              success: searchResult.success,
              isError: searchResult.isError,
              serverId: searchResult.serverId,
            }, null, 2),
          });
        }
      } catch (e: any) {
        useLogStore.getState().update(searchLogId, {
          status: 'failed',
          level: 'warn',
          step: '搜索异常',
          message: `联网搜索失败: ${e.message || '未知错误'}`,
          duration: Math.round(performance.now() - searchStartTime),
          detail: JSON.stringify({
            query: searchQuery,
            error: e.message,
            stack: e.stack?.slice(0, 500),
          }, null, 2),
        });
      }
    }

    const effectivePrompt = composePromptWithImports(userPrompt, {
      projectContext: importedProject?.text,
      fileContext: importedFiles.map((f) => f.text).join('\n\n') || undefined,
      searchContext,
      sqlContext: sqlContext || undefined,
    });

    addMessage({ role: 'user', content: userPrompt });
    setInput('');
    setLoading(true);
    clearPreview();

    // 创建流式 assistant 消息
    const assistantId = addMessage({ role: 'assistant', content: '' });
    streamingMsgId.current = assistantId;

    const { provider, apiKey, model, baseURL, systemPrompt: customSystemPrompt, customHeaders, httpProxy, maxOutputTokens, maxContextTokens } = useSettingsStore.getState();

    const requestBody = {
      prompt: userPrompt,
      currentGraph: { nodeCount: nodes.length, edgeCount: edges.length },
      mode: 'incremental',
      target: renderTarget,
      imports: {
        projectPath: importedProject?.path,
        filePath: importedFiles.map((f) => f.path).join(', ') || undefined,
      },
      provider,
      ...(apiKey && { apiKey: '***' }),
      ...(model && { model }),
      ...(baseURL && { baseURL }),
      ...(customSystemPrompt && { systemPrompt: customSystemPrompt }),
      ...(thinkingEnabled && { thinking: true }),
      ...(Object.keys(customHeaders).length > 0 && { customHeaders }),
      ...(httpProxy && { httpProxy }),
      ...(maxOutputTokens && { maxOutputTokens }),
      ...(maxContextTokens && { maxContextTokens }),
    };
    const startTime = performance.now();
    const logId = useLogStore.getState().add('info', 'AI请求', `发送生成请求: ${provider}/${model || '默认模型'}`, JSON.stringify(requestBody, null, 2), {
      status: 'running',
      step: '连接 AI 服务',
      stepIndex: '1/3',
      tags: ['AI生成', provider],
    });

    try {
      // 构建上下文历史（保留最近 10 条消息，更早的压缩为摘要）
      const allMsgs = useChatStore.getState().messages;
      const recentMessages = allMsgs.slice(-10);
      const history = recentMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content.slice(0, 2000), // 截断过长的消息
      }));

      const response = await fetch(`${getBackendUrl()}/api/ai/generate-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: effectivePrompt,
          currentGraph: baseGraphSnapshot,
          mode: 'incremental',
          provider,
          ...(apiKey && { apiKey }),
          ...(model && { model }),
          ...(baseURL && { baseURL }),
          ...(customSystemPrompt && { systemPrompt: customSystemPrompt }),
          ...(thinkingEnabled && { thinking: true }),
          ...(Object.keys(customHeaders).length > 0 && { customHeaders }),
          ...(httpProxy && { httpProxy }),
          ...(maxOutputTokens && { maxOutputTokens }),
          ...(maxContextTokens && { maxContextTokens }),
          ...(history.length > 0 && { history }),
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
                if (renderTarget === 'new-tab') {
                  openGraphInNewTab(sourceTabId, baseGraphSnapshot, event.diff, userPrompt);
                  appendToMessage(assistantId, '\n\n已在新画布标签中生成结果。');
                } else {
                  setPreviewFromDiff(
                    event.diff,
                    baseGraphSnapshot.nodes.map((node) => node.id),
                    baseGraphSnapshot.edges.map((edge) => edge.id)
                  );
                  appendToMessage(assistantId, '\n\n已生成预览，请到画布确认是否应用。');
                }
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
      useLogStore.getState().update(logId, {
        status: 'completed',
        step: '生成完成',
        stepIndex: '3/3',
        duration: Math.round(performance.now() - startTime),
        level: 'success',
        message: `AI 生成完成: ${provider}/${model || '默认模型'}`,
      });
    } catch (error) {
      logger.error('AI 流式生成失败', error);
      updateMessage(assistantId, `生成失败：${error instanceof Error ? error.message : '请检查后端服务和 API Key 配置'}`);
      useLogStore.getState().update(logId, {
        status: 'failed',
        step: '生成失败',
        duration: Math.round(performance.now() - startTime),
        level: 'error',
        message: `AI 生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      streamingMsgId.current = null;
      setLoading(false);
    }
  };

  /** 执行斜杠命令 */
  const handleSlashCommand = (command: string) => {
    setShowSlashMenu(false);
    setInput('');
    if (command === '/help') {
      const helpText = SLASH_COMMANDS
        .filter((c) => !c.command.includes(':'))
        .map((c) => `\`${c.command}\` — ${c.description}`)
        .join('\n');
      addMessage({
        role: 'assistant',
        content: `**可用命令**\n\n${helpText}\n\n输入 \`/scene:\` 查看场景模板，\`/flow:\` 查看流程图类型`,
      });
    } else if (command === '/clear') {
      clearMessages();
    } else if (command === '/new') {
      createConversation();
    } else if (command === '/thinking') {
      setThinkingEnabled((v) => !v);
    } else if (command === '/export') {
      if (messages.length === 0) return;
      const text = messages
        .map((m) => `[${m.role === 'user' ? '用户' : 'AI'}] ${m.content}`)
        .join('\n\n---\n\n');
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FlowVision对话_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (command === '/template') {
      const sceneList = PRESET_TEMPLATES.map((t) => `  \`/scene:${t.label}\` — ${t.prompt.slice(0, 30)}...`).join('\n');
      const flowList = FLOWCHART_TYPES.map((t) => `  \`/flow:${t.label}\` — ${t.prompt.slice(0, 30)}...`).join('\n');
      addMessage({
        role: 'assistant',
        content: `**可用模板**\n\n**场景模板：**\n${sceneList}\n\n**流程图类型：**\n${flowList}\n\n输入对应命令可直接使用模板生成流程图。`,
      });
    } else if (command.startsWith('/scene:')) {
      const tpl = PRESET_TEMPLATES.find((t) => t.label === command.slice(7));
      if (tpl) void handleSend(tpl.prompt);
    } else if (command.startsWith('/flow:')) {
      const tpl = FLOWCHART_TYPES.find((t) => t.label === command.slice(6));
      if (tpl) void handleSend(tpl.prompt);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 标题 */}
      <div className="workbench-panel-header px-5">
        <div>
          <h2 className="text-title-sm font-semibold text-on-surface">AI 对话</h2>
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
          ) : (<>
            <div className="flex items-center justify-between px-5 py-2 border-b border-slate-100">
              <span className="text-[10px] text-slate-400">{conversations.length} 条对话</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (conversations.length > 0) {
                    conversations.forEach((c) => deleteConversation(c.id));
                  }
                }}
                className="text-[10px] text-slate-400 hover:text-red-500 transition-colors duration-150 flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-xs">delete_sweep</span>
                清空全部
              </button>
            </div>
            {conversations.slice().reverse().map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 px-5 py-2.5 cursor-pointer transition-all duration-150 hover:bg-slate-100/80 ${
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
            ))}
          </>)}
        </div>
      )}

      {/* 消息列表 */}
      <div className={`flex-1 ${messages.length > 0 ? 'overflow-y-auto' : 'overflow-hidden'} px-5 py-4 space-y-4`}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="flex flex-col items-center text-center px-4 pt-4 mb-5">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-3">chat</span>
              <p className="text-sm text-on-surface-variant">开始与 AI 对话</p>
              <p className="text-xs text-on-surface-variant/60 mt-1 leading-relaxed">选择流程图类型快速开始，或输入自定义描述</p>
            </div>
            {/* 流程图类型选择 */}
            <div className="w-full px-1 mb-4">
              <p className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-widest mb-2 px-1">流程图类型</p>
              <div className="grid grid-cols-3 gap-1.5">
                {FLOWCHART_TYPES.map((tpl) => (
                  <button
                    key={tpl.label}
                    onClick={() => void handleSend(tpl.prompt)}
                    disabled={isLoading}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all duration-200 text-center disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] ghost-border-soft"
                  >
                    <span className="material-symbols-outlined text-base text-primary">{tpl.icon}</span>
                    <span className="text-[9px] text-on-surface-variant leading-tight">{tpl.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* 预设模板网格 */}
            <div className="w-full px-1">
              <p className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-widest mb-2 px-1">场景模板</p>
              <div className="grid grid-cols-2 gap-2">
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
      <div className="relative px-5 py-4 ghost-border-soft border-x-0 border-b-0 bg-surface-container-low/45 backdrop-blur-sm">
        {/* 斜杠命令菜单 */}
        {showSlashMenu && filteredCommands.length > 0 && (
          <div className="absolute bottom-full left-5 right-5 mb-1 bg-white rounded-xl shadow-lg border border-slate-100 max-h-64 overflow-y-auto z-50 animate-[fadeIn_100ms_ease-out]">
            {filteredCommands.map((cmd, idx) => (
              <button
                key={cmd.command}
                onMouseDown={(e) => { e.preventDefault(); handleSlashCommand(cmd.command); }}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors duration-100 ${
                  idx === slashSelectedIdx ? 'bg-primary/8' : 'hover:bg-slate-50'
                }`}
              >
                <span className="material-symbols-outlined text-sm text-primary/70">{cmd.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-700">{cmd.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{cmd.command}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{cmd.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button
            onClick={() => void handleImportProject()}
            disabled={isLoading || importingProject}
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-highest/80 px-2.5 py-1 text-[10px] font-medium text-on-surface-variant transition-all duration-200 hover:bg-surface-container-highest disabled:opacity-50"
            title="导入当前项目到 AI 对话上下文"
          >
            <span className={`material-symbols-outlined text-sm ${importingProject ? 'animate-spin' : ''}`}>{importingProject ? 'progress_activity' : 'folder_open'}</span>
            当前项目
          </button>
          <button
            onClick={() => void handleImportFile()}
            disabled={isLoading || importingFile}
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-highest/80 px-2.5 py-1 text-[10px] font-medium text-on-surface-variant transition-all duration-200 hover:bg-surface-container-highest disabled:opacity-50"
            title="导入当前选中文件到 AI 对话上下文"
          >
            <span className={`material-symbols-outlined text-sm ${importingFile ? 'animate-spin' : ''}`}>{importingFile ? 'progress_activity' : 'description'}</span>
            当前文件
          </button>
          <button
            onClick={handleImportSQL}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-highest/80 px-2.5 py-1 text-[10px] font-medium text-on-surface-variant transition-all duration-200 hover:bg-surface-container-highest disabled:opacity-50"
            title="导入 SQL 文件解析为 ER 图"
          >
            <span className="material-symbols-outlined text-sm">storage</span>
            SQL→ER
          </button>
          <button
            onClick={() => setDrawInNewTab((value) => !value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-medium transition-all duration-200 ${
              drawInNewTab
                ? 'bg-primary/12 text-primary ring-1 ring-primary/20'
                : 'bg-surface-container-highest/80 text-on-surface-variant hover:bg-surface-container-highest'
            }`}
            title="本次结果输出到新建画布标签页"
          >
            <span className="material-symbols-outlined text-sm">dashboard_customize</span>
            新画布
          </button>
        </div>
        {(importedProject || importedFiles.length > 0 || sqlContext) && (
          <div className="mb-2 flex flex-wrap gap-2">
            {importedProject && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] text-blue-700">
                <span className="material-symbols-outlined text-xs">folder</span>
                项目: {importedProject.label}
                <button type="button" onClick={() => setImportedProject(null)} className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-blue-100">
                  <span className="material-symbols-outlined text-[10px]">close</span>
                </button>
              </span>
            )}
            {sqlContext && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-1 text-[10px] text-purple-700">
                <span className="material-symbols-outlined text-xs">storage</span>
                SQL Schema
                <button type="button" onClick={handleGenerateERFromSQL} className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-purple-100" title="直接生成 ER 图">
                  <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                </button>
                <button type="button" onClick={() => setSqlContext(null)} className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-purple-100">
                  <span className="material-symbols-outlined text-[10px]">close</span>
                </button>
              </span>
            )}
            {importedFiles.map((file) => (
              <span key={file.path} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700">
                <span className="material-symbols-outlined text-xs">article</span>
                文件: {file.label}
                <button type="button" onClick={() => setImportedFiles((prev) => prev.filter((f) => f.path !== file.path))} className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-emerald-100">
                  <span className="material-symbols-outlined text-[10px]">close</span>
                </button>
              </span>
            ))}
          </div>
        )}
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
          <button
            onClick={() => setSearchEnabled((v) => !v)}
            className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
              searchEnabled
                ? 'bg-blue-100 text-blue-600 ring-1 ring-blue-200'
                : 'bg-surface-container-highest/60 text-on-surface-variant/50 hover:bg-surface-container-highest'
            }`}
            title={searchEnabled ? '关闭联网搜索' : '开启联网搜索（需要配置 GrokSearch MCP）'}
          >
            <span className="material-symbols-outlined text-base">travel_explore</span>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => {
              const v = e.target.value;
              setInput(v);
              if (v.startsWith('/')) {
                setShowSlashMenu(true);
                setSlashSelectedIdx(0);
              } else {
                setShowSlashMenu(false);
              }
            }}
            onKeyDown={(e) => {
              if (showSlashMenu && filteredCommands.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSlashSelectedIdx((i) => Math.min(i + 1, filteredCommands.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSlashSelectedIdx((i) => Math.max(i - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSlashCommand(filteredCommands[slashSelectedIdx].command);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowSlashMenu(false);
                }
                return;
              }
              if (e.key === 'Enter') void handleSend();
            }}
            onBlur={() => setTimeout(() => setShowSlashMenu(false), 150)}
            placeholder="描述需求，或输入 / 查看快捷命令..."
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
          {searchEnabled
            ? '联网搜索已开启，AI 将结合搜索结果回答'
            : thinkingEnabled
            ? '思考模式已开启，AI 将展示推理过程'
            : drawInNewTab
            ? '新画布模式已开启，生成结果会落到新建标签页'
            : '提示：输入 / 查看快捷命令，或先导入当前项目/文件后再提问'}
        </p>
      </div>
    </div>
  );
}

export default ChatPanel;
