import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';

/**
 * 数据节点 - 平行四边形
 * 用于表示数据输入/输出
 */
function DataNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);

  return (
    <div className="relative w-56 h-28">
      <div
        className={`absolute inset-0 bg-surface-container-lowest ghost-border-soft transition-all duration-200 ${
          selected ? 'ring-2 ring-primary/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
        }`}
        style={{
          transform: 'skewX(-15deg)',
          borderRadius: '0.5rem',
        }}
      >
        <div
          className="absolute -top-px left-4 right-4 h-1 bg-primary rounded-full"
          style={{ transform: 'skewX(15deg)' }}
        ></div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="material-symbols-outlined text-sm text-primary">database</span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">数据</span>
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
        </div>
      </div>

      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-primary" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-primary" />
    </div>
  );
}

export default memo(DataNode);
