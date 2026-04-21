import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';
import { useCanvasContext } from '../CanvasContext';

function AttributeNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);
  const { openEditDialog } = useCanvasContext();

  return (
    <div
      className={`bg-green-50 rounded-full ghost-border-soft relative transition-all duration-200 ${
        selected ? 'ring-2 ring-green-400/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
      }`}
    >
      <div className="px-5 py-3 flex items-center gap-2">
        {isEditing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="text-xs font-medium text-on-surface w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-green-400/30"
          />
        ) : (
          <span className="text-xs font-medium text-on-surface cursor-text" onDoubleClick={startEdit}>{data.label}</span>
        )}

        {data.cardinality && (
          <span className="text-[10px] text-green-600 font-bold">{data.cardinality}</span>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); openEditDialog(id); }}
          className="node-edit-btn hover:bg-green-100 rounded-md p-0.5 transition-colors duration-150"
          title="编辑节点"
        >
          <span className="material-symbols-outlined text-sm text-slate-400 hover:text-green-600">more_horiz</span>
        </button>
      </div>

      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-green-500" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-green-500" />
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-green-400/60" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-green-400/60" />
    </div>
  );
}

export default memo(AttributeNode);
