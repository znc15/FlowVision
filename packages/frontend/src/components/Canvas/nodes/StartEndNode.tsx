import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;
import { useNodeEdit } from '../../../hooks/useNodeEdit';

/**
 * 开始/结束节点 - 椭圆形
 * 用于标记流程的起点和终点
 */
function StartEndNode({ id, data, selected }: NodeProps<FlowNode>) {
  const isStart = data.label.toLowerCase().includes('start') || data.label.toLowerCase().includes('开始');
  const { isEditing, editLabel, startEdit, handleLabelChange, handleKeyDown, handleBlur } = useNodeEdit(id, data.label);

  return (
    <div
      className={`w-40 h-20 bg-surface-container-lowest ghost-border-soft rounded-full flex items-center justify-center transition-all duration-200 ${
        selected ? 'ring-2 ring-tertiary/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
      }`}
    >
      <div className="text-center px-4">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-tighter block mb-1">
          {isStart ? '入口' : '终点'}
        </span>
        {isEditing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="text-sm font-bold text-on-surface w-full bg-surface-container-high rounded px-1 py-0.5 outline-none ring-2 ring-tertiary/30"
          />
        ) : (
          <h3 className="text-sm font-bold text-on-surface cursor-text" onDoubleClick={startEdit}>{data.label}</h3>
        )}
      </div>

      {!isStart && <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-tertiary" />}
      {isStart && <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-tertiary" />}
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-tertiary/60" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-tertiary/60" />
    </div>
  );
}

export default memo(StartEndNode);
