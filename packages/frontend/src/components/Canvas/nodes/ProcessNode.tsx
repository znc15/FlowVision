import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';
import { useCanvasContext } from '../CanvasContext';

/**
 * 流程节点 - 普通流程步骤（圆角矩形）
 * 用于表示标准的处理步骤
 */
function ProcessNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);
  const { openEditDialog } = useCanvasContext();

  return (
    <div
      className={`w-56 bg-surface-container-lowest rounded-xl ghost-border-soft p-5 relative transition-all duration-200 ${
        selected ? 'ring-2 ring-primary/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
      }`}
    >
      <div className="node-accent-primary"></div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">流程</span>
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

      {data.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {data.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.5 bg-surface-container-high text-[9px] text-on-surface-variant rounded-lg ghost-border-soft"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-primary" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-primary" />
    </div>
  );
}

export default memo(ProcessNode);
