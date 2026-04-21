import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';
import { useNodeEdit } from '../../../hooks/useNodeEdit';
import { useCanvasContext } from '../CanvasContext';

type FlowNode = Node<GraphNode['data']>;

function ActorNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);
  const { openEditDialog } = useCanvasContext();

  return (
    <div
      className={`flex flex-col items-center transition-all duration-200 ${
        selected ? 'ring-2 ring-primary/35 rounded-xl p-1' : ''
      }`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); openEditDialog(id); }}
        className="node-edit-btn hover:bg-slate-100 rounded-md p-0.5 transition-colors duration-150 absolute -top-1 -right-1"
        title="编辑节点"
      >
        <span className="material-symbols-outlined text-sm text-slate-400 hover:text-blue-500">more_horiz</span>
      </button>

      <div className="flex flex-col items-center">
        <div className="w-6 h-6 rounded-full border-2 border-blue-500 bg-blue-50 mb-0.5"></div>
        <div className="w-0.5 h-4 bg-blue-500"></div>
        <div className="flex items-center h-3">
          <div className="w-4 h-0.5 bg-blue-500"></div>
        </div>
        <div className="flex gap-3 -mt-1">
          <div className="w-0.5 h-3 bg-blue-500 transform -rotate-45 origin-top"></div>
          <div className="w-0.5 h-3 bg-blue-500 transform rotate-45 origin-top"></div>
        </div>
      </div>

      <div className="mt-1">
        {isEditing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="text-xs font-bold text-on-surface w-20 bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-primary/30 text-center"
          />
        ) : (
          <h3 className="text-xs font-bold text-on-surface cursor-text text-center" onDoubleClick={startEdit}>{data.label}</h3>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 !bg-blue-500" />
    </div>
  );
}

export default memo(ActorNode);
