import { memo } from 'react';
import { useTabStore } from '../../store/tabStore';

/** 画布标签栏 */
function TabBar() {
  const { tabs, activeTabId, setActiveTab, addTab, closeTab } = useTabStore();

  return (
    <div className="flex items-center h-9 bg-surface-container-lowest/92 backdrop-blur-sm ghost-border-soft border-x-0 border-t-0 px-2 gap-1 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`group flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap ${
            tab.id === activeTabId
              ? 'bg-primary-container/15 text-primary'
              : 'text-on-surface-variant hover:bg-surface-container-high/80'
          }`}
        >
          <span className="material-symbols-outlined text-sm">dashboard</span>
          <span>{tab.title}</span>
          {tabs.length > 1 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity hover:text-error"
            >
              close
            </span>
          )}
        </button>
      ))}

      <button
        onClick={() => addTab()}
        className="icon-button-soft h-6 w-6 ml-1 shrink-0"
        title="新建画布"
      >
        <span className="material-symbols-outlined text-sm">add</span>
      </button>
    </div>
  );
}

export default memo(TabBar);
