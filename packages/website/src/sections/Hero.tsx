const REPO_URL = 'https://github.com/znc15/FlowVision'

const tags = ['桌面优先', '多模型 AI', '流程图工程化', 'MCP 实时协同']
const stats = [
  { value: '16', label: 'MCP 标准工具' },
  { value: '12', label: '节点类型' },
  { value: '4', label: '连线样式' },
]

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden px-6 py-16 sm:py-20">
      {/* 背景网格 + 光晕 */}
      <div className="absolute inset-0 hero-grid" />
      <div className="absolute inset-0 hero-glow" />
      <div className="absolute inset-0 noise-overlay opacity-35" />

      <div className="relative z-10 max-w-6xl mx-auto w-full section-shell p-8 sm:p-12">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary mb-6">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              v1.2 持续迭代中
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4 leading-[1.05]">
              从想法到图谱
              <span className="gradient-text block">FlowVision 一步到位</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 mb-7 max-w-2xl leading-relaxed">
              面向开发团队的 AI 流程图工作台。支持自然语言生成、可视化精修、项目结构分析与 MCP 同步，让设计与实现保持同频。
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-1.5 text-sm font-medium rounded-full bg-white border border-slate-200 text-slate-700"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
              <a
                href="https://znc15.github.io/FlowVision-Docs/quickstart"
                className="inline-flex items-center px-8 py-3 text-base font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
              >
                5 分钟上手
                <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-8 py-3 text-base font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                查看源码
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {stats.map((item) => (
                <div key={item.label} className="rounded-xl bg-white/90 border border-slate-100 px-4 py-3">
                  <p className="text-2xl font-bold text-slate-800">{item.value}</p>
                  <p className="text-xs sm:text-sm text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-950 text-slate-200 overflow-hidden shadow-2xl shadow-slate-900/20">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <span className="text-xs text-slate-400 font-mono">flowvision session</span>
            </div>
            <div className="p-5 space-y-4 text-sm leading-relaxed">
              <p className="text-emerald-300 font-mono">$ /analyze repo --source github</p>
              <p className="text-slate-300">已识别 24 个模块，自动生成系统流程骨架。</p>
              <div className="h-px bg-slate-800" />
              <p className="text-cyan-300 font-mono">$ /generate "支付审批流程 + 异常分支"</p>
              <p className="text-slate-300">图谱已生成，可继续拖拽编辑并同步到 MCP 客户端。</p>
            </div>
            <img
              src="images/main.png"
              alt="FlowVision 主界面"
              className="w-full border-t border-slate-800/80"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
