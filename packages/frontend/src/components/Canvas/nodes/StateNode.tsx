import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';
import { useNodeEdit } from '../../../hooks/useNodeEdit';
import { useCanvasContext } from '../CanvasContext';

type FlowNode = Node<GraphNode['data']>;

function StateNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);
  const { openEditDialog } = useCanvasContext();

  return (
    <div
      className={`w-48 bg-surface-container-lowest rounded-2xl ghost-border-soft overflow-hidden relative transition-all duration-200 ${
        selected ? 'ring-2 ring-primary/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
      }`}
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>

      <div className="p-4 text-center relative">
        <div className="flex items-center justify-between mb-2 absolute top-2 right-2 left-3">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter"></span>
          <button
            onClick={(e) => { e.stopPropagation(); openEditDialog(id); }}
            className="node-edit-btn hover:bg-slate-100 rounded-md p-0.5 transition-colors duration-150 ml-auto"
            title="编辑节点"
          >
            <span className="material-symbols-outlined text-sm text-slate-400 hover:text-blue-500">more_horiz</span>
          </button>
        </div>
        <div className="mt-4">
          {isEditing ? (
            <input
              autoFocus
              value={editLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="text-sm font-bold text-on-surface w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-primary/30 text-center"
            />
          ) : (
            <h3 className="text-sm font-bold text-on-surface cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
          )}
        </div>
      </div>

      {(data.attributes && data.attributes.length > 0) && (
        <div className="px-3 py-2 border-t border-outline-variant min-h-[30px] bg-surface-container-lowest">
          <div className="flex flex-col gap-0.5 ml-1">
            {data.attributes.map((attr, idx) => (
              <span key={idx} className="text-[10px] font-mono text-on-surface-variant break-all">
                {attr}
              </span>
            ))}
          </div>
        </div>
      )}

      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-blue-500" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-blue-500" />
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-blue-500/60" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-blue-500/60" />
    </div>
  );
}

export default memo(StateNode);
