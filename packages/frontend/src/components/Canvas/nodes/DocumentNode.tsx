import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';
import { useCanvasContext } from '../CanvasContext';

/**
 * 文档节点 - 底部波浪形矩形
 * 表示文档或报告输出
 */
function DocumentNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);
  const { openEditDialog } = useCanvasContext();

  return (
    <div className="relative w-56">
      <div
        className={`bg-surface-container-lowest ghost-border-soft rounded-t-xl p-5 pb-8 relative transition-all duration-200 ${
          selected ? 'ring-2 ring-primary/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
        }`}
      >
        <div className="node-accent-primary" style={{ background: '#7c4dff' }}></div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm" style={{ color: '#7c4dff' }}>article</span>
            <span className="text-[10px] font-bold uppercase tracking-tighter" style={{ color: '#7c4dff' }}>文档</span>
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
            className="text-sm font-bold text-on-surface mb-1 w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-purple-300"
          />
        ) : (
          <h3 className="text-sm font-bold text-on-surface mb-1 cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
        )}
        {data.description && (
          <p className="text-[10px] text-on-surface-variant leading-snug">{data.description}</p>
        )}
      </div>

      {/* 底部波浪 SVG */}
      <svg className="absolute bottom-0 left-0 w-full h-4" viewBox="0 0 224 16" preserveAspectRatio="none">
        <path
          d="M0,0 Q56,16 112,8 Q168,0 224,8 L224,16 L0,16 Z"
          fill="var(--md-sys-color-surface-container-lowest, #fff)"
          stroke="var(--md-sys-color-outline-variant, #c4c7c5)"
          strokeWidth="1"
        />
      </svg>

      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-purple-500" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-purple-500" style={{ bottom: -4 }} />
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-purple-500/60" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-purple-500/60" />
    </div>
  );
}

export default memo(DocumentNode);
