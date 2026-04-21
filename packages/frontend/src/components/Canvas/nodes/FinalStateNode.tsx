import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { GraphNode } from '../../../types/graph';

type FlowNode = Node<GraphNode['data']>;

function FinalStateNode({ selected }: NodeProps<FlowNode>) {
  return (
    <div className="relative w-6 h-6 flex items-center justify-center">
      <div
        className={`w-6 h-6 border-[2px] border-slate-800 rounded-full flex items-center justify-center relative transition-all duration-200 bg-surface-container-lowest ${
          selected ? 'ring-4 ring-primary/35 shadow-[0_10px_20px_rgba(25,28,30,0.1)]' : ''
        }`}
      >
        <div className="w-3.5 h-3.5 bg-slate-800 rounded-full"></div>
        
        <Handle type="target" position={Position.Top} id="top" className="w-2 h-2 !bg-slate-800 border-none" />
        <Handle type="target" position={Position.Left} id="left" className="w-2 h-2 !bg-slate-800 border-none" />
      </div>
    </div>
  );
}

export default memo(FinalStateNode);
