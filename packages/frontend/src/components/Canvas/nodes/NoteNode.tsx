import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';

/** 备注节点 - 便签样式带折角，用于添加备注说明 */
function NoteNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);

  return (
    <div className="relative w-52">
      {/* 便签主体 + 折角 */}
      <div
        className={`bg-amber-50 rounded-sm p-4 pr-8 transition-all duration-200 ${
          selected ? 'ring-2 ring-amber-300/50 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : 'shadow-sm'
        }`}
        style={{
          clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)',
        }}
      >
        {/* 折角 */}
        <div
          className="absolute top-0 right-0 w-5 h-5 bg-amber-100"
          style={{
            clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
          }}
        />

        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="material-symbols-outlined text-sm text-amber-600">sticky_note_2</span>
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">备注</span>
        </div>

        {isEditing ? (
          <input autoFocus value={editLabel} onChange={(e) => handleLabelChange(e.target.value)}
            onKeyDown={handleKeyDown} onBlur={handleBlur}
            className="text-sm font-medium text-on-surface w-full bg-amber-100 rounded px-1 py-0.5 outline-none ring-2 ring-amber-300" />
        ) : (
          <h3 className="text-sm font-medium text-on-surface cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
        )}
        {data.description && (
          <p className="text-[10px] text-on-surface-variant mt-1 leading-snug">{data.description}</p>
        )}
      </div>

      <Handle type="target" position={Position.Top} id="top" className="w-2.5 h-2.5 !bg-amber-400" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-2.5 h-2.5 !bg-amber-400" />
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-amber-400/60" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-amber-400/60" />
    </div>
  );
}

export default memo(NoteNode);
