import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';

/** 合并节点 - 倒三角，用于合并多个流程分支 */
function MergeNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);

  return (
    <div className="relative w-48 h-48">
      <div
        className={`w-full h-full bg-surface-container-lowest ghost-border-soft transform rotate-45 transition-all duration-200 ${
          selected ? 'ring-2 ring-indigo-400/40 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
        }`}
        style={{ borderRadius: '1rem' }}
      >
        <div className="absolute inset-0 flex items-center justify-center transform -rotate-45 p-6">
          <div className="text-center">
            <div className="w-8 h-1 bg-indigo-500 rounded-full mx-auto mb-3" />
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter block mb-2">合并</span>
            {isEditing ? (
              <input autoFocus value={editLabel} onChange={(e) => handleLabelChange(e.target.value)}
                onKeyDown={handleKeyDown} onBlur={handleBlur}
                className="text-sm font-bold text-on-surface mb-1 w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-indigo-400/30" />
            ) : (
              <h3 className="text-sm font-bold text-on-surface mb-1 cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
            )}
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-indigo-500 -top-2" />
      <Handle type="target" position={Position.Left} id="left_in" className="w-3 h-3 !bg-indigo-500 -left-2" style={{ top: '50%' }} />
      <Handle type="target" position={Position.Right} id="right_in" className="w-3 h-3 !bg-indigo-500 -right-2" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-indigo-500 -bottom-2" />
    </div>
  );
}

export default memo(MergeNode);
