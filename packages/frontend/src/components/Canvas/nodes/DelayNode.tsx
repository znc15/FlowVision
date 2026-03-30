import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';

/**
 * 延迟节点 - 半圆右侧形状（D 形）
 * 表示等待/延迟操作
 */
function DelayNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);

  return (
    <div className="relative w-56 h-24">
      <div
        className={`absolute inset-0 bg-surface-container-lowest ghost-border-soft transition-all duration-200 ${
          selected ? 'ring-2 ring-primary/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
        }`}
        style={{ borderRadius: '0.5rem 2.5rem 2.5rem 0.5rem' }}
      >
        <div className="absolute -top-px left-4 right-8 h-1 bg-amber-500 rounded-full" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span className="material-symbols-outlined text-sm text-amber-500">hourglass_top</span>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter">延迟</span>
          </div>
          {isEditing ? (
            <input
              autoFocus
              value={editLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="text-sm font-bold text-on-surface mb-1 w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-amber-300"
            />
          ) : (
            <h3 className="text-sm font-bold text-on-surface mb-1 cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
          )}
          {data.description && (
            <p className="text-[10px] text-on-surface-variant leading-snug">{data.description}</p>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-amber-500" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-amber-500" />
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-amber-500/60" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-amber-500/60" />
    </div>
  );
}

export default memo(DelayNode);
