import { useState, useCallback } from 'react';
import { NodeType } from '../../types/graph';
import { getAllDiagramConfigs, getNodeTypeLabel, getNodeTypeIcon } from '../../features/diagrams/diagramRegistry';

interface NodeToolboxProps {
  onAddNode: (type: NodeType) => void;
}

/** 节点工具箱面板 - 右侧可折叠 */
function NodeToolbox({ onAddNode }: NodeToolboxProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const diagramConfigs = getAllDiagramConfigs();

  const handleToggle = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const handleNodeClick = useCallback((type: NodeType) => {
    onAddNode(type);
  }, [onAddNode]);

  // 折叠状态：只显示展开按钮
  if (collapsed) {
    return (
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
        <button
          type="button"
          onClick={handleToggle}
          className="w-10 h-10 rounded-xl bg-surface-container-lowest/95 backdrop-blur-md ghost-border-soft shadow-lg flex items-center justify-center text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all duration-200"
          title="展开节点工具箱"
        >
          <span className="material-symbols-outlined text-lg">add_box</span>
        </button>
      </div>
    );
  }

  // 展开状态：显示节点分类面板
  return (
    <div className="absolute right-4 top-16 bottom-16 z-20 w-56 bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl ghost-border-soft shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden animate-[slideInRight_200ms_ease-out]">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20 shrink-0">
        <h3 className="text-sm font-semibold text-on-surface">节点工具箱</h3>
        <button
          type="button"
          onClick={handleToggle}
          className="w-7 h-7 rounded-lg hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
          title="收起"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      {/* 分类列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {diagramConfigs.map((config) => {
          const isExpanded = activeCategory === config.type;
          return (
            <div key={config.type} className="space-y-1.5">
              {/* 分类标题 */}
              <button
                type="button"
                onClick={() => setActiveCategory(isExpanded ? null : config.type)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                  isExpanded
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{config.icon}</span>
                <span className="flex-1 text-left">{config.label}</span>
                <span className={`material-symbols-outlined text-sm transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>

              {/* 节点按钮网格 */}
              {isExpanded && (
                <div className="grid grid-cols-3 gap-1.5 pl-1 animate-[slideDown_150ms_ease-out]">
                  {config.nodeTypes.map((nodeType) => (
                    <button
                      key={nodeType}
                      type="button"
                      onClick={() => handleNodeClick(nodeType)}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl bg-surface-container-high/50 hover:bg-primary/10 hover:text-primary text-on-surface-variant transition-all duration-150 group"
                      title={`添加${getNodeTypeLabel(nodeType)}节点`}
                    >
                      <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">
                        {getNodeTypeIcon(nodeType)}
                      </span>
                      <span className="text-[9px] font-medium text-center leading-tight line-clamp-1">
                        {getNodeTypeLabel(nodeType)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 底部提示 */}
      <div className="px-4 py-2 border-t border-outline-variant/20 shrink-0">
        <p className="text-[10px] text-on-surface-variant/60 text-center">
          点击节点添加到画布
        </p>
      </div>
    </div>
  );
}

export default NodeToolbox;
