import { useState, useCallback } from 'react';
import { useSettingsStore } from '../../store/settingsStore';

/** MCP 配置示例 */
const MCP_EXAMPLES = [
  {
    name: 'Claude Code CLI',
    icon: 'terminal',
    desc: '在 Claude Code CLI 中使用 FlowVision',
    brandColor: 'text-amber-600 bg-amber-50',
    config: `{
  "mcpServers": {
    "flowvision": {
      "command": "npx",
      "args": ["-y", "flowvision-mcp"]
    }
  }
}`,
    file: '.claude/settings.json',
  },
  {
    name: 'Cursor',
    icon: 'code',
    desc: '在 Cursor 编辑器中使用',
    brandColor: 'text-violet-600 bg-violet-50',
    config: `{
  "mcpServers": {
    "flowvision": {
      "command": "npx",
      "args": ["-y", "flowvision-mcp"],
      "env": {
        "FLOWVISION_BACKEND_URL": "http://localhost:3001"
      }
    }
  }
}`,
    file: '.cursor/mcp.json',
  },
  {
    name: 'VS Code (Copilot)',
    icon: 'terminal',
    desc: '在 VS Code Copilot 中使用',
    brandColor: 'text-blue-600 bg-blue-50',
    config: `{
  "mcp": {
    "servers": {
      "flowvision": {
        "command": "npx",
        "args": ["-y", "flowvision-mcp"]
      }
    }
  }
}`,
    file: '.vscode/settings.json',
  },
  {
    name: 'Windsurf',
    icon: 'air',
    desc: '在 Windsurf 中使用',
    brandColor: 'text-teal-600 bg-teal-50',
    config: `{
  "mcpServers": {
    "flowvision": {
      "command": "npx",
      "args": ["-y", "flowvision-mcp"],
      "env": {
        "FLOWVISION_BACKEND_URL": "http://localhost:3001"
      }
    }
  }
}`,
    file: '~/.codeium/windsurf/mcp_config.json',
  },
  {
    name: 'Cline',
    icon: 'extension',
    desc: '在 VS Code Cline 扩展中使用',
    brandColor: 'text-indigo-600 bg-indigo-50',
    config: `{
  "mcpServers": {
    "flowvision": {
      "command": "npx",
      "args": ["-y", "flowvision-mcp"],
      "env": {
        "FLOWVISION_BACKEND_URL": "http://localhost:3001"
      }
    }
  }
}`,
    file: '~/.cline/mcp_settings.json',
  },
  {
    name: 'Cherry Studio',
    icon: 'spa',
    desc: '在 Cherry Studio 中使用',
    brandColor: 'text-pink-600 bg-pink-50',
    config: `{
  "mcpServers": {
    "flowvision": {
      "command": "npx",
      "args": ["-y", "flowvision-mcp"],
      "env": {
        "FLOWVISION_BACKEND_URL": "http://localhost:3001"
      }
    }
  }
}`,
    file: 'Cherry Studio → 设置 → MCP 服务器',
  },
];

/** MCP 工具列表（按类别分组） */
const MCP_TOOLS = [
  { name: 'get_graph', desc: '获取当前完整流程图结构', icon: 'share', category: 'query' as const },
  { name: 'list_nodes', desc: '列出所有节点摘要信息', icon: 'list', category: 'query' as const },
  { name: 'get_node', desc: '获取指定节点详情及关联边', icon: 'info', category: 'query' as const },
  { name: 'get_stats', desc: '获取流程图统计概览', icon: 'bar_chart', category: 'query' as const },
  { name: 'search_nodes', desc: '按关键词搜索节点', icon: 'search', category: 'query' as const },
  { name: 'get_subgraph', desc: '获取节点及其连通子图', icon: 'account_tree', category: 'query' as const },
  { name: 'add_node', desc: '向流程图中添加新节点（支持 12 种类型）', icon: 'add_circle', category: 'mutate' as const },
  { name: 'batch_add_nodes', desc: '批量添加多个节点', icon: 'playlist_add', category: 'mutate' as const },
  { name: 'update_node', desc: '修改指定节点的属性', icon: 'edit', category: 'mutate' as const },
  { name: 'remove_node', desc: '删除一个节点（级联删除关联边）', icon: 'remove_circle', category: 'mutate' as const },
  { name: 'connect_nodes', desc: '在两个节点之间创建连线', icon: 'link', category: 'mutate' as const },
  { name: 'remove_edge', desc: '删除指定连线', icon: 'link_off', category: 'mutate' as const },
  { name: 'update_edge', desc: '修改连线标签、类型与动画', icon: 'edit_road', category: 'mutate' as const },
  { name: 'apply_diff', desc: '批量应用 GraphDiff 到流程图（增 / 删 / 改）', icon: 'difference', category: 'manage' as const },
  { name: 'export_graph', desc: '导出流程图为 Mermaid 格式文本', icon: 'output', category: 'manage' as const },
  { name: 'clear_graph', desc: '清空整个画布', icon: 'delete_forever', category: 'manage' as const },
];

