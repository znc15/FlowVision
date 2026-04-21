import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';
import { useCanvasContext } from '../CanvasContext';

function ActivationNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);
  const { openEditDialog } = useCanvasContext();

  return (
    <div
      className={`w-6 bg-surface-container-lowest rounded ghost-border-soft relative transition-all duration-200 ${
        selected ? 'ring-2 ring-primary/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
      }`}
      style={{ minHeight: '60px' }}
    >
      <div className="node-accent-primary"></div>

      <div className="flex flex-col items-center justify-center h-full py-2">
        <button
          onClick={(e) => { e.stopPropagation(); openEditDialog(id); }}
          className="node-edit-btn hover:bg-slate-100 rounded-md p-0.5 transition-colors duration-150 absolute -top-1 -right-1"
          title="编辑节点"
        >
          <span className="material-symbols-outlined text-[10px] text-slate-400 hover:text-primary">more_horiz</span>
        </button>

        {isEditing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="text-[8px] font-medium text-on-surface w-16 bg-surface-container-high rounded px-0.5 py-0.5 outline-none ring-2 ring-primary/30 absolute -top-6 left-1/2 -translate-x-1/2"
          />
        ) : (
          <span className="text-[8px] font-medium text-on-surface-variant cursor-text text-center" onDoubleClick={startEdit}>{data.label}</span>
        )}
      </div>

      <Handle type="target" position={Position.Top} id="top" className="w-2 h-2 !bg-primary/60" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-2 h-2 !bg-primary/60" />
      <Handle type="target" position={Position.Left} id="left" className="w-2 h-2 !bg-primary/60" />
      <Handle type="source" position={Position.Right} id="right" className="w-2 h-2 !bg-primary/60" />
    </div>
  );
}

export default memo(ActivationNode);
