import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
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
import { useTabStore } from '../../store/tabStore';
import { NodeType, GraphNode } from '../../types/graph';
import { forceRelayout } from '../../utils/layout';
import { exportJSON, exportPNG, exportMarkdown, importJSON, exportSystemPrompt, exportDrawIO, exportVisio } from '../../utils/export';
import { shareGraph } from '../../utils/share';
import { createPortal } from 'react-dom';

let _nodeSeq = 0;

/** 视图操作和文件操作按钮（需在 ReactFlow 上下文内） */
function ViewControls({
  isFocusMode,
  onToggleFocusMode,
  onShowHistory,
}: {
  isFocusMode: boolean;
  onToggleFocusMode?: () => void;
  onShowHistory?: () => void;
}) {
  const { fitView, zoomIn, zoomOut, getNodes, setViewport, toObject } = useReactFlow();
  const { nodes, edges } = useGraphStore();
  const { pushHistory } = useHistoryStore();
  const { saveTabGraph, activeTabId } = useTabStore();
  const [saved, setSaved] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAutoLayout = useCallback(() => {
    const graph = forceRelayout({ nodes, edges });
    useGraphStore.getState().replaceGraph(graph);
    pushHistory(graph);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [nodes, edges, pushHistory, fitView]);

  /** 保存当前画布到标签页 */
  const handleSave = useCallback(() => {
    saveTabGraph(activeTabId, { nodes, edges });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [nodes, edges, saveTabGraph, activeTabId]);

  /** 清空画布 */
  const handleClear = useCallback(() => {
    pushHistory({ nodes, edges });
    useGraphStore.getState().clear();
  }, [nodes, edges, pushHistory]);

  /** 分享 */
  const handleShare = useCallback(async () => {
    const url = await shareGraph({ nodes, edges });
    setShareUrl(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [nodes, edges]);

  /** 导入 JSON 文件 */
  const handleImport = useCallback(async () => {
    const data = await importJSON();
    if (data) {
      pushHistory({ nodes, edges });
      useGraphStore.getState().replaceGraph(data);
    }
  }, [nodes, edges, pushHistory]);

  /** 复制链接 */
  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* 忽略 */ }
  }, [shareUrl]);

  const handleExportPng = useCallback(async () => {
    const exportNodes = getNodes();
    if (exportNodes.length === 0) {
      await exportPNG(exportNodes);
      return;
    }

    const shouldUseDesktopCapture = Boolean(window.electron?.desktop?.capturePage);
    const previousViewport = shouldUseDesktopCapture ? toObject().viewport : null;

    try {
      if (shouldUseDesktopCapture) {
        await fitView({ padding: 0.16, duration: 0 });
      }
      await exportPNG(exportNodes);
    } catch (error) {
      console.error('导出 PNG 失败', error);
    } finally {
      if (previousViewport) {
        await setViewport(previousViewport, { duration: 0 }).catch(() => undefined);
      }
    }
  }, [fitView, getNodes, setViewport, toObject]);

  const shareDialog = shareUrl ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShareUrl(null)}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden animate-[scaleIn_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 bg-gradient-to-r from-primary via-secondary to-tertiary" />
        <div className="px-6 pt-5 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>share</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">分享流程图</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">链接已复制到剪贴板</p>
              </div>
            </div>
            <button
              onClick={() => setShareUrl(null)}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-slate-400 text-base">close</span>
            </button>
          </div>
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
            <span className="material-symbols-outlined text-sm text-slate-400">link</span>
            <p className="flex-1 text-[11px] text-slate-600 font-mono truncate">{shareUrl.slice(0, 60)}...</p>
            <button
              onClick={handleCopyLink}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <div className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
            <span className="material-symbols-outlined text-xs text-amber-500 mt-0.5">info</span>
            <p className="text-[10px] text-amber-700 leading-relaxed">
              分享链接包含完整的流程图数据。{nodes.length} 个节点、{edges.length} 条连线将嵌入在链接中。
            </p>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* 第一行：视图控制 */}
      <button type="button" onClick={() => zoomIn()} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="放大"><span className="material-symbols-outlined text-base">zoom_in</span></button>
      <button type="button" onClick={() => zoomOut()} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="缩小"><span className="material-symbols-outlined text-base">zoom_out</span></button>
      <button type="button" onClick={() => fitView({ padding: 0.2 })} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="适应画布"><span className="material-symbols-outlined text-base">fit_screen</span></button>
      <button type="button" onClick={handleAutoLayout} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="自动布局"><span className="material-symbols-outlined text-base">account_tree</span></button>
      {onToggleFocusMode && (
        <button type="button" onClick={onToggleFocusMode} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title={isFocusMode ? '退出画布全屏 (Esc)' : '画布全屏显示 (F11)'}><span className="material-symbols-outlined text-base">{isFocusMode ? 'fullscreen_exit' : 'fullscreen'}</span></button>
      )}

      <div className="w-px h-5 bg-outline-variant/20 shrink-0 mx-1" />

      {/* 第二行：文件操作 */}
      <button type="button" onClick={handleClear} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="清空画布"><span className="material-symbols-outlined text-base">delete_sweep</span></button>
      <button type="button" onClick={handleSave} className={`icon-button-soft h-8 w-8 rounded-xl shrink-0 ${saved ? 'text-green-600' : ''}`} title="保存画布 (Ctrl+S)"><span className="material-symbols-outlined text-base">{saved ? 'check_circle' : 'save'}</span></button>
      <button type="button" onClick={() => exportJSON({ nodes, edges })} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="导出 JSON"><span className="material-symbols-outlined text-base">data_object</span></button>
      <button type="button" onClick={() => void handleExportPng()} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="导出 PNG"><span className="material-symbols-outlined text-base">image</span></button>
      <button type="button" onClick={() => exportMarkdown({ nodes, edges })} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="导出 Markdown 报告"><span className="material-symbols-outlined text-base">description</span></button>
      <button type="button" onClick={() => exportDrawIO({ nodes, edges })} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="导出 draw.io"><span className="material-symbols-outlined text-base">schema</span></button>
      <button type="button" onClick={() => exportVisio({ nodes, edges })} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="导出 Visio"><span className="material-symbols-outlined text-base">view_in_ar</span></button>
      <button type="button" onClick={handleImport} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="导入 JSON"><span className="material-symbols-outlined text-base">upload_file</span></button>
      <button type="button" onClick={() => exportSystemPrompt({ nodes, edges })} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="生成系统提示词"><span className="material-symbols-outlined text-base">smart_toy</span></button>
      <button type="button" onClick={onShowHistory} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="版本历史"><span className="material-symbols-outlined text-base">history</span></button>
      <button type="button" onClick={handleShare} className="icon-button-soft h-8 w-8 rounded-xl shrink-0" title="分享"><span className="material-symbols-outlined text-base">share</span></button>

      {/* 分享对话框 */}
      {shareDialog && (typeof document !== 'undefined' ? createPortal(shareDialog, document.body) : shareDialog)}
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
import EntityNode from './nodes/EntityNode';
import AttributeNode from './nodes/AttributeNode';
import RelationshipNode from './nodes/RelationshipNode';
import FunctionBlockNode from './nodes/FunctionBlockNode';
import InputOutputNode from './nodes/InputOutputNode';
import ControlNode from './nodes/ControlNode';
import MechanismNode from './nodes/MechanismNode';
import ActorNode from './nodes/ActorNode';
import UseCaseNode from './nodes/UseCaseNode';
import SystemBoundaryNode from './nodes/SystemBoundaryNode';
import LifelineNode from './nodes/LifelineNode';
import ActivationNode from './nodes/ActivationNode';
import CombinedFragmentNode from './nodes/CombinedFragmentNode';
import ClassNode from './nodes/ClassNode';
import InterfaceNode from './nodes/InterfaceNode';
import EnumNode from './nodes/EnumNode';
import StateNode from './nodes/StateNode';
import InitialStateNode from './nodes/InitialStateNode';
import FinalStateNode from './nodes/FinalStateNode';
import ChoiceNode from './nodes/ChoiceNode';
import PreparationNode from './nodes/PreparationNode';
import MergeNode from './nodes/MergeNode';
import TimerNode from './nodes/TimerNode';
import QueueNode from './nodes/QueueNode';
import DatabaseNode from './nodes/DatabaseNode';
import ForkJoinNode from './nodes/ForkJoinNode';
import SwimlaneNode from './nodes/SwimlaneNode';
import NoteNode from './nodes/NoteNode';
import FlowEdge from './edges/FlowEdge';
import NodeEditDialog from './NodeEditDialog';
import VersionHistoryDialog from '../VersionHistoryDialog';
import { CanvasContext } from './CanvasContext';
import NodeToolbox from './NodeToolbox';
import { getNodeTypeLabel } from '../../features/diagrams/diagramRegistry';

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
  entity: EntityNode,
  attribute: AttributeNode,
  relationship: RelationshipNode,
  function_block: FunctionBlockNode,
  input_output: InputOutputNode,
  control: ControlNode,
  mechanism: MechanismNode,
  actor: ActorNode,
  usecase_item: UseCaseNode,
  system_boundary: SystemBoundaryNode,
  lifeline: LifelineNode,
  activation: ActivationNode,
  combined_fragment: CombinedFragmentNode,
  class: ClassNode,
  interface: InterfaceNode,
  enum_node: EnumNode,
  state: StateNode,
  initial_state: InitialStateNode,
  final_state: FinalStateNode,
  choice: ChoiceNode,
  preparation: PreparationNode,
  merge: MergeNode,
  timer: TimerNode,
  queue: QueueNode,
  database: DatabaseNode,
  fork_join: ForkJoinNode,
  swimlane: SwimlaneNode,
  note: NoteNode,
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
        data: { label: `新${getNodeTypeLabel(type)}` },
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
          <ViewControls
            isFocusMode={isFocusMode}
            onToggleFocusMode={onToggleFocusMode}
            onShowHistory={() => setHistoryOpen(true)}
          />
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
        </ReactFlow>
      </div>

      {/* 版本历史对话框 */}
      <VersionHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />

      {/* 右侧节点工具箱 */}
      <NodeToolbox onAddNode={handleAddNode} />

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
