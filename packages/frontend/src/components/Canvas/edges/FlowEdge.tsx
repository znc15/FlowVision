import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import { useGraphStore } from '../../../store/graphStore';

/** 节点类型对应的主色 */
const NODE_TYPE_COLORS: Record<string, string> = {
  process: '#0050cb',
  decision: '#984800',
  start: '#006914',
  end: '#006914',
  data: '#0050cb',
  group: '#c2c6d8',
};

/**
 * 自定义流程边 —— smoothstep 路径 + 条件标签
 */
function FlowEdge({
  id,
  source,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  selected,
  animated,
}: EdgeProps) {
  const sourceNode = useGraphStore((s) => s.nodes.find((n) => n.id === source));
  const strokeColor = selected
    ? '#0050cb'
    : NODE_TYPE_COLORS[sourceNode?.type || 'process'] || '#c2c6d8';

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  const displayLabel = (data as Record<string, unknown>)?.condition ?? label;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? 2 : 1.5,
          transition: 'stroke 0.15s, stroke-width 0.15s',
        }}
        className={animated ? 'react-flow__edge-path--animated' : ''}
      />

      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="px-2 py-0.5 rounded-xl text-[10px] font-medium bg-surface-container-lowest ghost-border-soft text-on-surface-variant shadow-sm"
          >
            {displayLabel as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(FlowEdge);
