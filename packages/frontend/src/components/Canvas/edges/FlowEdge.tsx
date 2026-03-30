import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  getStraightPath,
  getBezierPath,
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
  type,
}: EdgeProps & { type?: string }) {
  const sourceNode = useGraphStore((s) => s.nodes.find((n) => n.id === source));
  const strokeColor = selected
    ? '#0050cb'
    : NODE_TYPE_COLORS[sourceNode?.type || 'process'] || '#c2c6d8';

  // 根据边类型选择不同的路径算法
  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (type === 'straight') {
    [edgePath, labelX, labelY] = getStraightPath({
      sourceX, sourceY, targetX, targetY,
    });
  } else if (type === 'default' || type === 'bezier') {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX, sourceY, targetX, targetY,
      sourcePosition, targetPosition,
    });
  } else if (type === 'step') {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX, sourceY, targetX, targetY,
      sourcePosition, targetPosition,
      borderRadius: 0,
    });
  } else {
    // smoothstep（默认）
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX, sourceY, targetX, targetY,
      sourcePosition, targetPosition,
      borderRadius: 12,
    });
  }

  // 虚线样式：step 和 straight 类型使用虚线
  const dashArray = (type === 'step' || type === 'straight') ? '6 3' : undefined;

  const displayLabel = (data as Record<string, unknown>)?.condition ?? label;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? 2 : 1.5,
          strokeDasharray: dashArray,
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
