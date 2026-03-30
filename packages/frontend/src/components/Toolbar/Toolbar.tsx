import { memo, useCallback, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useGraphStore } from '../../store/graphStore';
import { useHistoryStore } from '../../store/historyStore';
import { useTabStore } from '../../store/tabStore';
import { exportJSON, exportPNG, exportMarkdown, importJSON, exportSystemPrompt } from '../../utils/export';
import { shareGraph } from '../../utils/share';

interface ToolbarProps {
  onShowHistory?: () => void;
}

function Toolbar({ onShowHistory }: ToolbarProps) {
  const { nodes, edges } = useGraphStore();
  const { pushHistory } = useHistoryStore();
  const { fitView, getNodes, setViewport, toObject } = useReactFlow();
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

  return (
    <div className="w-full rounded-2xl bg-surface-container-lowest/94 px-3 py-2 backdrop-blur-md ghost-border-soft shadow-[0_10px_30px_rgba(15,23,42,0.08)] overflow-hidden" style={{ containerType: 'inline-size' }}>
      <div className="flex flex-wrap items-center gap-2">
        {/* 文件操作组 */}
        <div className="flex items-center gap-1">
          <button type="button" onClick={handleClear} className="toolbar-label-btn" title="清空画布">
            <span className="material-symbols-outlined text-base">delete_sweep</span>
            <span className="toolbar-label-text">清空</span>
          </button>
          <button type="button" onClick={handleSave} className={`toolbar-label-btn ${saved ? 'text-green-600' : ''}`} title="保存画布 (Ctrl+S)">
            <span className="material-symbols-outlined text-base">{saved ? 'check_circle' : 'save'}</span>
            <span className="toolbar-label-text">{saved ? '已保存' : '保存'}</span>
          </button>
          <button type="button" onClick={() => exportJSON({ nodes, edges })} className="toolbar-label-btn" title="导出 JSON">
            <span className="material-symbols-outlined text-base">data_object</span>
            <span className="toolbar-label-text">JSON</span>
          </button>
          <button type="button" onClick={() => void handleExportPng()} className="toolbar-label-btn" title="导出 PNG">
            <span className="material-symbols-outlined text-base">image</span>
            <span className="toolbar-label-text">导出 PNG</span>
          </button>
          <button type="button" onClick={() => exportMarkdown({ nodes, edges })} className="toolbar-label-btn" title="导出 Markdown 报告">
            <span className="material-symbols-outlined text-base">description</span>
            <span className="toolbar-label-text">Markdown</span>
          </button>
          <button type="button" onClick={handleImport} className="toolbar-label-btn" title="导入 JSON">
            <span className="material-symbols-outlined text-base">upload_file</span>
            <span className="toolbar-label-text">导入</span>
          </button>
          <button type="button" onClick={() => exportSystemPrompt({ nodes, edges })} className="toolbar-label-btn" title="生成系统提示词">
            <span className="material-symbols-outlined text-base">smart_toy</span>
            <span className="toolbar-label-text">提示词</span>
          </button>
          <button type="button" onClick={onShowHistory} className="toolbar-label-btn" title="版本历史">
            <span className="material-symbols-outlined text-base">history</span>
            <span className="toolbar-label-text">历史</span>
          </button>
          <button type="button" onClick={handleShare} className="toolbar-label-btn" title="分享">
            <span className="material-symbols-outlined text-base">share</span>
            <span className="toolbar-label-text">分享</span>
          </button>
        </div>
      </div>

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
