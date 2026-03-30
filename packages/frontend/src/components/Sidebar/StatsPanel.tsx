import { useState, useMemo } from 'react';
import { useLogStore } from '../../store/logStore';
import { useGraphStore } from '../../store/graphStore';
import { useChatStore } from '../../store/chatStore';

/** 从 localStorage 中获取项目概览缓存 */
function loadCachedOverview() {
  try {
    const raw = localStorage.getItem('flowvision-project-overview');
    if (!raw) return null;
    return JSON.parse(raw)?.data || null;
  } catch { return null; }
}

/** 估算文本的 token 数量（简单的字符比例估算） */
function estimateTokens(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}

function StatsPanel() {
  const entries = useLogStore((s) => s.entries);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const messages = useChatStore((s) => s.messages);
  const conversations = useChatStore((s) => s.conversations);
  const [activeSection, setActiveSection] = useState<'overview' | 'language' | 'ai' | 'graph'>('overview');

  // 从项目分析缓存中获取语言统计
  const projectOverview = useMemo(() => loadCachedOverview(), []);

  // AI 使用统计
  const aiStats = useMemo(() => {
    const aiRequests = entries.filter((e) => e.source === 'AI请求' || e.source === 'AI分析' || e.source === 'Prompt生成');
    const successCount = entries.filter((e) => e.level === 'success').length;
    const errorCount = entries.filter((e) => e.level === 'error').length;

    // 估算 token 用量
    const totalInputTokens = messages
      .filter((m) => m.role === 'user')
      .reduce((sum, m) => sum + estimateTokens(m.content), 0);
    const totalOutputTokens = messages
      .filter((m) => m.role === 'assistant')
      .reduce((sum, m) => sum + estimateTokens(m.content), 0);

    return {
      totalRequests: aiRequests.length,
      successCount,
      errorCount,
      totalConversations: conversations.length,
      totalMessages: messages.length,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
    };
  }, [entries, messages, conversations]);

  // 画布统计
  const graphStats = useMemo(() => {
    const typeMap: Record<string, number> = {};
    for (const node of nodes) {
      typeMap[node.type] = (typeMap[node.type] || 0) + 1;
    }
    const isolatedNodes = nodes.filter(
      (n) => !edges.some((e) => e.source === n.id || e.target === n.id)
    );
    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodesByType: typeMap,
      isolatedNodes: isolatedNodes.length,
    };
  }, [nodes, edges]);

  // 日志来源统计
  const logSourceStats = useMemo(() => {
    const sourceMap: Record<string, number> = {};
    for (const entry of entries) {
      sourceMap[entry.source] = (sourceMap[entry.source] || 0) + 1;
    }
    return Object.entries(sourceMap)
      .sort(([, a], [, b]) => b - a);
  }, [entries]);

  const NODE_TYPE_LABELS: Record<string, string> = {
    start: '开始', end: '结束', process: '流程', decision: '判断',
    data: '数据', group: '分组', subprocess: '子流程', delay: '延迟',
    document: '文档', manual_input: '手动输入', annotation: '注释', connector: '连接器',
  };

  const sections = [
    { id: 'overview' as const, icon: 'dashboard', label: '总览' },
    { id: 'language' as const, icon: 'code', label: '语言' },
    { id: 'ai' as const, icon: 'smart_toy', label: 'AI' },
    { id: 'graph' as const, icon: 'account_tree', label: '画布' },
  ];

  return (
    <div className="h-full flex flex-col bg-surface-container-low">
      {/* 标题栏 */}
      <div className="workbench-panel-header px-4 shrink-0 flex items-center justify-between">
        <span className="text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">
          使用统计
        </span>
      </div>

      {/* 分段切换 */}
      <div className="px-4 py-2 flex gap-1 border-b border-outline-variant/10">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-200 ${
              activeSection === s.id
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant/60 hover:bg-surface-container-highest/40'
            }`}
          >
            <span className="material-symbols-outlined text-xs">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* 总览 */}
        {activeSection === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <StatCard icon="smart_toy" label="AI 调用" value={aiStats.totalRequests} color="blue" />
              <StatCard icon="token" label="总 Token" value={aiStats.totalTokens.toLocaleString()} color="purple" />
              <StatCard icon="chat" label="对话数" value={aiStats.totalConversations} color="green" />
              <StatCard icon="forum" label="消息数" value={aiStats.totalMessages} color="amber" />
              <StatCard icon="account_tree" label="节点数" value={graphStats.totalNodes} color="cyan" />
              <StatCard icon="timeline" label="连线数" value={graphStats.totalEdges} color="pink" />
            </div>

            {/* 日志来源分布 */}
            {logSourceStats.length > 0 && (
              <div>
                <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-2">
                  <span className="material-symbols-outlined text-xs text-primary/50">analytics</span>
                  操作来源分布
                </label>
                <div className="space-y-1.5">
                  {logSourceStats.map(([source, count]) => (
                    <div key={source} className="flex items-center gap-2">
                      <span className="text-[10px] text-on-surface-variant w-16 truncate">{source}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-surface-container-highest/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/50"
                          style={{ width: `${Math.min(100, (count / Math.max(1, entries.length)) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-[9px] text-on-surface-variant/50 w-6 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 语言统计 */}
        {activeSection === 'language' && (
          <div className="space-y-4">
            {projectOverview?.fileStats ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard icon="description" label="总文件数" value={projectOverview.fileStats.totalFiles} color="blue" />
                  <StatCard icon="data_array" label="总行数" value={projectOverview.fileStats.totalLines?.toLocaleString()} color="purple" />
                </div>
                {projectOverview.fileStats.languages?.length > 0 && (
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-2">
                      <span className="material-symbols-outlined text-xs text-primary/50">code</span>
                      语言分布
                    </label>
                    <div className="space-y-2">
                      {projectOverview.fileStats.languages.map((lang: { name: string; files: number; percentage: number }) => (
                        <div key={lang.name} className="p-2.5 rounded-lg bg-surface-container-highest/30 ghost-border-soft">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-on-surface">{lang.name}</span>
                            <span className="text-[10px] text-on-surface-variant">{lang.files} 文件 · {lang.percentage}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-surface-container-highest/40 overflow-hidden">
                            <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.min(100, lang.percentage)}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState icon="code" message="暂无语言统计" hint="请先在项目页执行 AI 分析" />
            )}

            {projectOverview?.techStack?.length > 0 && (
              <div>
                <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-2">
                  <span className="material-symbols-outlined text-xs text-primary/50">layers</span>
                  技术栈
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {projectOverview.techStack.map((tech: string) => (
                    <span key={tech} className="px-2 py-1 bg-surface-container-highest text-on-surface text-[10px] rounded-md ghost-border-soft">{tech}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI 使用统计 */}
        {activeSection === 'ai' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <StatCard icon="upload" label="输入 Token" value={aiStats.totalInputTokens.toLocaleString()} color="blue" />
              <StatCard icon="download" label="输出 Token" value={aiStats.totalOutputTokens.toLocaleString()} color="green" />
              <StatCard icon="check_circle" label="成功" value={aiStats.successCount} color="green" />
              <StatCard icon="error" label="失败" value={aiStats.errorCount} color="red" />
            </div>

            {/* 最近请求日志 */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-2">
                <span className="material-symbols-outlined text-xs text-primary/50">history</span>
                最近 AI 活动
              </label>
              <div className="space-y-1">
                {entries
                  .filter((e) => e.source === 'AI请求' || e.source === 'AI分析' || e.source === 'Prompt生成')
                  .slice(0, 20)
                  .map((entry) => {
                    const time = new Date(entry.timestamp);
                    const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
                    return (
                      <div key={entry.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-surface-container-highest/20">
                        <span className={`material-symbols-outlined text-xs ${
                          entry.level === 'success' ? 'text-green-500' :
                          entry.level === 'error' ? 'text-red-500' :
                          'text-blue-500'
                        }`}>
                          {entry.level === 'success' ? 'check_circle' : entry.level === 'error' ? 'error' : 'info'}
                        </span>
                        <span className="text-[10px] text-on-surface/70 flex-1 truncate">{entry.message}</span>
                        <span className="text-[9px] text-on-surface-variant/40">{timeStr}</span>
                      </div>
                    );
                  })}
                {entries.filter((e) => e.source === 'AI请求' || e.source === 'AI分析' || e.source === 'Prompt生成').length === 0 && (
                  <EmptyState icon="smart_toy" message="暂无 AI 活动记录" hint="开始对话或分析项目后将显示" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* 画布统计 */}
        {activeSection === 'graph' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <StatCard icon="account_tree" label="节点总数" value={graphStats.totalNodes} color="blue" />
              <StatCard icon="timeline" label="连线总数" value={graphStats.totalEdges} color="purple" />
              <StatCard icon="warning" label="孤立节点" value={graphStats.isolatedNodes} color="amber" />
              <StatCard icon="category" label="节点类型" value={Object.keys(graphStats.nodesByType).length} color="green" />
            </div>

            {Object.keys(graphStats.nodesByType).length > 0 && (
              <div>
                <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-2">
                  <span className="material-symbols-outlined text-xs text-primary/50">donut_large</span>
                  节点类型分布
                </label>
                <div className="space-y-1.5">
                  {Object.entries(graphStats.nodesByType)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-highest/30 ghost-border-soft">
                        <span className="text-xs font-medium text-on-surface w-16 truncate">{NODE_TYPE_LABELS[type] || type}</span>
                        <div className="flex-1 h-2 rounded-full bg-surface-container-highest/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/60"
                            style={{ width: `${Math.min(100, (count / Math.max(1, graphStats.totalNodes)) * 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-on-surface-variant w-6 text-right">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {graphStats.totalNodes === 0 && (
              <EmptyState icon="account_tree" message="画布为空" hint="通过 AI 对话或拖拽添加节点" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** 统计卡片组件 */
function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    cyan: 'bg-cyan-50 text-cyan-700',
    pink: 'bg-pink-50 text-pink-700',
    red: 'bg-red-50 text-red-700',
  };
  const colors = colorMap[color] || colorMap.blue;

  return (
    <div className={`p-3 rounded-xl ${colors.split(' ')[0]} text-center shadow-sm`}>
      <span className={`material-symbols-outlined text-base ${colors.split(' ')[1]} mb-1 block`}>{icon}</span>
      <p className={`text-sm font-bold ${colors.split(' ')[1]}`}>{value}</p>
      <p className="text-[9px] opacity-60 mt-0.5">{label}</p>
    </div>
  );
}

/** 空状态提示 */
function EmptyState({ icon, message, hint }: { icon: string; message: string; hint: string }) {
  return (
    <div className="flex flex-col items-center text-center py-6">
      <span className="material-symbols-outlined text-2xl text-on-surface-variant/25 mb-2">{icon}</span>
      <p className="text-xs text-on-surface-variant/50">{message}</p>
      <p className="text-[9px] text-on-surface-variant/30 mt-1">{hint}</p>
    </div>
  );
}

export default StatsPanel;
