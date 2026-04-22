const REPO_URL = 'https://github.com/znc15/FlowVision'
const DOCS_URL = 'https://znc15.github.io/FlowVision-Docs'

const links = [
  { label: '快速开始', href: `${DOCS_URL}/quickstart` },
  { label: '功能文档', href: `${DOCS_URL}/features/ai-generate` },
  { label: 'MCP 集成', href: `${DOCS_URL}/mcp/overview` },
  { label: 'API 参考', href: `${DOCS_URL}/api/rest` },
  { label: '架构设计', href: `${DOCS_URL}/architecture/overview` },
  { label: 'GitHub', href: REPO_URL },
]

export default function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/70">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* 品牌 */}
        <div className="flex items-center gap-3">
          <img src="logo/logo_128.png" alt="FlowVision" className="w-8 h-8" />
          <span className="font-semibold text-slate-700">FlowVision</span>
        </div>

        {/* 链接 */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="hover:text-primary transition-colors"
              {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* 版权 */}
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} FlowVision &middot; MIT License
        </p>
      </div>
    </footer>
  )
}
