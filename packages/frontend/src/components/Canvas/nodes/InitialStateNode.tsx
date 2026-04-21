import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;

function InitialStateNode({ selected }: NodeProps<FlowNode>) {
  return (
    <div className="relative w-6 h-6 flex items-center justify-center">
      <div
        className={`w-6 h-6 bg-slate-800 rounded-full relative transition-all duration-200 ${
          selected ? 'ring-4 ring-primary/35 shadow-[0_10px_20px_rgba(25,28,30,0.1)]' : ''
        }`}
      >
        <Handle type="source" position={Position.Bottom} id="bottom" className="w-2 h-2 !bg-slate-800 border-none" />
        <Handle type="source" position={Position.Right} id="right" className="w-2 h-2 !bg-slate-800 border-none" />
      </div>
    </div>
  );
}

export default memo(InitialStateNode);
