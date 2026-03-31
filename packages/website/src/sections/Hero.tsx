const REPO_URL = 'https://github.com/YangXiaoMian/FlowVision'

const tags = ['一键分析', '自动生成', '可视化编辑', 'MCP 同步']

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* 背景网格 + 光晕 */}
      <div className="absolute inset-0 hero-grid" />
      <div className="absolute inset-0 hero-glow" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center py-20">
        {/* Logo */}
        <img
          src="logo/logo_256.png"
          alt="FlowVision Logo"
          className="w-24 h-24 mx-auto mb-8"
        />

        {/* 标题 */}
        <h1 className="text-6xl sm:text-7xl font-bold tracking-tight mb-4">
          <span className="gradient-text">FlowVision</span>
        </h1>

        {/* 副标题 */}
        <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
          AI 驱动的智能流程图设计工具
        </p>

        {/* 特性标签 */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-4 py-1.5 text-sm font-medium rounded-full bg-primary/5 text-primary border border-primary/10"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* CTA 按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="docs/quickstart"
            className="inline-flex items-center px-8 py-3 text-base font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors shadow-md shadow-primary/20"
          >
            快速开始
            <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-8 py-3 text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="mr-2 w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>
        </div>
      </div>
    </section>
  )
}
