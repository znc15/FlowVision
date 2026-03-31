import { useState } from 'react'

const screenshots = [
  { src: 'images/main.png', alt: 'FlowVision 主界面', caption: '主界面 — AI 对话 + 画布编辑' },
  { src: 'images/settings.png', alt: 'FlowVision 设置', caption: '设置面板 — 多模型配置' },
]

export default function Screenshots() {
  const [active, setActive] = useState(0)

  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          界面预览
        </h2>
        <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
          简洁美观的设计，专注于流程图的创作体验
        </p>

        {/* 浏览器外壳 */}
        <div className="rounded-xl border border-gray-200 shadow-2xl overflow-hidden bg-white">
          {/* 标题栏 */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200">
            <span className="w-3 h-3 rounded-full bg-red-400" />
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-4 text-xs text-gray-400 font-mono">FlowVision</span>
          </div>
          {/* 截图 */}
          <img
            src={screenshots[active].src}
            alt={screenshots[active].alt}
            className="w-full"
            loading="lazy"
          />
        </div>

        {/* 缩略图切换 */}
        <div className="flex justify-center gap-4 mt-6">
          {screenshots.map((s, i) => (
            <button
              key={s.src}
              onClick={() => setActive(i)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                active === i
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.caption}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
