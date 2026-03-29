import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;

/**
 * 连接器节点 - 小圆形
 * 用于连接不同区域的流程，标注跳转点
 */
function ConnectorNode({ data, selected }: NodeProps<FlowNode>) {
  return (
    <div
      className={`w-14 h-14 rounded-full bg-surface-container-lowest ghost-border-soft flex items-center justify-center relative transition-all duration-200 ${
        selected ? 'ring-2 ring-primary/35 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
      }`}
    >
      <div className="absolute -top-px left-2 right-2 h-1 bg-slate-400 rounded-full" />
      <span className="text-xs font-bold text-on-surface">{data.label}</span>

      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-slate-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-slate-500" />
    </div>
  );
}

export default memo(ConnectorNode);
