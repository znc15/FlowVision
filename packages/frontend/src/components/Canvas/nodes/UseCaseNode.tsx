import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';
import { useNodeEdit } from '../../../hooks/useNodeEdit';
import { useCanvasContext } from '../CanvasContext';

type FlowNode = Node<GraphNode['data']>;

function UseCaseNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);
  const { openEditDialog } = useCanvasContext();

  return (
    <div
      className={`bg-surface-container-lowest transition-all duration-200 relative ${
        selected ? 'ring-2 ring-primary/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
      }`}
      style={{
        borderRadius: '50%',
        padding: '16px 24px',
        minWidth: '120px',
        border: '2px solid #10b981',
      }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); openEditDialog(id); }}
        className="node-edit-btn hover:bg-slate-100 rounded-md p-0.5 transition-colors duration-150 absolute -top-1 -right-1"
        title="编辑节点"
      >
        <span className="material-symbols-outlined text-sm text-slate-400 hover:text-emerald-500">more_horiz</span>
      </button>

      <div className="text-center">
        {isEditing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="text-xs font-bold text-on-surface w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-primary/30 text-center"
          />
        ) : (
          <h3 className="text-xs font-bold text-on-surface cursor-text text-center whitespace-nowrap" onDoubleClick={startEdit}>{data.label}</h3>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 !bg-emerald-500" />
      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 !bg-emerald-500" />
      <Handle type="target" position={Position.Top} id="top" className="w-2.5 h-2.5 !bg-emerald-500/60" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-2.5 h-2.5 !bg-emerald-500/60" />
    </div>
  );
}

export default memo(UseCaseNode);
