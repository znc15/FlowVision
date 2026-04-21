import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';
import { useNodeEdit } from '../../../hooks/useNodeEdit';
import { useCanvasContext } from '../CanvasContext';

type FlowNode = Node<GraphNode['data']>;

function ChoiceNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);
  const { openEditDialog } = useCanvasContext();

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <div
        className={`absolute inset-0 bg-surface-container-lowest ghost-border-soft transition-all duration-200 ${
          selected ? 'ring-2 ring-primary/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
        }`}
        style={{ transform: 'rotate(45deg)', borderRadius: '8px' }}
      >
        <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500 rounded-l-lg"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-2" style={{ transform: 'rotate(0deg)' }}>
        <button
          onClick={(e) => { e.stopPropagation(); openEditDialog(id); }}
          className="absolute top-1 right-1 node-edit-btn hover:bg-slate-100 rounded-md p-0.5 transition-colors duration-150 z-20"
          title="编辑节点"
        >
          <span className="material-symbols-outlined text-[12px] text-slate-400 hover:text-orange-500">more_horiz</span>
        </button>

        {isEditing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="text-[10px] font-bold text-on-surface w-[120%] bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-primary/30 text-center absolute"
            style={{ zIndex: 30 }}
          />
        ) : (
          <h3 className="text-xs font-bold text-on-surface cursor-text text-center break-words max-w-[80px]" onDoubleClick={startEdit}>
            {data.label}
          </h3>
        )}
      </div>

      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-orange-500" style={{ top: '-4px' }} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-orange-500" style={{ bottom: '-4px' }} />
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-orange-500/60" style={{ left: '-4px' }} />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-orange-500/60" style={{ right: '-4px' }} />
    </div>
  );
}

export default memo(ChoiceNode);
