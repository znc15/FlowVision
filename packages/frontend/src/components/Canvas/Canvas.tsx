import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  Node,
  NodeTypes,
  EdgeTypes,
  useNodesState,
  useEdgesState,
  Connection,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useReactFlow } from '@xyflow/react';
import { useGraphStore } from '../../store/graphStore';
import { usePreviewStore } from '../../store/previewStore';
import { useHistoryStore } from '../../store/historyStore';
import { NodeType, GraphNode } from '../../types/graph';
import { forceRelayout } from '../../utils/layout';

const NODE_TEMPLATES: { type: NodeType; label: string; icon: string }[] = [
  { type: 'process', label: '流程', icon: 'crop_square' },
  { type: 'decision', label: '判断', icon: 'diamond' },
  { type: 'data', label: '数据', icon: 'database' },
  { type: 'start', label: '开始', icon: 'play_circle' },
  { type: 'end', label: '结束', icon: 'stop_circle' },
  { type: 'subprocess', label: '子流程', icon: 'account_tree' },
  { type: 'delay', label: '延迟', icon: 'hourglass_top' },
  { type: 'document', label: '文档', icon: 'article' },
  { type: 'manual_input', label: '手动输入', icon: 'touch_app' },
  { type: 'annotation', label: '注释', icon: 'sticky_note_2' },
  { type: 'connector', label: '连接器', icon: 'radio_button_checked' },
];
let _nodeSeq = 0;

/** 视图操作按钮（需在 ReactFlow 上下文内） */
function ViewControls({ isFocusMode, onToggleFocusMode }: { isFocusMode: boolean; onToggleFocusMode?: () => void }) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const { nodes, edges } = useGraphStore();
  const { pushHistory } = useHistoryStore();

  const handleAutoLayout = useCallback(() => {
    const graph = forceRelayout({ nodes, edges });
    useGraphStore.getState().replaceGraph(graph);
    pushHistory(graph);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [nodes, edges, pushHistory, fitView]);

  return (
    <>
      <div className="w-px h-5 bg-outline-variant/20 shrink-0 mx-1" />
      <button type="button" onClick={() => zoomIn()} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="放大"><span className="material-symbols-outlined text-base">zoom_in</span></button>
      <button type="button" onClick={() => zoomOut()} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="缩小"><span className="material-symbols-outlined text-base">zoom_out</span></button>
      <button type="button" onClick={() => fitView({ padding: 0.2 })} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="适应画布"><span className="material-symbols-outlined text-base">fit_screen</span></button>
      <button type="button" onClick={handleAutoLayout} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="自动布局"><span className="material-symbols-outlined text-base">account_tree</span></button>
      {onToggleFocusMode && (
        <button type="button" onClick={onToggleFocusMode} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title={isFocusMode ? '退出画布全屏 (Esc)' : '画布全屏显示 (F11)'}><span className="material-symbols-outlined text-base">{isFocusMode ? 'fullscreen_exit' : 'fullscreen'}</span></button>
      )}
    </>
  );
}

import ProcessNode from './nodes/ProcessNode';
import DecisionNode from './nodes/DecisionNode';
import StartEndNode from './nodes/StartEndNode';
import DataNode from './nodes/DataNode';
import GroupNode from './nodes/GroupNode';
import SubprocessNode from './nodes/SubprocessNode';
import DelayNode from './nodes/DelayNode';
import DocumentNode from './nodes/DocumentNode';
import ManualInputNode from './nodes/ManualInputNode';
import AnnotationNode from './nodes/AnnotationNode';
import ConnectorNode from './nodes/ConnectorNode';
import FlowEdge from './edges/FlowEdge';
import Toolbar from '../Toolbar/Toolbar';
import NodeEditDialog from './NodeEditDialog';
import VersionHistoryDialog from '../VersionHistoryDialog';
import { CanvasContext } from './CanvasContext';

// 注册自定义节点类型
const nodeTypes = {
  process: ProcessNode,
  decision: DecisionNode,
  start: StartEndNode,
  end: StartEndNode,
  data: DataNode,
  group: GroupNode,
  subprocess: SubprocessNode,
  delay: DelayNode,
  document: DocumentNode,
  manual_input: ManualInputNode,
  annotation: AnnotationNode,
  connector: ConnectorNode,
} as NodeTypes;

// 注册自定义边类型
const edgeTypes: EdgeTypes = {
  default: FlowEdge,
  smoothstep: FlowEdge,
  step: FlowEdge,
  straight: FlowEdge,
};

interface CanvasProps {
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  onNodeSelect?: (filePath: string, lineStart?: number) => void;
}

