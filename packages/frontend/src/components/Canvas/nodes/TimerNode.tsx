import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';

/** 定时器节点 - 圆形 + 时钟图标，用于定时/等待事件 */
function TimerNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);

  return (
    <div
      className={`w-24 h-24 bg-surface-container-lowest ghost-border-soft rounded-full flex flex-col items-center justify-center transition-all duration-200 ${
        selected ? 'ring-2 ring-orange-400/40 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
      }`}
    >
      <span className="material-symbols-outlined text-base text-orange-500 mb-0.5">timer</span>
      <div className="text-center px-2">
        {isEditing ? (
          <input autoFocus value={editLabel} onChange={(e) => handleLabelChange(e.target.value)}
            onKeyDown={handleKeyDown} onBlur={handleBlur}
            className="text-[10px] font-bold text-on-surface w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-orange-400/30 text-center" />
        ) : (
          <h3 className="text-[10px] font-bold text-on-surface cursor-text leading-tight" onDoubleClick={startEdit}>{data.label}</h3>
        )}
      </div>

      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-orange-500" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-orange-500" />
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-orange-500/60" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-orange-500/60" />
    </div>
  );
}

export default memo(TimerNode);
