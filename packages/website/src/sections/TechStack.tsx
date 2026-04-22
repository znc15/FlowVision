const techs = [
  { name: 'React', group: 'UI' },
  { name: 'TypeScript', group: 'Language' },
  { name: 'Vite', group: 'Build' },
  { name: 'Tailwind CSS', group: 'Style' },
  { name: 'React Flow', group: 'Canvas' },
  { name: 'Electron', group: 'Desktop' },
  { name: 'Express', group: 'Backend' },
  { name: 'Zustand', group: 'State' },
  { name: 'Turborepo', group: 'Monorepo' },
  { name: 'MCP SDK', group: 'Protocol' },
]

export default function TechStack() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">技术栈</h2>
        <p className="text-slate-500 text-center mb-12 max-w-2xl mx-auto">
          基于现代前端技术构建，卓越的开发体验与运行性能
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {techs.map((t) => (
            <div
              key={t.name}
              className="card-hover px-4 py-4 bg-white/90 border border-slate-200 rounded-xl"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-1">{t.group}</p>
              <p className="font-semibold text-slate-800">{t.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
