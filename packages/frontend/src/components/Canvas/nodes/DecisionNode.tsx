import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';

/**
 * 判断节点 - 条件分支（菱形）
 * 用于表示条件判断和分支逻辑
 */
function DecisionNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);

  return (
    <div className="relative">
      <div
        className={`w-48 h-48 bg-surface-container-lowest ghost-border-soft transform rotate-45 transition-all duration-200 ${
          selected ? 'ring-2 ring-secondary/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
        }`}
        style={{ borderRadius: '1rem' }}
      >
        <div className="absolute inset-0 flex items-center justify-center transform -rotate-45 p-6">
          <div className="text-center">
            <div className="w-8 h-1 bg-secondary rounded-full mx-auto mb-3"></div>
            <span className="text-[10px] font-bold text-secondary uppercase tracking-tighter block mb-2">
              判断
            </span>
            {isEditing ? (
              <input
                autoFocus
                value={editLabel}
                onChange={(e) => handleLabelChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="text-sm font-bold text-on-surface mb-1 w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-secondary/30"
              />
            ) : (
              <h3 className="text-sm font-bold text-on-surface mb-1 cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
            )}
            {data.description && (
              <p className="text-[9px] text-on-surface-variant leading-tight">{data.description}</p>
            )}
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-secondary -top-2" />
      <Handle
        type="source"
        position={Position.Left}
        id="false"
        className="w-3 h-3 !bg-secondary -left-2"
        style={{ top: '50%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="w-3 h-3 !bg-secondary -right-2"
        style={{ top: '50%' }}
      />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-secondary -bottom-2" />
    </div>
  );
}

export default memo(DecisionNode);