const TOOL_CATEGORIES = {
  query: { label: '查询', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: 'search' },
  mutate: { label: '变更', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: 'edit_square' },
  manage: { label: '管理', color: 'text-rose-600 bg-rose-50 border-rose-200', icon: 'settings' },
} as const;

/** 支持的节点类型 */
const NODE_TYPES = [
  { type: 'process', label: '流程', icon: 'crop_square', color: 'text-blue-600 bg-blue-50' },
  { type: 'decision', label: '判断', icon: 'diamond', color: 'text-amber-600 bg-amber-50' },
  { type: 'start', label: '开始', icon: 'play_circle', color: 'text-green-600 bg-green-50' },
  { type: 'end', label: '结束', icon: 'stop_circle', color: 'text-red-500 bg-red-50' },
  { type: 'data', label: '数据', icon: 'database', color: 'text-purple-600 bg-purple-50' },
  { type: 'subprocess', label: '子流程', icon: 'account_tree', color: 'text-teal-600 bg-teal-50' },
  { type: 'delay', label: '延迟', icon: 'hourglass_top', color: 'text-orange-500 bg-orange-50' },
  { type: 'document', label: '文档', icon: 'article', color: 'text-cyan-600 bg-cyan-50' },
  { type: 'manual_input', label: '手动输入', icon: 'touch_app', color: 'text-pink-500 bg-pink-50' },
  { type: 'annotation', label: '注释', icon: 'sticky_note_2', color: 'text-slate-600 bg-slate-50' },
  { type: 'connector', label: '连接器', icon: 'radio_button_checked', color: 'text-indigo-500 bg-indigo-50' },
  { type: 'group', label: '分组', icon: 'folder', color: 'text-slate-600 bg-slate-100' },
];

