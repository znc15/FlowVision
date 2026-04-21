import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';
import { useCanvasContext } from '../CanvasContext';

function EntityNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);
  const { openEditDialog } = useCanvasContext();

  return (
    <div
      className={`w-56 bg-surface-container-lowest rounded-xl ghost-border-soft relative transition-all duration-200 ${
        selected ? 'ring-2 ring-primary/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
      }`}
    >
      <div className="bg-blue-50 rounded-t-xl px-4 py-2 flex items-center justify-between">
        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">«entity»</span>
        <button
          onClick={(e) => { e.stopPropagation(); openEditDialog(id); }}
          className="node-edit-btn hover:bg-blue-100 rounded-md p-0.5 transition-colors duration-150"
          title="编辑节点"
        >
          <span className="material-symbols-outlined text-sm text-slate-400 hover:text-blue-600">more_horiz</span>
        </button>
      </div>

      <div className="p-4">
        {isEditing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="text-sm font-bold text-on-surface w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-blue-400/30"
          />
        ) : (
          <h3 className="text-sm font-bold text-on-surface cursor-text mb-2" onDoubleClick={startEdit}>{data.label}</h3>
        )}

        {data.attributes && data.attributes.length > 0 && (
          <div className="space-y-1">
            {data.attributes.map((attr: string, idx: number) => {
              const isPk = attr.toLowerCase().includes('pk') || attr.toLowerCase().includes('primary');
              return (
                <div key={idx} className="flex items-center gap-1 text-[10px] font-mono text-on-surface-variant">
                  {isPk ? (
                    <span className="material-symbols-outlined text-[10px] text-blue-600">key</span>
                  ) : (
                    <span className="w-[10px]"></span>
                  )}
                  <span>{attr}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-blue-500" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-blue-500" />
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-blue-400/60" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-blue-400/60" />
    </div>
  );
}

export default memo(EntityNode);
