interface SideNavBarProps {
  activeTab: 'project' | 'chat' | 'mcp';
  onTabChange: (tab: 'project' | 'chat' | 'mcp') => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenSettings?: () => void;
}

/** 左侧窄导航栏 - 图标+标签 */
function SideNavBar({ activeTab, onTabChange, collapsed = false, onToggleCollapse, onOpenSettings }: SideNavBarProps) {
  return (
    <aside className={`${collapsed ? 'w-16' : 'w-16 md:w-56'} bg-surface-container-low flex flex-col p-3 gap-1.5 shrink-0 ghost-border-soft border-y-0 border-l-0 transition-[width] duration-200 ease-out`}>
      {/* 项目信息 */}
      <div className={`mb-5 ${collapsed ? 'justify-center' : 'px-1.5'} flex items-center gap-2.5`}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-bold shadow-[0_4px_12px_rgba(0,80,203,0.2)] shrink-0">F</div>
        {!collapsed && (
          <div className="hidden md:block">
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface leading-none">FlowVision</p>
            <p className="text-[9px] text-on-surface-variant/50 mt-0.5">v1.0.0</p>
          </div>
        )}
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
          icon="hub"
          label="MCP"
          active={activeTab === 'mcp'}
          onClick={() => onTabChange('mcp')}
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
          onClick={onToggleCollapse}
          className={`flex items-center justify-center w-full ${collapsed ? 'aspect-square' : 'py-2'} rounded-xl bg-surface-container-highest/40 text-on-surface-variant/60 hover:bg-primary/10 hover:text-primary transition-colors duration-150`}
          title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          <span className={`material-symbols-outlined text-lg transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}>
            chevron_left
          </span>
          {!collapsed && <span className="hidden md:inline text-[10px] font-medium text-on-surface-variant/50 ml-1">收起</span>}
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
      onClick={onClick}
      className={`flex items-center ${collapsed ? 'w-full aspect-square justify-center' : 'w-full gap-2.5 px-3 py-2'} rounded-xl font-medium transition-colors duration-150 ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-on-surface-variant/60 hover:bg-surface-container-highest/50 hover:text-on-surface'
      }`}
      title={label}
    >
      <span
        className={`material-symbols-outlined ${active ? 'text-[20px]' : 'text-[20px]'}`}
        style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
      >
        {icon}
      </span>
      {!collapsed && <span className="hidden md:block text-xs tracking-wide">{label}</span>}
    </button>
  );
}

export default SideNavBar;
