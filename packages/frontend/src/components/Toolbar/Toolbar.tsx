import { memo, useCallback, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useGraphStore } from '../../store/graphStore';
import { useHistoryStore } from '../../store/historyStore';
import { useTabStore } from '../../store/tabStore';
import { forceRelayout } from '../../utils/layout';
import { NodeType, GraphNode } from '../../types/graph';
import { exportJSON, exportPNG, exportMarkdown, importJSON, exportSystemPrompt } from '../../utils/export';
import { shareGraph } from '../../utils/share';

/** 节点模板 */
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

let nodeSeq = 0;

interface ToolbarProps {
  onShowHistory?: () => void;
}

function Toolbar({ onShowHistory }: ToolbarProps) {
  const { addNode, nodes, edges } = useGraphStore();
  const { pushHistory } = useHistoryStore();
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  /** 保存当前画布到标签页 */
  const handleSave = useCallback(() => {
    const { activeTabId, saveTabGraph } = useTabStore.getState();
    saveTabGraph(activeTabId, { nodes, edges });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [nodes, edges]);

  /** 添加新节点 */
  const handleAddNode = useCallback(
    (type: NodeType) => {
      const id = `node-${Date.now()}-${++nodeSeq}`;
      const newNode: GraphNode = {
        id,
        type,
        position: { x: 100 + nodeSeq * 30, y: 100 + nodeSeq * 30 },
        data: { label: `新${NODE_TEMPLATES.find((t) => t.type === type)?.label ?? '节点'}` },
      };
      addNode(newNode);
      pushHistory({ nodes: [...nodes, newNode], edges });
    },
    [addNode, nodes, edges, pushHistory],
  );

  /** 自动布局 */
  const handleAutoLayout = useCallback(() => {
    const graph = forceRelayout({ nodes, edges });
    useGraphStore.getState().replaceGraph(graph);
    pushHistory(graph);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [nodes, edges, pushHistory, fitView]);

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

  return (
    <div className="flex items-center gap-1 bg-surface-container-lowest/92 backdrop-blur-md ghost-border-soft rounded-xl px-2 py-1 shadow-sm">
      {/* 添加节点 */}
      {NODE_TEMPLATES.map((tpl) => (
        <button
          key={tpl.type}
          onClick={() => handleAddNode(tpl.type)}
          className="icon-button-soft h-8 w-8"
          title={`添加${tpl.label}节点`}
        >
          <span className="material-symbols-outlined text-base">{tpl.icon}</span>
        </button>
      ))}

      <div className="w-px h-5 bg-outline-variant mx-1" />

      {/* 缩放 */}
      <button onClick={() => zoomIn()} className="icon-button-soft h-8 w-8" title="放大">
        <span className="material-symbols-outlined text-base">zoom_in</span>
      </button>
      <button onClick={() => zoomOut()} className="icon-button-soft h-8 w-8" title="缩小">
        <span className="material-symbols-outlined text-base">zoom_out</span>
      </button>
      <button onClick={() => fitView({ padding: 0.2 })} className="icon-button-soft h-8 w-8" title="适应画布">
        <span className="material-symbols-outlined text-base">fit_screen</span>
      </button>

      <div className="w-px h-5 bg-outline-variant mx-1" />

      {/* 布局 & 清空 */}
      <button onClick={handleAutoLayout} className="icon-button-soft h-8 w-8" title="自动布局">
        <span className="material-symbols-outlined text-base">account_tree</span>
      </button>
      <button onClick={handleClear} className="icon-button-soft h-8 w-8" title="清空画布">
        <span className="material-symbols-outlined text-base">delete_sweep</span>
      </button>

      <div className="w-px h-5 bg-outline-variant mx-1" />

      {/* 保存 */}
      <button onClick={handleSave} className={`icon-button-soft h-8 w-8 ${saved ? 'text-green-600' : ''}`} title="保存画布 (Ctrl+S)">
        <span className="material-symbols-outlined text-base">{saved ? 'check_circle' : 'save'}</span>
      </button>

      {/* 导出 */}
      <button onClick={() => exportJSON({ nodes, edges })} className="icon-button-soft h-8 w-8" title="导出 JSON">
        <span className="material-symbols-outlined text-base">data_object</span>
      </button>
      <button onClick={() => exportPNG()} className="icon-button-soft h-8 w-8" title="导出 PNG">
        <span className="material-symbols-outlined text-base">image</span>
      </button>
      <button onClick={() => exportMarkdown({ nodes, edges })} className="icon-button-soft h-8 w-8" title="导出 Markdown 报告">
        <span className="material-symbols-outlined text-base">description</span>
      </button>
      <button onClick={handleImport} className="icon-button-soft h-8 w-8" title="导入 JSON">
        <span className="material-symbols-outlined text-base">upload_file</span>
      </button>
      <button onClick={() => exportSystemPrompt({ nodes, edges })} className="icon-button-soft h-8 w-8" title="生成系统提示词">
        <span className="material-symbols-outlined text-base">smart_toy</span>
      </button>

      <div className="w-px h-5 bg-outline-variant mx-1" />

      {/* 版本历史 */}
      <button onClick={onShowHistory} className="icon-button-soft h-8 w-8" title="版本历史">
        <span className="material-symbols-outlined text-base">history</span>
      </button>
      <button
        onClick={handleShare}
        className="icon-button-soft h-8 w-8"
        title="分享"
      >
        <span className="material-symbols-outlined text-base">share</span>
      </button>

      {/* 分享弹窗 */}
      {shareUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShareUrl(null)}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden animate-[scaleIn_200ms_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部渐变条 */}
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
              {/* 链接预览 */}
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
              {/* 信息 */}
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                <span className="material-symbols-outlined text-xs text-amber-500 mt-0.5">info</span>
                <p className="text-[10px] text-amber-700 leading-relaxed">
                  分享链接包含完整的流程图数据。{nodes.length} 个节点、{edges.length} 条连线将嵌入在链接中。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(Toolbar);
