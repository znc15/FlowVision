import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';

/**
 * 注释节点 - 左侧带竖线的开放矩形
 * 用于添加注释说明
 */
function AnnotationNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);

  return (
    <div
      className={`w-56 bg-amber-50/50 border-l-[3px] border-amber-400 rounded-r-lg p-4 relative transition-all duration-200 ${
        selected ? 'ring-2 ring-amber-300/40 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className="material-symbols-outlined text-sm text-amber-500">sticky_note_2</span>
        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter">注释</span>
      </div>

      {isEditing ? (
        <input
          autoFocus
          value={editLabel}
          onChange={(e) => handleLabelChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="text-sm font-medium text-on-surface mb-1 w-full bg-amber-100 rounded px-1 py-0.5 outline-none ring-2 ring-amber-300"
        />
      ) : (
        <h3 className="text-sm font-medium text-on-surface mb-1 cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
      )}
      {data.description && (
        <p className="text-[10px] text-on-surface-variant leading-snug mt-1">{data.description}</p>
      )}

      {/* 注释节点只有目标句柄（被连接到），不做流程出口 */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-amber-400" />
    </div>
  );
}

export default memo(AnnotationNode);
