import { useState, useEffect } from 'react';

interface SideNavBarProps {
  activeTab: 'project' | 'chat' | 'prompt' | 'mcp' | 'log' | 'stats' | 'examples';
  onTabChange: (tab: 'project' | 'chat' | 'prompt' | 'mcp' | 'log' | 'stats' | 'examples') => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenSettings?: () => void;
}

/** 左侧窄导航栏 - 图标+标签 */
function SideNavBar({ activeTab, onTabChange, collapsed = false, onToggleCollapse, onOpenSettings }: SideNavBarProps) {
  const [hitokoto, setHitokoto] = useState<{ text: string; from?: string } | null>(null);

  useEffect(() => {
    fetch('https://v1.hitokoto.cn/?c=a&c=b&c=d&c=i&c=k&encode=json')
      .then((r) => r.json())
      .then((d) => { if (d.hitokoto) setHitokoto({ text: d.hitokoto, from: d.from || '' }); })
      .catch(() => { /* 忽略 */ });
  }, []);

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-16 md:w-56'} bg-surface-container-low flex flex-col p-3 gap-1.5 shrink-0 ghost-border-soft border-y-0 border-l-0 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]`}>
      {/* 顶部间距 */}
      <div className="mb-3"></div>

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
        <NavButton
          icon="bar_chart"
          label="统计"
          active={activeTab === 'stats'}
          onClick={() => onTabChange('stats')}
          collapsed={collapsed}
        />
        <NavButton
          icon="dashboard"
          label="模板"
          active={activeTab === 'examples'}
          onClick={() => onTabChange('examples')}
          collapsed={collapsed}
        />
      </nav>

      {/* 底部操作区 */}
      <div className="space-y-1">
        {/* 一言 */}
        {hitokoto && !collapsed && (
          <div className="hidden md:block px-2 py-2 mb-2 rounded-xl bg-primary/10 ghost-border-soft">
            <p className="text-[10px] text-on-surface-variant leading-relaxed italic line-clamp-3">
              「{hitokoto.text}」
            </p>
            {hitokoto.from && (
              <p className="text-[9px] text-on-surface-variant/60 mt-1 text-right">—— {hitokoto.from}</p>
            )}
          </div>
        )}
        {hitokoto && collapsed && (
          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 mx-auto rounded-xl text-on-surface-variant/70 hover:bg-primary/10 hover:text-primary transition-colors duration-150"
            title={`「${hitokoto.text}」—— ${hitokoto.from || ''}`}
          >
            <span className="material-symbols-outlined text-lg leading-none">format_quote</span>
          </button>
        )}

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
