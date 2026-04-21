import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';

/** 队列节点 - 堆叠平行四边形，用于表示队列/缓冲 */
function QueueNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);

  return (
    <div className="relative w-56 h-32">
      {/* 后层 */}
      <div
        className="absolute top-2 left-1 right-0 bottom-0 bg-surface-container-highest/40 rounded-md transition-all duration-200"
        style={{ transform: 'skewX(-12deg)' }}
      />
      {/* 前层 */}
      <div
        className={`absolute top-0 left-2 right-1 bottom-2 bg-surface-container-lowest ghost-border-soft transition-all duration-200 ${
          selected ? 'ring-2 ring-cyan-400/40 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
        }`}
        style={{ transform: 'skewX(-12deg)', borderRadius: '0.5rem' }}
      >
        <div className="absolute -top-px left-3 right-3 h-1 bg-cyan-500 rounded-full" style={{ transform: 'skewX(12deg)' }} />
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="material-symbols-outlined text-sm text-cyan-600">view_agenda</span>
            <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-tighter">队列</span>
          </div>
          {isEditing ? (
            <input autoFocus value={editLabel} onChange={(e) => handleLabelChange(e.target.value)}
              onKeyDown={handleKeyDown} onBlur={handleBlur}
              className="text-sm font-bold text-on-surface w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-cyan-400/30" />
          ) : (
            <h3 className="text-sm font-bold text-on-surface cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-cyan-500" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-cyan-500" />
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-cyan-500/60" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-cyan-500/60" />
    </div>
  );
}

export default memo(QueueNode);
