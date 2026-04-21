import { memo } from 'react';
import { Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';

/** 泳道节点 - 垂直容器，用于 UML 活动图的分区 */
function SwimlaneNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);

  return (
    <div
      className={`min-w-[250px] min-h-[300px] bg-blue-50/30 rounded-xl transition-all duration-200 ${
        selected ? 'ring-2 ring-blue-300/40 shadow-[0_20px_40px_rgba(25,28,30,0.06)]' : ''
      }`}
      style={{ border: '1.5px solid rgba(96, 165, 250, 0.35)' }}
    >
      <div className="px-4 py-2.5 border-b border-blue-200/60 bg-blue-100/40 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-blue-500">view_column</span>
          {isEditing ? (
            <input autoFocus value={editLabel} onChange={(e) => handleLabelChange(e.target.value)}
              onKeyDown={handleKeyDown} onBlur={handleBlur}
              className="text-sm font-bold text-on-surface w-full bg-white rounded px-1 py-0.5 outline-none ring-2 ring-blue-300/30" />
          ) : (
            <h3 className="text-sm font-bold text-blue-700 cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
          )}
        </div>
      </div>
      <div className="p-3">
        <p className="text-[10px] text-blue-400/60 italic text-center">泳道区域</p>
      </div>
    </div>
  );
}

export default memo(SwimlaneNode);
