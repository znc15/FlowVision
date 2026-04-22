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
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">界面预览</h2>
        <p className="text-slate-500 text-center mb-12 max-w-2xl mx-auto">
          对话与画布并行工作，减少窗口切换和信息丢失，专注思考本身。
        </p>

        <div className="grid lg:grid-cols-[1fr_240px] gap-6 items-start">
          <div className="rounded-2xl border border-slate-200 shadow-2xl overflow-hidden bg-white">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200">
              <span className="w-3 h-3 rounded-full bg-rose-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="ml-4 text-xs text-slate-400 font-mono">FlowVision Workspace</span>
            </div>
            <img
              src={screenshots[active].src}
              alt={screenshots[active].alt}
              className="w-full"
              loading="lazy"
            />
          </div>

          <div className="space-y-3">
            {screenshots.map((s, i) => (
              <button
                key={s.src}
                onClick={() => setActive(i)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                  active === i
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="text-xs opacity-80 mb-1">预览 {String(i + 1).padStart(2, '0')}</p>
                <p className="text-sm font-medium leading-relaxed">{s.caption}</p>
              </button>
            ))}
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500 leading-relaxed bg-white/80">
              支持自定义主题、快捷键与导出格式，适配从需求评审到研发交付的完整链路。
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
