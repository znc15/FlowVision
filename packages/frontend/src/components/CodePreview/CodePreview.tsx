import { useMemo, useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useSettingsStore } from '../../store/settingsStore';

interface CodePreviewProps {
  /** 文件名 */
  fileName?: string;
  /** 文件路径（相对路径） */
  filePath?: string;
  /** 项目根路径（用于从 API 获取内容） */
  projectPath?: string;
  /** 代码内容（直接传入则不走 API） */
  code?: string;
  /** 起始行号 */
  startLine?: number;
  /** 高亮行（相对于 startLine 的偏移） */
  highlightLines?: number[];
  /** 关闭回调 */
  onClose?: () => void;
}

function renderHighlightedLine(line: string) {
  const parts = line.split(/("[^"]*"|\b(?:int|if|return)\b|\b(?:ngx_[A-Za-z0-9_]+)\b|\b\d+\b)/g);

  return parts.map((part, index) => {
    if (!part) return null;

    if (/^"[^"]*"$/.test(part)) {
      return (
        <span key={index} className="code-token-string">
          {part}
        </span>
      );
    }

    if (/^(int|if|return)$/.test(part)) {
      return (
        <span key={index} className="code-token-keyword">
          {part}
        </span>
      );
    }

    if (/^ngx_[A-Za-z0-9_]+$/.test(part)) {
      return (
        <span key={index} className="code-token-function">
          {part}
        </span>
      );
    }

    if (/^\d+$/.test(part)) {
      return (
        <span key={index} className="code-token-number">
          {part}
        </span>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

/** 代码预览面板 */
function CodePreview({
  fileName,
  filePath,
  projectPath,
  code: propCode,
  startLine = 1,
  highlightLines = [],
  onClose,
}: CodePreviewProps) {
  const [fetchedCode, setFetchedCode] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // 从后端获取文件内容
  useEffect(() => {
    if (propCode || !projectPath || !filePath) return;
    setLoading(true);
    const params = new URLSearchParams({ projectPath, filePath });
    const githubToken = useSettingsStore.getState().githubToken;
    if (githubToken) params.set('token', githubToken);
    fetch(`http://localhost:3001/api/file-content?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setFetchedCode(data.data.content);
      })
      .catch((err) => console.error('获取文件内容失败:', err))
      .finally(() => setLoading(false));
  }, [projectPath, filePath, propCode]);

  const code = propCode ?? fetchedCode;
  const displayName = fileName ?? filePath?.split('/').pop() ?? '未选择文件';
  const isMarkdown = /\.md$/i.test(displayName);
  const lines = useMemo(() => code.split('\n'), [code]);

  const [copied, setCopied] = useState(false);
  const [showMarkdownSource, setShowMarkdownSource] = useState(false);

  // 切换文件时重置 markdown 源码模式
  useEffect(() => { setShowMarkdownSource(false); }, [filePath]);

  const handleCopyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!code) return;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = displayName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="flex-1 min-w-0 bg-surface-container-lowest flex flex-col h-full min-h-0">
      {/* 标题栏 */}
      <div className="workbench-panel-header px-6 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-on-surface">{displayName}</span>
          {filePath && filePath !== displayName && !filePath.endsWith(`/${displayName}`) && (
            <span className="text-[10px] text-on-surface-variant/50">{filePath}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isMarkdown && (
            <button
              className={`icon-button-soft h-8 w-8 ${!showMarkdownSource ? 'text-primary' : ''}`}
              onClick={() => setShowMarkdownSource((v) => !v)}
              title={showMarkdownSource ? '预览 Markdown' : '查看源码'}
            >
              <span className="material-symbols-outlined text-sm">
                {showMarkdownSource ? 'visibility' : 'code'}
              </span>
            </button>
          )}
          <button className="icon-button-soft h-8 w-8" onClick={handleDownload} title="下载文件">
            <span className="material-symbols-outlined text-sm">download</span>
          </button>
          <button className={`icon-button-soft h-8 w-8 ${copied ? 'text-green-600' : ''}`} onClick={handleCopyCode} title="复制代码">
            <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
          </button>
          {onClose && (
            <button className="icon-button-soft h-8 w-8" onClick={onClose} title="关闭预览">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
      </div>

      {/* 代码区域 */}
      <div className="flex-1 flex overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-on-surface-variant">加载中...</div>
        ) : !code ? (
          <div className="flex-1 flex items-center justify-center text-xs text-on-surface-variant">选择文件以预览代码</div>
        ) : isMarkdown && !showMarkdownSource ? (
          <div className="flex-1 overflow-auto px-6 py-4 prose prose-sm prose-slate max-w-none
            prose-headings:text-on-surface prose-p:text-on-surface/80 prose-a:text-primary
            prose-a:underline prose-a:decoration-primary/30 prose-a:hover:decoration-primary
            prose-code:bg-surface-container-high prose-code:px-1 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-surface-container-high prose-pre:text-on-surface/90
            prose-blockquote:border-primary/30 prose-blockquote:text-on-surface-variant
            prose-img:rounded-lg prose-hr:border-outline-variant/30
            prose-th:text-on-surface prose-td:text-on-surface/80
            prose-li:text-on-surface/80">
            <Markdown rehypePlugins={[rehypeRaw]} components={{
              a: ({ href, children, ...props }) => {
                // 相对链接标记但不阻止显示
                const isRelative = href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('#');
                return (
                  <a
                    href={isRelative ? undefined : href}
                    target={isRelative ? undefined : '_blank'}
                    rel={isRelative ? undefined : 'noopener noreferrer'}
                    title={isRelative ? `相对路径: ${href}` : href}
                    className={isRelative ? 'cursor-default opacity-70' : undefined}
                    onClick={(e) => {
                      if (isRelative) {
                        e.preventDefault();
                        return;
                      }
                      if (href && window.electron?.isElectron) {
                        e.preventDefault();
                        window.open(href, '_blank');
                      }
                    }}
                    {...props}
                  >
                    {children}
                  </a>
                );
              },
              img: ({ src, alt, ...props }) => {
                // 处理相对路径图片
                let imgSrc = src;
                if (src && !src.startsWith('http') && !src.startsWith('data:') && projectPath && filePath) {
                  const dir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
                  const resolvedPath = dir ? `${dir}/${src}` : src;
                  const githubToken = useSettingsStore.getState().githubToken;
                  const params = new URLSearchParams({ projectPath, filePath: resolvedPath });
                  if (githubToken) params.set('token', githubToken);
                  imgSrc = `http://localhost:3001/api/file-content?${params}&raw=1`;
                }
                return <img src={imgSrc} alt={alt || ''} {...props} />;
              },
            }}>{code}</Markdown>
          </div>
        ) : (
        <>
        {/* 行号 */}
        <div className="w-12 bg-surface-container-low text-right pr-3 py-4 text-on-surface-variant/30 select-none code-font leading-6 shrink-0">
          {lines.map((_, i) => (
            <div key={i}>{startLine + i}</div>
          ))}
        </div>

        {/* 代码内容 */}
        <div className="flex-1 py-4 overflow-auto code-font leading-6 text-on-surface">
          <pre className="px-4 whitespace-pre-wrap">
            {lines.map((line, i) => {
              const isHighlighted = highlightLines?.includes(i);
              return (
                <div key={i} className={isHighlighted ? 'editor-highlight-line -ml-4 -mr-4 pl-4 pr-4' : ''}>
                  {line ? renderHighlightedLine(line) : <span className="code-token-dim"> </span>}
                </div>
              );
            })}
          </pre>
        </div>
        </>
        )}
      </div>
    </section>
  );
}

export default CodePreview;
