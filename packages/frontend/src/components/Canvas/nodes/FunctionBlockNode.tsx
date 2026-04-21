import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';
import { useNodeEdit } from '../../../hooks/useNodeEdit';
import { useCanvasContext } from '../CanvasContext';

type FlowNode = Node<GraphNode['data']>;

function FunctionBlockNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);
  const { openEditDialog } = useCanvasContext();

  return (
    <div
      className={`w-48 bg-surface-container-lowest rounded-xl ghost-border-soft overflow-hidden relative transition-all duration-200 ${
        selected ? 'ring-2 ring-primary/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
      }`}
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-tighter">Function</span>
          <button
            onClick={(e) => { e.stopPropagation(); openEditDialog(id); }}
            className="node-edit-btn hover:bg-slate-100 rounded-md p-0.5 transition-colors duration-150"
            title="编辑节点"
          >
            <span className="material-symbols-outlined text-sm text-slate-400 hover:text-orange-500">more_horiz</span>
          </button>
        </div>

        {isEditing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="text-sm font-bold text-on-surface w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-primary/30"
          />
        ) : (
          <h3 className="text-sm font-bold text-on-surface cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
        )}
        {data.description && (
          <p className="text-[10px] text-on-surface-variant mt-1 leading-snug">{data.description}</p>
        )}
      </div>

      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-orange-500" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-orange-500" />
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-orange-500/60" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-orange-500/60" />
    </div>
  );
}

export default memo(FunctionBlockNode);