function McpPanel() {
  const mcpEnabled = useSettingsStore((s) => s.mcpEnabled);
  const setMcpEnabled = useSettingsStore((s) => s.setMcpEnabled);
  const save = useSettingsStore((s) => s.save);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [expandedExample, setExpandedExample] = useState<number | null>(null);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [nodeTypesExpanded, setNodeTypesExpanded] = useState(false);

  const handleToggleMcp = useCallback(() => {
    setMcpEnabled(!mcpEnabled);
    save();
  }, [mcpEnabled, setMcpEnabled, save]);

  const handleCopy = useCallback((text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* 标题 */}
      <div className="workbench-panel-header px-5">
        <div>
          <h2 className="text-title-sm font-semibold text-on-surface">MCP 服务器</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {/* MCP 开关 */}
        <div className="settings-switch-row bg-surface-container-highest/60 rounded-xl ghost-border-soft p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mcpEnabled ? 'bg-primary/10' : 'bg-slate-100'}`}>
              <span className={`material-symbols-outlined text-xl ${mcpEnabled ? 'text-primary' : 'text-slate-400'}`}>
                hub
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-on-surface">MCP 服务器</p>
              <p className="text-[10px] text-on-surface-variant mt-0.5 truncate">
                {mcpEnabled ? '已启用 · 可通过 MCP 协议同步流程图' : '未启用'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleMcp}
            className={`switch-control ${mcpEnabled ? 'switch-control-on' : 'switch-control-off'}`}
            aria-label="切换 MCP 服务"
          >
            <span className={`switch-thumb ${mcpEnabled ? 'translate-x-5' : ''}`}></span>
          </button>
        </div>

        {/* 可用工具 */}
        <div>
          <button
            onClick={() => setToolsExpanded(!toolsExpanded)}
            className="w-full flex items-center justify-between mb-3 group"
          >
            <label className="text-label-sm uppercase tracking-widest font-bold text-on-surface-variant/60 cursor-pointer">
              可用工具
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-on-surface-variant/40 font-medium">{MCP_TOOLS.length} 个</span>
              <span className={`material-symbols-outlined text-sm text-on-surface-variant/40 transition-transform duration-200 ${toolsExpanded ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </div>
          </button>
          {toolsExpanded && (
          <div className="space-y-3 animate-[fadeIn_150ms_ease-out]">
            {(['query', 'mutate', 'manage'] as const).map((cat) => {
              const catInfo = TOOL_CATEGORIES[cat];
              const tools = MCP_TOOLS.filter((t) => t.category === cat);
              return (
                <div key={cat}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`material-symbols-outlined text-xs ${catInfo.color.split(' ')[0]}`}>{catInfo.icon}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${catInfo.color.split(' ')[0]}`}>{catInfo.label}</span>
                    <span className="text-[9px] text-on-surface-variant/30">{tools.length}</span>
                  </div>
                  <div className="space-y-1">
                    {tools.map((tool) => (
                      <div key={tool.name} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${catInfo.color.split(' ')[1]} ${catInfo.color.split(' ')[2]} border-opacity-60`}>
                        <span className={`material-symbols-outlined text-sm ${catInfo.color.split(' ')[0]}/70`}>{tool.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-mono font-medium text-on-surface">{tool.name}</p>
                          <p className="text-[10px] text-on-surface-variant truncate">{tool.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* 配置示例 */}
        <div>
          <label className="text-label-sm uppercase tracking-widest font-bold text-on-surface-variant/60 block mb-3">
            一键配置
          </label>
          <div className="space-y-2">
            {MCP_EXAMPLES.map((example, idx) => (
              <div key={example.name} className="rounded-xl ghost-border-soft overflow-hidden">
                <button
                  onClick={() => setExpandedExample(expandedExample === idx ? null : idx)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-surface-container-highest/40 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${example.brandColor.split(' ')[1]}`}>
                    <span className={`material-symbols-outlined text-base ${example.brandColor.split(' ')[0]}`}>{example.icon}</span>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-xs font-medium text-on-surface">{example.name}</p>
                    <p className="text-[10px] text-on-surface-variant truncate">{example.desc}</p>
                  </div>
                  <span className={`material-symbols-outlined text-sm text-slate-400 transition-transform duration-200 ${expandedExample === idx ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>

                {expandedExample === idx && (
                  <div className="px-3.5 pb-3 animate-[fadeIn_150ms_ease-out]">
                    <p className="text-[10px] text-on-surface-variant mb-1.5">
                      配置文件: <code className="text-primary font-mono">{example.file}</code>
                    </p>
                    <div className="relative">
                      <pre className="bg-slate-900 text-slate-200 rounded-lg p-3 text-[10px] leading-relaxed font-mono overflow-x-auto">
                        {example.config}
                      </pre>
                      <button
                        onClick={() => handleCopy(example.config, idx)}
                        className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 ${
                          copiedIdx === idx
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600/80'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs">
                          {copiedIdx === idx ? 'check' : 'content_copy'}
                        </span>
                        {copiedIdx === idx ? '已复制' : '复制'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 支持的节点类型 */}
        <div>
          <button
            onClick={() => setNodeTypesExpanded(!nodeTypesExpanded)}
            className="w-full flex items-center justify-between mb-3 group"
          >
            <label className="text-label-sm uppercase tracking-widest font-bold text-on-surface-variant/60 cursor-pointer">
              支持的节点类型
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-on-surface-variant/40 font-medium">{NODE_TYPES.length} 种</span>
              <span className={`material-symbols-outlined text-sm text-on-surface-variant/40 transition-transform duration-200 ${nodeTypesExpanded ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </div>
          </button>
          {nodeTypesExpanded && (
          <div className="grid grid-cols-3 gap-1.5 animate-[fadeIn_150ms_ease-out]">
            {NODE_TYPES.map((nt) => (
              <div key={nt.type} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-container-highest/40 ghost-border-soft">
                <span className={`material-symbols-outlined text-xs ${nt.color.split(' ')[0]}`}>{nt.icon}</span>
                <span className="text-[10px] text-on-surface-variant">{nt.label}</span>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* 使用说明 */}
        <div className="p-4 rounded-xl bg-primary-container/10 ghost-border-soft">
          <p className="text-[10px] font-bold text-primary-container uppercase tracking-wider mb-3">使用说明</p>
          <div className="space-y-2.5">
            {[
              '确保 MCP 服务器已启用（上方开关）',
              '复制对应编辑器的配置，粘贴到配置文件中',
              '重启编辑器或 AI 客户端',
              '在 AI 对话中使用 FlowVision 工具操作流程图',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-[11px] text-on-surface-variant leading-relaxed pt-0.5">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default McpPanel;