function Canvas({ isFocusMode = false, onToggleFocusMode, onNodeSelect }: CanvasProps) {
  const { nodes: graphNodes, edges: graphEdges, addEdge: addGraphEdge, updateNode, addNode } = useGraphStore();
  const { previewNodes, previewEdges, isPreviewMode, clear: clearPreview } = usePreviewStore();
  const { undo, redo, canUndo, canRedo, pushHistory } = useHistoryStore();

  const handleAddNode = useCallback(
    (type: NodeType) => {
      const id = `node-${Date.now()}-${++_nodeSeq}`;
      const newNode: GraphNode = {
        id,
        type,
        position: { x: 100 + _nodeSeq * 30, y: 100 + _nodeSeq * 30 },
        data: { label: `新${NODE_TEMPLATES.find((t) => t.type === type)?.label ?? '节点'}` },
      };
      addNode(newNode);
      pushHistory({ nodes: [...graphNodes, newNode], edges: graphEdges });
    },
    [addNode, graphNodes, graphEdges, pushHistory],
  );
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // 合并正式节点和预览节点，确保所有节点都有有效 position
  const ensurePosition = (node: any) => ({
    ...node,
    position: node.position && typeof node.position.x === 'number'
      ? node.position
      : { x: 0, y: 0 },
  });

  const allNodes = useMemo(() => {
    const preview = previewNodes.map((node) => ({
      ...ensurePosition(node),
      className: 'opacity-50 border-dashed',
    }));
    return [...graphNodes.map(ensurePosition), ...preview];
  }, [graphNodes, previewNodes]);

  const allEdges = useMemo(() => {
    const preview = previewEdges.map((edge) => ({
      ...edge,
      className: 'opacity-50',
      animated: true,
    }));
    return [...graphEdges, ...preview];
  }, [graphEdges, previewEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(allNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(allEdges);

  // 同步外部状态到 React Flow 内部状态
  const prevNodesRef = useRef(allNodes);
  const prevEdgesRef = useRef(allEdges);
  useEffect(() => {
    if (prevNodesRef.current !== allNodes) {
      prevNodesRef.current = allNodes;
      setNodes(allNodes);
    }
    if (prevEdgesRef.current !== allEdges) {
      prevEdgesRef.current = allEdges;
      setEdges(allEdges);
    }
  }, [allNodes, allEdges, setNodes, setEdges]);

  // 节点点击 —— 关联分析视图：跳转到对应源文件
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!onNodeSelect) return;
      const fp = (node.data as any)?.filePath;
      if (fp) {
        const lineStart = (node.data as any)?.lineStart;
        onNodeSelect(fp, typeof lineStart === 'number' ? lineStart : undefined);
      }
    },
    [onNodeSelect],
  );

  // 节点拖拽结束 —— 检测分组归属
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      if (draggedNode.type === 'group') return;

      // 查找拖拽位置覆盖的分组节点
      const groupNodes = graphNodes.filter((n) => n.type === 'group' && n.id !== draggedNode.id);
      let targetGroup: string | undefined;

      for (const group of groupNodes) {
        const gw = group.width || 300;
        const gh = group.height || 200;
        if (
          draggedNode.position.x >= group.position.x &&
          draggedNode.position.x <= group.position.x + gw &&
          draggedNode.position.y >= group.position.y &&
          draggedNode.position.y <= group.position.y + gh
        ) {
          targetGroup = group.id;
          break;
        }
      }

      const currentParent = graphNodes.find((n) => n.id === draggedNode.id)?.parentId;
      if (targetGroup !== currentParent) {
        updateNode(draggedNode.id, { parentId: targetGroup } as any);
      }
    },
    [graphNodes, updateNode],
  );

  // 连接节点
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge = {
        id: `e-${connection.source}-${connection.target}`,
        source: connection.source!,
        target: connection.target!,
        type: 'smoothstep' as const,
      };
      addGraphEdge(newEdge);
      pushHistory({ nodes: graphNodes, edges: [...graphEdges, newEdge] });
    },
    [addGraphEdge, graphNodes, graphEdges, pushHistory]
  );

  // 应用预览
  const handleApplyPreview = useCallback(() => {
    useGraphStore.getState().applyDiff({
      add: { nodes: previewNodes, edges: previewEdges },
      update: { nodes: [], edges: [] },
      remove: { nodeIds: [], edgeIds: [] },
    });
    pushHistory({ nodes: [...graphNodes, ...previewNodes], edges: [...graphEdges, ...previewEdges] });
    clearPreview();
  }, [previewNodes, previewEdges, graphNodes, graphEdges, pushHistory, clearPreview]);

  // 取消预览
  const handleCancelPreview = useCallback(() => {
    clearPreview();
  }, [clearPreview]);

  return (
    <ReactFlowProvider>
    <CanvasContext.Provider value={{ openEditDialog: setEditingNodeId }}>
    <div className="relative w-full flex-1 min-h-0">
      {/* 节点编辑对话框 */}
      <NodeEditDialog nodeId={editingNodeId} onClose={() => setEditingNodeId(null)} />

      {/* 顶部工具栏 */}
      <div className="absolute top-0 left-0 right-0 workbench-panel-header z-10 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 w-full min-w-max">
          {NODE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.type}
              type="button"
              onClick={() => handleAddNode(tpl.type)}
              className="icon-button-soft h-8 w-8 rounded-xl shrink-0"
              title={`添加${tpl.label}节点`}
            >
              <span className="material-symbols-outlined text-base">{tpl.icon}</span>
            </button>
          ))}
          <ViewControls isFocusMode={isFocusMode} onToggleFocusMode={onToggleFocusMode} />
          <div className="flex-1 min-w-4" />
          {/* 图例 */}
          <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant whitespace-nowrap shrink-0">
            <span className="w-2 h-2 rounded-full bg-primary"></span> 入口
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant whitespace-nowrap shrink-0 ml-2">
            <span className="w-2 h-2 rounded-full bg-secondary"></span> 逻辑分支
          </div>

          {/* 撤销/重做 */}
          <div className="flex items-center gap-1 ml-4 shrink-0">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="icon-button-soft h-8 w-8 disabled:opacity-30 disabled:cursor-not-allowed"
              title="撤销 (Ctrl+Z)"
            >
              <span className="material-symbols-outlined text-base">undo</span>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="icon-button-soft h-8 w-8 disabled:opacity-30 disabled:cursor-not-allowed"
              title="重做 (Ctrl+Y)"
            >
              <span className="material-symbols-outlined text-base">redo</span>
            </button>
          </div>
        </div>
      </div>

      {/* React Flow 画布 */}
      <div className="absolute inset-0 pt-12">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          className="bg-surface"
        >
          {/* 网格背景 - 双层点阵 */}
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#8b96a8" />
          <Background id="bg-large" variant={BackgroundVariant.Dots} gap={100} size={2.1} color="#6f7c90" />

          {/* 缩略地图 */}
          <MiniMap
            nodeStrokeWidth={2}
            pannable
            zoomable
            className="!bottom-12 !left-6 !rounded-2xl !border !border-outline-variant/12 !shadow-[0_4px_20px_rgba(0,0,0,0.08)] !overflow-hidden"
            style={{
              width: 160,
              height: 100,
              background: 'rgba(244, 246, 248, 0.95)',
              backdropFilter: 'blur(12px)',
            }}
            maskColor="rgba(0, 80, 203, 0.05)"
            nodeColor={(node) => {
              if (node.type === 'start') return '#0050CB';
              if (node.type === 'end') return '#BA1B1B';
              if (node.type === 'decision') return '#6750A4';
              if (node.type === 'data') return '#006B5F';
              return '#667086';
            }}
          />

          {/* 控制按钮 */}
          <Controls className="!bottom-12 !left-auto !right-6 !bg-surface-container-lowest/88 !backdrop-blur-md ghost-border-soft !rounded-xl !shadow-none" />

          {/* 工具栏 —— 必须在 ReactFlow 内部以使用 useReactFlow */}
          <Panel position="top-center" className="mt-2 w-[min(1080px,calc(100%-2rem))]">
            <Toolbar
              onShowHistory={() => setHistoryOpen(true)}
            />
          </Panel>
        </ReactFlow>
      </div>

      {/* 版本历史对话框 */}
      <VersionHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />

      {/* 预览确认按钮 */}
      {isPreviewMode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3 animate-[slideUp_200ms_ease-out]">
          <button
            onClick={handleCancelPreview}
            className="px-6 py-3 bg-surface-container-highest text-on-surface rounded-xl font-medium text-sm transition-all duration-200 hover:bg-surface-container-high active:scale-95"
          >
            取消预览
          </button>
          <button
            onClick={handleApplyPreview}
            className="gradient-button px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 active:scale-95 shadow-lg"
          >
            应用到画布
          </button>
        </div>
      )}

      {/* 状态栏 */}
      <div className="absolute bottom-0 left-0 right-0 h-7 bg-surface-container-lowest/95 backdrop-blur-sm border-t border-outline-variant/30 flex items-center px-6 justify-between text-[10px] font-medium text-on-surface-variant/80 z-10">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 运行中
          </span>
          <span>节点 {graphNodes.length}</span>
          <span>连线 {graphEdges.length}</span>
        </div>
        <span>{graphNodes.length > 0 ? '活跃' : '空闲'}</span>
      </div>
    </div>
    </CanvasContext.Provider>
    </ReactFlowProvider>
  );
}

export default Canvas;
