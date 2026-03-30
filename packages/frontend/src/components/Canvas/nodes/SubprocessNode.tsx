import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';
import { useCanvasContext } from '../CanvasContext';

/**
 * 子流程节点 - 双边框矩形
 * 表示可展开的子流程
 */
function SubprocessNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);
  const { openEditDialog } = useCanvasContext();

  return (
    <div
      className={`w-56 bg-surface-container-lowest rounded-xl ghost-border-soft p-5 relative transition-all duration-200 ${
        selected ? 'ring-2 ring-primary/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
      }`}
    >
      <div className="node-accent-primary"></div>

      {/* 双边框效果 */}
      <div className="absolute top-2 left-2 right-2 bottom-2 border border-slate-200 rounded-lg pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-primary">account_tree</span>
          <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">子流程</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); openEditDialog(id); }}
          className="hover:bg-slate-100 rounded-md p-0.5 transition-colors duration-150"
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
          className="text-sm font-bold text-on-surface mb-1 w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-primary/30"
        />
      ) : (
        <h3 className="text-sm font-bold text-on-surface mb-1 cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
      )}
      {data.description && (
        <p className="text-[10px] text-on-surface-variant leading-snug">{data.description}</p>
      )}

      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-primary" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-primary" />
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-primary/60" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-primary/60" />
    </div>
  );
}

export default memo(SubprocessNode);
