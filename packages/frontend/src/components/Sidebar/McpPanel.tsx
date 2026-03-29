import { useState, useCallback } from 'react';
import { useSettingsStore } from '../../store/settingsStore';

/** MCP 配置示例 */
const MCP_EXAMPLES = [
  {
    name: 'Claude Desktop',
    icon: 'smart_toy',
    desc: '在 Claude Desktop 中使用 FlowVision',
    config: `{
  "mcpServers": {
    "flowvision": {
      "command": "npx",
      "args": ["-y", "flowvision-mcp"]
    }
  }
}`,
    file: 'claude_desktop_config.json',
  },
  {
    name: 'Cursor',
    icon: 'code',
    desc: '在 Cursor 编辑器中使用',
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
];

/** MCP 工具列表 */
const MCP_TOOLS = [
  { name: 'get_graph', desc: '获取当前完整流程图结构', icon: 'share' },
  { name: 'add_node', desc: '向流程图中添加一个新节点', icon: 'add_circle' },
  { name: 'remove_node', desc: '删除一个节点（级联删除关联边）', icon: 'remove_circle' },
  { name: 'connect_nodes', desc: '在两个节点之间创建连线', icon: 'link' },
  { name: 'update_node', desc: '修改指定节点的属性', icon: 'edit' },
  { name: 'apply_diff', desc: '批量应用 GraphDiff 到流程图', icon: 'difference' },
];

function McpPanel() {
  const mcpEnabled = useSettingsStore((s) => s.mcpEnabled);
  const setMcpEnabled = useSettingsStore((s) => s.setMcpEnabled);
  const save = useSettingsStore((s) => s.save);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [expandedExample, setExpandedExample] = useState<number | null>(null);

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
          <p className="text-[10px] text-on-surface-variant mt-1">Model Context Protocol 集成配置</p>
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
          <label className="text-label-sm uppercase tracking-widest font-bold text-on-surface-variant/60 block mb-3">
            可用工具
          </label>
          <div className="space-y-1.5">
            {MCP_TOOLS.map((tool) => (
              <div key={tool.name} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-container-highest/40 ghost-border-soft">
                <span className="material-symbols-outlined text-sm text-primary/60">{tool.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono font-medium text-on-surface">{tool.name}</p>
                  <p className="text-[10px] text-on-surface-variant truncate">{tool.desc}</p>
                </div>
              </div>
            ))}
          </div>
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
                  <span className="material-symbols-outlined text-lg text-primary/70">{example.icon}</span>
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

        {/* 使用说明 */}
        <div className="p-4 rounded-xl bg-primary-container/10 ghost-border-soft">
          <p className="text-[10px] font-bold text-primary-container uppercase tracking-wider mb-2">使用说明</p>
          <ol className="space-y-1.5 text-[11px] text-on-surface-variant leading-relaxed list-decimal list-inside">
            <li>确保 MCP 服务器已启用（上方开关）</li>
            <li>复制对应编辑器的配置，粘贴到配置文件中</li>
            <li>重启编辑器或 AI 客户端</li>
            <li>在 AI 对话中使用 FlowVision 工具操作流程图</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default McpPanel;
