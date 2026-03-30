interface SideNavBarProps {
  activeTab: 'project' | 'chat' | 'prompt' | 'mcp' | 'log';
  onTabChange: (tab: 'project' | 'chat' | 'prompt' | 'mcp' | 'log') => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenSettings?: () => void;
}

/** 左侧窄导航栏 - 图标+标签 */
function SideNavBar({ activeTab, onTabChange, collapsed = false, onToggleCollapse, onOpenSettings }: SideNavBarProps) {
  return (
    <aside className={`${collapsed ? 'w-16' : 'w-16 md:w-56'} bg-surface-container-low flex flex-col p-3 gap-1.5 shrink-0 ghost-border-soft border-y-0 border-l-0 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]`}>
      {/* 项目信息 */}
      <div className={`mb-5 ${collapsed ? 'justify-center' : 'px-1.5'} flex items-center gap-2.5 min-h-[2rem]`}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-bold shadow-[0_4px_12px_rgba(0,80,203,0.2)] shrink-0">F</div>
        <div className={`hidden md:block overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-out ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[9rem] opacity-100'}`}>
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface leading-none">FlowVision</p>
            <p className="text-[9px] text-on-surface-variant/50 mt-0.5">v1.2.0</p>
        </div>
      </div>

      {/* 导航按钮 */}
      <nav className="flex-1 space-y-1">
        <NavButton
          icon="dashboard"
          label="项目"
          active={activeTab === 'project'}
          onClick={() => onTabChange('project')}
          collapsed={collapsed}
        />
        <NavButton
          icon="chat"
          label="AI 对话"
          active={activeTab === 'chat'}
          onClick={() => onTabChange('chat')}
          collapsed={collapsed}
        />
        <NavButton
          icon="auto_awesome"
          label="Prompt 生成"
          active={activeTab === 'prompt'}
          onClick={() => onTabChange('prompt')}
          collapsed={collapsed}
        />
        <NavButton
          icon="hub"
          label="MCP"
          active={activeTab === 'mcp'}
          onClick={() => onTabChange('mcp')}
          collapsed={collapsed}
        />
        <NavButton
          icon="terminal"
          label="Agent 日志"
          active={activeTab === 'log'}
          onClick={() => onTabChange('log')}
          collapsed={collapsed}
        />
      </nav>

      {/* 底部操作区 */}
      <div className="space-y-1">
        {/* 设置按钮 */}
        <NavButton
          icon="settings"
          label="设置"
          onClick={onOpenSettings}
          collapsed={collapsed}
        />

        {/* 折叠/展开按钮 */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`flex items-center justify-center ${collapsed ? 'w-10 h-10 mx-auto' : 'w-full py-2'} rounded-xl bg-surface-container-highest/40 text-on-surface-variant/60 hover:bg-primary/10 hover:text-primary transition-colors duration-150`}
          title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          <span className="material-symbols-outlined text-lg leading-none">
            {collapsed ? 'chevron_right' : 'chevron_left'}
          </span>
          {!collapsed && (
          <span className="hidden md:inline text-[10px] font-medium text-on-surface-variant/50 ml-1">收起</span>
          )}
        </button>
      </div>
    </aside>
  );
}

/** 导航按钮子组件 */
function NavButton({
  icon,
  label,
  active = false,
  onClick,
  collapsed = false,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center ${collapsed ? 'w-10 h-10 mx-auto justify-center' : 'w-full gap-2.5 px-3 py-2'} rounded-xl font-medium transition-colors duration-150 ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-on-surface-variant/60 hover:bg-surface-container-highest/50 hover:text-on-surface'
      }`}
      title={label}
    >
      <span
        className={`material-symbols-outlined shrink-0 ${collapsed ? 'text-[18px]' : 'text-[20px]'}`}
        style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
      >
        {icon}
      </span>
      <span className={`hidden md:block overflow-hidden whitespace-nowrap text-xs tracking-wide transition-[max-width,opacity] duration-300 ease-out ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[7rem] opacity-100'}`}>{label}</span>
    </button>
  );
}

export default SideNavBar;
