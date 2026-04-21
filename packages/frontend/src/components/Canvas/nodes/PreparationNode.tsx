import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';

/** 准备节点 - 六边形，用于预处理/准备步骤 */
function PreparationNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);

  return (
    <div className="relative w-56 h-28">
      <div
        className={`absolute inset-0 bg-surface-container-lowest ghost-border-soft transition-all duration-200 ${
          selected ? 'ring-2 ring-teal-400/40 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
        }`}
        style={{
          clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
          background: selected ? undefined : 'var(--color-surface-container-lowest, #f8f9fa)',
        }}
      />
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-teal-500 rounded-full" />
      <div className="absolute inset-0 flex items-center justify-center px-10">
        <div className="text-center">
          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-tighter block mb-1">准备</span>
          {isEditing ? (
            <input autoFocus value={editLabel} onChange={(e) => handleLabelChange(e.target.value)}
              onKeyDown={handleKeyDown} onBlur={handleBlur}
              className="text-sm font-bold text-on-surface w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-teal-400/30" />
          ) : (
            <h3 className="text-sm font-bold text-on-surface cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-teal-500" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-teal-500" />
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-teal-500/60" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-teal-500/60" />
    </div>
  );
}

export default memo(PreparationNode);
