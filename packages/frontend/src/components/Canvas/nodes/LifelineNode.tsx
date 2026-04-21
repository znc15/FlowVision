import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';
import { useCanvasContext } from '../CanvasContext';

function LifelineNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);
  const { openEditDialog } = useCanvasContext();

  return (
    <div className={`relative transition-all duration-200 ${selected ? 'ring-2 ring-primary/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''}`}>
      <div className="bg-surface-container-lowest rounded-xl ghost-border-soft px-4 py-2 relative min-w-32">
        <div className="node-accent-primary"></div>

        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-bold text-primary uppercase tracking-tighter">Lifeline</span>
          <button
            onClick={(e) => { e.stopPropagation(); openEditDialog(id); }}
            className="node-edit-btn hover:bg-slate-100 rounded-md p-0.5 transition-colors duration-150"
            title="编辑节点"
          >
            <span className="material-symbols-outlined text-sm text-slate-400 hover:text-primary">more_horiz</span>
          </button>
        </div>

        {isEditing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="text-xs font-semibold text-on-surface w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-primary/30"
          />
        ) : (
          <h3 className="text-xs font-semibold text-on-surface cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
        )}
      </div>

      <div className="border-l-2 border-dashed border-outline-variant ml-1/2 h-24" style={{ marginLeft: '50%' }}></div>

      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-primary/60" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-primary/60" />
    </div>
  );
}

export default memo(LifelineNode);
