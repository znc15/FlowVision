import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';

/** 数据库节点 - 圆柱体形状，用于表示数据库存储 */
function DatabaseNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);

  return (
    <div
      className={`relative w-52 transition-all duration-200 ${
        selected ? 'drop-shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
      }`}
    >
      {/* 顶部椭圆 */}
      <div className="h-5 bg-blue-100 rounded-t-[50%] border-2 border-b-0 border-blue-300" />
      {/* 中间矩形 */}
      <div className={`bg-blue-50 border-2 border-x-blue-300 py-4 px-4 text-center ${
        selected ? 'border-x-blue-400 ring-2 ring-blue-300/30' : ''
      }`}>
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <span className="material-symbols-outlined text-sm text-blue-600">storage</span>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">数据库</span>
        </div>
        {isEditing ? (
          <input autoFocus value={editLabel} onChange={(e) => handleLabelChange(e.target.value)}
            onKeyDown={handleKeyDown} onBlur={handleBlur}
            className="text-sm font-bold text-on-surface w-full bg-white rounded px-1 py-0.5 outline-none ring-2 ring-blue-400/30 text-center" />
        ) : (
          <h3 className="text-sm font-bold text-on-surface cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
        )}
        {data.description && (
          <p className="text-[10px] text-on-surface-variant mt-1">{data.description}</p>
        )}
      </div>
      {/* 底部椭圆 */}
      <div className="h-5 bg-blue-100 rounded-b-[50%] border-2 border-t-0 border-blue-300" />

      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-blue-500" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-blue-500" />
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-blue-500/60" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-blue-500/60" />
    </div>
  );
}

export default memo(DatabaseNode);
