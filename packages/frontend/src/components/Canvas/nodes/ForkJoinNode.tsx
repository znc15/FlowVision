import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;

/** 分叉/汇合节点 - 粗横条，用于 UML 活动图中的并行控制 */
function ForkJoinNode({ data, selected }: NodeProps<FlowNode>) {
  const label = data.label || '分叉/汇合';

  return (
    <div className="relative flex flex-col items-center">
      <div
        className={`w-40 h-4 bg-slate-700 rounded-sm transition-all duration-200 ${
          selected ? 'ring-2 ring-slate-400/40 shadow-[0_20px_40px_rgba(25,28,30,0.08)]' : ''
        }`}
      />
      <p className="text-[9px] text-slate-500 mt-1 font-medium">{label}</p>

      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-slate-600" style={{ left: '25%' }} />
      <Handle type="target" position={Position.Top} id="top2" className="w-3 h-3 !bg-slate-600" style={{ left: '75%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-slate-600" style={{ left: '25%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom2" className="w-3 h-3 !bg-slate-600" style={{ left: '75%' }} />
      <Handle type="target" position={Position.Left} id="left" className="w-2.5 h-2.5 !bg-slate-500/60" />
      <Handle type="source" position={Position.Right} id="right" className="w-2.5 h-2.5 !bg-slate-500/60" />
    </div>
  );
}

export default memo(ForkJoinNode);
