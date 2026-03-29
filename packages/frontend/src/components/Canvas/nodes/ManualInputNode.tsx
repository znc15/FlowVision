import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';

/**
 * 手动输入节点 - 梯形（顶部斜边）
 * 表示需要人工输入/操作的步骤
 */
function ManualInputNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);

  return (
    <div className="relative w-56 h-28">
      {/* 梯形背景 - 用 SVG clip-path */}
      <div
        className={`absolute inset-0 bg-surface-container-lowest ghost-border-soft transition-all duration-200 ${
          selected ? 'ring-2 ring-primary/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
        }`}
        style={{
          clipPath: 'polygon(12% 0%, 100% 0%, 100% 100%, 0% 100%)',
          borderRadius: '0.5rem',
        }}
      >
        <div className="absolute top-0 left-8 right-0 h-1 bg-teal-500 rounded-full" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span className="material-symbols-outlined text-sm text-teal-500">touch_app</span>
            <span className="text-[10px] font-bold text-teal-500 uppercase tracking-tighter">手动输入</span>
          </div>
          {isEditing ? (
            <input
              autoFocus
              value={editLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="text-sm font-bold text-on-surface mb-1 w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-teal-300"
            />
          ) : (
            <h3 className="text-sm font-bold text-on-surface mb-1 cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
          )}
          {data.description && (
            <p className="text-[10px] text-on-surface-variant leading-snug">{data.description}</p>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-teal-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-teal-500" />
    </div>
  );
}

export default memo(ManualInputNode);
