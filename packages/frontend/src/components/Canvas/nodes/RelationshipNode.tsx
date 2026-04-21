import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';
import { useCanvasContext } from '../CanvasContext';

function RelationshipNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);
  const { openEditDialog } = useCanvasContext();

  return (
    <div
      className={`relative transition-all duration-200 ${
        selected ? 'ring-2 ring-purple-400/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
      }`}
    >
      <div className="w-28 h-28 bg-purple-50 ghost-border-soft transform rotate-45 flex items-center justify-center">
        <div className="transform -rotate-45 flex flex-col items-center gap-1">
          {isEditing ? (
            <input
              autoFocus
              value={editLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="text-xs font-bold text-on-surface w-20 bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-purple-400/30 text-center"
            />
          ) : (
            <span className="text-xs font-bold text-on-surface cursor-text text-center" onDoubleClick={startEdit}>{data.label}</span>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); openEditDialog(id); }}
            className="node-edit-btn hover:bg-purple-100 rounded-md p-0.5 transition-colors duration-150"
            title="编辑节点"
          >
            <span className="material-symbols-outlined text-sm text-slate-400 hover:text-purple-600">more_horiz</span>
          </button>
        </div>
      </div>

      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-purple-500 !top-0 !left-1/2 !-translate-x-1/2" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-purple-500 !bottom-0 !left-1/2 !-translate-x-1/2" />
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-purple-400/60 !left-0 !top-1/2 !-translate-y-1/2" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-purple-400/60 !right-0 !top-1/2 !-translate-y-1/2" />
    </div>
  );
}

export default memo(RelationshipNode);
