const techs = [
  { name: 'React', icon: '⚛️' },
  { name: 'TypeScript', icon: '🔷' },
  { name: 'Vite', icon: '⚡' },
  { name: 'Tailwind CSS', icon: '🎨' },
  { name: 'React Flow', icon: '🔗' },
  { name: 'Electron', icon: '🖥️' },
  { name: 'Express', icon: '🚀' },
  { name: 'Zustand', icon: '🐻' },
  { name: 'Turborepo', icon: '📦' },
  { name: 'MCP SDK', icon: '🔌' },
]

export default function TechStack() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          技术栈
        </h2>
        <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
          基于现代前端技术构建，卓越的开发体验与运行性能
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          {techs.map((t) => (
            <div
              key={t.name}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-2xl">{t.icon}</span>
              <span className="font-medium text-gray-700">{t.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
