import { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'flowvision-onboarding-done';

const STEPS = [
  {
    icon: 'waving_hand',
    title: '欢迎使用 FlowVision',
    desc: '一个交互式流程图工具，支持代码分析、AI 生成和 MCP 协议同步。',
  },
  {
    icon: 'folder_open',
    title: '打开项目',
    desc: '点击左侧文件浏览器，选择本地项目文件夹或从 GitHub 导入仓库。',
  },
  {
    icon: 'auto_awesome',
    title: 'AI 生成流程图',
    desc: '在聊天面板中描述你的需求，AI 会自动生成对应的流程图。也可以使用项目页的"AI 分析项目"功能。',
  },
  {
    icon: 'edit',
    title: '编辑与定制',
    desc: '双击节点编辑标签，点击节点菜单按钮修改属性。拖拽节点到分组容器进行归类。',
  },
  {
    icon: 'rocket_launch',
    title: '准备就绪！',
    desc: '开始创建你的第一个流程图吧。你可以随时在设置中重新查看此引导。',
  },
];

interface OnboardingGuideProps {
  forceShow?: boolean;
  onClose?: () => void;
}

function OnboardingGuide({ forceShow, onClose }: OnboardingGuideProps) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceShow) {
      setShow(true);
      setStep(0);
      return;
    }
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) {
        setShow(true);
      }
    } catch { /* 忽略 */ }
  }, [forceShow]);

  const handleFinish = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, '1');
    } catch { /* 忽略 */ }
    setShow(false);
    onClose?.();
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  if (!show) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]" onClick={handleFinish} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden ghost-border-soft animate-[scaleIn_250ms_ease-out]">
        {/* 内容区 */}
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {current.icon}
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">{current.title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{current.desc}</p>
        </div>

        {/* 进度指示 */}
        <div className="flex justify-center gap-1.5 pb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-primary' : 'w-1.5 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100">
          <button
            onClick={handleFinish}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            跳过
          </button>
          <button
            onClick={handleNext}
            className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-all duration-200 active:scale-95"
          >
            {step < STEPS.length - 1 ? '下一步' : '开始使用'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingGuide;
