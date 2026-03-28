interface TopNavBarProps {
  onOpenSettings?: () => void;
}

function TopNavBar({ onOpenSettings }: TopNavBarProps) {
  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-14 bg-slate-50/85 backdrop-blur-xl ghost-border-soft">
      {/* 左侧：Logo */}
      <div className="flex items-center gap-8">
        <div className="text-lg font-semibold text-slate-900 flex items-center gap-2 tracking-tight">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            architecture
          </span>
          FlowVision
        </div>
      </div>

      {/* 右侧：设置按钮 */}
      <div className="flex items-center gap-2 text-slate-500">
        <button className="icon-button-soft h-9 w-9 active:scale-95" onClick={onOpenSettings} title="设置">
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>
      </div>
    </header>
  );
}

export default TopNavBar;
