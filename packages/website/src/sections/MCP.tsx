const mcpTools = [
  { name: 'get_graph', desc: '获取完整流程图数据' },
  { name: 'add_node', desc: '添加新节点' },
  { name: 'update_node', desc: '更新节点属性' },
  { name: 'delete_node', desc: '删除指定节点' },
  { name: 'add_edge', desc: '添加连线' },
  { name: 'delete_edge', desc: '删除连线' },
  { name: 'clear_graph', desc: '清空画布' },
  { name: 'generate_flowchart', desc: 'AI 生成流程图' },
  { name: 'generate_prompt', desc: 'AI 生成优化 Prompt' },
  { name: 'analyze_project', desc: '分析项目结构' },
  { name: 'set_theme', desc: '切换主题' },
  { name: 'auto_layout', desc: '自动布局' },
  { name: 'export_graph', desc: '导出为 JSON/PNG/SVG' },
  { name: 'import_graph', desc: '导入流程图' },
  { name: 'undo', desc: '撤销操作' },
  { name: 'redo', desc: '重做操作' },
]

const configExample = `{
  "mcpServers": {
    "flowvision": {
      "url": "http://localhost:3000/mcp"
    }
  }
}`

export default function MCP() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">MCP 协议集成</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            通过 Model Context Protocol 连接 AI 客户端，让流程图状态可读取、可编辑、可回放。
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* 配置示例 */}
          <div className="section-shell p-6">
            <h3 className="text-lg font-semibold mb-4">一行配置，即刻接入</h3>
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-400 text-xs font-mono">
                <span>claude_desktop_config.json</span>
              </div>
              <pre className="p-4 bg-slate-900 text-emerald-300 text-sm font-mono overflow-x-auto leading-relaxed">
                {configExample}
              </pre>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              支持 Claude Desktop、Cursor、VS Code Copilot 等任意 MCP 兼容客户端
            </p>
          </div>

          {/* 工具列表 */}
          <div className="section-shell p-6">
            <h3 className="text-lg font-semibold mb-4">16 个标准化工具</h3>
            <div className="grid grid-cols-2 gap-2">
              {mcpTools.map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-start gap-2 px-3 py-2 bg-white/90 rounded-lg border border-slate-100 text-sm"
                >
                  <code className="text-primary font-mono text-xs mt-0.5 shrink-0">
                    {tool.name}
                  </code>
                  <span className="text-slate-500 text-xs">{tool.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
