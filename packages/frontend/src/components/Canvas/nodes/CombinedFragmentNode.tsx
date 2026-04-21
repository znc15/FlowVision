import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';
import { useCanvasContext } from '../CanvasContext';

const FRAGMENT_LABELS: Record<string, string> = {
  loop: 'loop',
  alt: 'alt',
  opt: 'opt',
  par: 'par',
  seq: 'seq',
  strict: 'strict',
  neg: 'neg',
  ignore: 'ignore',
  consider: 'consider',
  assert: 'assert',
  ref: 'ref',
};

function CombinedFragmentNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);
  const { openEditDialog } = useCanvasContext();

  const fragmentType = data.stereotype || 'alt';
  const fragmentLabel = FRAGMENT_LABELS[fragmentType] || fragmentType;

  return (
    <div
      className={`w-48 min-h-24 bg-surface-container-lowest rounded-xl border-2 border-dashed border-amber-400/50 relative transition-all duration-200 ${
        selected ? 'ring-2 ring-amber-400/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
      }`}
    >
      <div className="absolute -top-0 left-0 bg-amber-100 border border-amber-300 rounded-br-lg px-2 py-0.5">
        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">{fragmentLabel}</span>
      </div>

      <div className="flex items-center justify-end pt-1 pr-2">
        <button
          onClick={(e) => { e.stopPropagation(); openEditDialog(id); }}
          className="node-edit-btn hover:bg-slate-100 rounded-md p-0.5 transition-colors duration-150"
          title="编辑节点"
        >
          <span className="material-symbols-outlined text-sm text-slate-400 hover:text-amber-600">more_horiz</span>
        </button>
      </div>

      <div className="p-3 pt-4">
        {isEditing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="text-xs font-medium text-on-surface w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-amber-400/30"
          />
        ) : (
          <p className="text-xs text-on-surface-variant cursor-text" onDoubleClick={startEdit}>{data.label}</p>
        )}

        {data.description && (
          <p className="text-[10px] text-on-surface-variant/70 mt-1 leading-snug">{data.description}</p>
        )}
      </div>

      <Handle type="target" position={Position.Top} id="top" className="w-2.5 h-2.5 !bg-amber-400/60" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-2.5 h-2.5 !bg-amber-400/60" />
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-amber-400/60" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-amber-400/60" />
    </div>
  );
}

export default memo(CombinedFragmentNode);
