import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';
import { useNodeEdit } from '../../../hooks/useNodeEdit';
import { useCanvasContext } from '../CanvasContext';

type FlowNode = Node<GraphNode['data']>;

function SystemBoundaryNode({ id, data, selected, width, height }: NodeProps<FlowNode> & { width?: number; height?: number }) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);
  const { openEditDialog } = useCanvasContext();

  return (
    <div
      className={`bg-surface-container-low/30 rounded-xl transition-all duration-200 relative ${
        selected ? 'ring-2 ring-primary/35' : ''
      }`}
      style={{
        width: width || 400,
        height: height || 300,
        border: '2px dashed rgba(59, 130, 246, 0.5)',
      }}
    >
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-sm text-blue-500">rectangle</span>
        {isEditing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="text-sm font-bold text-on-surface bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-primary/30"
          />
        ) : (
          <h3 className="text-sm font-bold text-on-surface cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); openEditDialog(id); }}
        className="node-edit-btn hover:bg-slate-100 rounded-md p-0.5 transition-colors duration-150 absolute top-3 right-3"
        title="编辑节点"
      >
        <span className="material-symbols-outlined text-sm text-slate-400 hover:text-blue-500">more_horiz</span>
      </button>

      <p className="absolute bottom-3 left-3 text-[10px] text-on-surface-variant/50 italic">
        拖拽用例节点到此处
      </p>

      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-blue-500/50" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-blue-500/50" />
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-blue-500/50" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-blue-500/50" />
    </div>
  );
}

export default memo(SystemBoundaryNode);
