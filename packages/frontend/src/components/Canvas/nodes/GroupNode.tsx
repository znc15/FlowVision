import { memo } from 'react';
import { Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';

/**
 * 分组节点 - 虚线边框容器
 * 用于将多个节点组织在一起
 */
function GroupNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);

  return (
    <div
      className={`min-w-[300px] min-h-[200px] bg-surface-container-low/60 rounded-xl transition-all duration-200 ${
        selected ? 'ring-2 ring-outline/35 shadow-[0_20px_40px_rgba(25,28,30,0.06)]' : ''
      }`}
      style={{
        border: '1px dashed rgba(194, 198, 216, 0.45)',
      }}
    >
      <div className="px-4 py-3 ghost-border-soft border-x-0 border-t-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-on-surface-variant">folder</span>
          {isEditing ? (
            <input
              autoFocus
              value={editLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="text-sm font-bold text-on-surface w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-outline/30"
            />
          ) : (
            <h3 className="text-sm font-bold text-on-surface cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
          )}
        </div>
        {data.description && (
          <p className="text-[10px] text-on-surface-variant mt-1">{data.description}</p>
        )}
      </div>

      <div className="p-4">
        <p className="text-[10px] text-on-surface-variant/50 italic text-center">
          拖拽节点到此处进行分组
        </p>
      </div>
    </div>
  );
}

export default memo(GroupNode);
