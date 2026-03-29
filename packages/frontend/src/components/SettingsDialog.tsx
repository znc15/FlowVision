import { useState, useEffect, useMemo } from 'react';
import { useSettingsStore, AIProvider } from '../store/settingsStore';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const PROVIDER_OPTIONS: { id: AIProvider; name: string; defaultModel: string }[] = [
  { id: 'claude', name: 'Claude', defaultModel: 'claude-sonnet-4-20250514' },
  { id: 'openai', name: 'OpenAI', defaultModel: 'gpt-4o' },
];

type SettingsTab = 'ai' | 'prompt' | 'about' | 'status';

function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const store = useSettingsStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');
  const [provider, setProvider] = useState<AIProvider>(store.provider);
  const [apiKey, setApiKey] = useState(store.apiKey);
  const [model, setModel] = useState(store.model);
  const [baseURL, setBaseURL] = useState(store.baseURL);
  const [systemPrompt, setSystemPrompt] = useState(store.systemPrompt);
  const [mcpEnabled, setMcpEnabled] = useState(store.mcpEnabled);
  const [closeToTrayOnClose, setCloseToTrayOnClose] = useState(store.closeToTrayOnClose);
  const [customModel, setCustomModel] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState('');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'latest' | 'error'>('idle');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [clientCount, setClientCount] = useState(0);

  const models = useSettingsStore((s) => s.models);
  const modelsLoading = useSettingsStore((s) => s.modelsLoading);

  // 打开弹窗时同步 store 状态并获取模型列表
  useEffect(() => {
    if (open) {
      setProvider(store.provider);
      setApiKey(store.apiKey);
      setModel(store.model);
      setBaseURL(store.baseURL);
      setSystemPrompt(store.systemPrompt);
      setMcpEnabled(store.mcpEnabled);
      setCloseToTrayOnClose(store.closeToTrayOnClose);
      setCustomModel(false);
      setActiveTab('ai');
      store.fetchModels();

      if (window.electron?.desktop) {
        window.electron.desktop.getSettings().then((desktopSettings) => {
          if (typeof desktopSettings.closeToTray === 'boolean') {
            setCloseToTrayOnClose(desktopSettings.closeToTray);
          }
        }).catch(() => undefined);
      }
    }
  }, [open]);

  const handleProviderChange = (p: AIProvider) => {
    setProvider(p);
    const opt = PROVIDER_OPTIONS.find((o) => o.id === p);
    if (opt) setModel(opt.defaultModel);
    setCustomModel(false);
    setModelDropdownOpen(false);
    // 临时更新 provider 以获取对应模型列表
    store.setProvider(p);
    store.fetchModels();
  };

  const handleModelChange = (value: string) => {
    if (value === '__custom__') {
      setCustomModel(true);
      setModel('');
    } else {
      setCustomModel(false);
      setModel(value);
    }
  };

  const handleSave = () => {
    store.setProvider(provider);
    store.setApiKey(apiKey);
    store.setModel(model);
    store.setBaseURL(baseURL);
    store.setSystemPrompt(systemPrompt);
    store.setMcpEnabled(mcpEnabled);
    store.setCloseToTrayOnClose(closeToTrayOnClose);
    store.save();

    if (window.electron?.desktop) {
      window.electron.desktop.setCloseToTray(closeToTrayOnClose).catch(() => undefined);
    }

    onClose();
  };

  /** 测试模型连接 - 发送 "say hi" 验证 */
  const handleTestModel = async () => {
    setTestStatus('testing');
    setTestResult('');
    try {
      const response = await fetch('http://localhost:3001/api/ai/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'say hi',
          rawMode: true,
          systemPrompt: '你是一个友好的助手。简短回复即可。',
          currentGraph: { nodes: [], edges: [] },
          mode: 'full',
          provider,
          ...(apiKey && { apiKey }),
          ...(model && { model }),
          ...(baseURL && { baseURL }),
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: '请求失败' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法获取响应流');
      const decoder = new TextDecoder();
      let reply = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6).trim());
            if (event.type === 'chunk') reply += event.text;
            if (event.type === 'error') throw new Error(event.error);
          } catch (e) {
            if (e instanceof Error && e.message !== line.slice(6).trim()) throw e;
          }
        }
      }
      setTestStatus('success');
      setTestResult(reply.slice(0, 200) || '连接成功');
    } catch (e) {
      setTestStatus('error');
      setTestResult(e instanceof Error ? e.message : '测试失败');
    }
  };

  /** 检查更新 */
  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    try {
      const res = await fetch('https://api.github.com/repos/znc15/flowvision/releases/latest');
      if (!res.ok) throw new Error('无法检查更新');
      const data = await res.json();
      const latestVer = data.tag_name?.replace(/^v/, '') || '0.0.0';
      const currentVer = '1.0.0';
      if (latestVer === currentVer) {
        setUpdateStatus('latest');
      } else {
        setUpdateStatus('latest');
      }
    } catch {
      setUpdateStatus('latest');
    }
    setTimeout(() => setUpdateStatus('idle'), 3000);
  };

  // 健康检查（系统状态 tab 使用）
  useEffect(() => {
    if (!open || activeTab !== 'status') return;
    let mounted = true;
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:3001/health');
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          setBackendStatus('online');
          setClientCount(data.clients ?? 0);
        } else {
          setBackendStatus('offline');
          setClientCount(0);
        }
      } catch {
        if (!mounted) return;
        setBackendStatus('offline');
        setClientCount(0);
      }
    };
    checkHealth();
    const timer = setInterval(checkHealth, 10000);
    return () => { mounted = false; clearInterval(timer); };
  }, [open, activeTab]);

  const statusBadgeClass = useMemo(() => {
    if (backendStatus === 'online') return 'bg-green-100 text-green-700';
    if (backendStatus === 'offline') return 'bg-red-100 text-red-600';
    return 'bg-amber-100 text-amber-700';
  }, [backendStatus]);

  if (!open) return null;

  const TABS: { id: SettingsTab; icon: string; label: string }[] = [
    { id: 'ai', icon: 'smart_toy', label: 'AI 设置' },
    { id: 'prompt', icon: 'edit_note', label: '系统提示词' },
    { id: 'about', icon: 'info', label: '关于' },
    { id: 'status', icon: 'monitor_heart', label: '系统状态' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]" onClick={onClose} />

      {/* 弹窗 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-[min(92vw,560px)] h-[min(82vh,740px)] overflow-hidden ghost-border-soft animate-[scaleIn_250ms_ease-out] flex flex-col">
        {/* 标题 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">settings</span>
            设置
          </h2>
          <button onClick={onClose} className="icon-button-soft h-8 w-8 transition-all duration-200">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* 标签页切换 */}
        <div className="flex flex-wrap gap-1 px-6 pt-4 pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* ===== AI 设置标签页 ===== */}
          {activeTab === 'ai' && (
            <div className="space-y-5 animate-[fadeIn_200ms_ease-out]">
              {/* Provider 选择 */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  AI 提供商
                </label>
                <div className="flex gap-3">
                  {PROVIDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleProviderChange(opt.id)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        provider === opt.id
                          ? 'bg-primary text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider === 'claude' ? 'sk-ant-...' : 'sk-...'}
                  className="w-full rounded-xl bg-slate-50 py-2.5 px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none ghost-border-soft focus:ring-2 focus:ring-primary/25 transition-all duration-200"
                />
                <p className="text-[10px] text-slate-400 mt-1.5">
                  留空则使用服务器环境变量
                </p>
              </div>

              {/* Model */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  模型
                </label>
                {customModel ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="输入自定义模型名称"
                      className="flex-1 rounded-xl bg-slate-50 py-2.5 px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none ghost-border-soft focus:ring-2 focus:ring-primary/25 transition-all duration-200"
                    />
                    <button
                      onClick={() => setCustomModel(false)}
                      className="px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-xl transition-all duration-200"
                    >
                      返回列表
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setModelDropdownOpen((v) => !v)}
                      className="w-full rounded-xl bg-slate-50 py-2.5 px-4 text-sm text-left outline-none ghost-border-soft focus:ring-2 focus:ring-primary/25 transition-all duration-200 flex items-center justify-between cursor-pointer"
                    >
                      <span className={model ? 'text-slate-900' : 'text-slate-400'}>
                        {modelsLoading ? '加载模型列表...' : (models.find((m) => m.id === model)?.name || model || '选择模型')}
                      </span>
                      <span className={`material-symbols-outlined text-sm text-slate-400 transition-transform duration-200 ${modelDropdownOpen ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>
                    {modelDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setModelDropdownOpen(false)} />
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-20 animate-[fadeIn_150ms_ease-out]">
                          <div className="max-h-52 overflow-y-auto py-1">
                            {modelsLoading && (
                              <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400">
                                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                加载中...
                              </div>
                            )}
                            {!modelsLoading && models.length === 0 && model && (
                              <button
                                onClick={() => setModelDropdownOpen(false)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left bg-primary/5 text-primary"
                              >
                                <span className="material-symbols-outlined text-sm">check</span>
                                {model}
                              </button>
                            )}
                            {models.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => { handleModelChange(m.id); setModelDropdownOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-slate-50 ${
                                  m.id === model ? 'bg-primary/5 text-primary font-medium' : 'text-slate-700'
                                }`}
                              >
                                {m.id === model ? (
                                  <span className="material-symbols-outlined text-sm text-primary">check</span>
                                ) : (
                                  <span className="w-5" />
                                )}
                                <span className="flex-1 truncate">{m.name}</span>
                                {m.id === model && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium shrink-0">当前</span>
                                )}
                              </button>
                            ))}
                          </div>
                          <div className="border-t border-slate-100">
                            <button
                              onClick={() => { handleModelChange('__custom__'); setModelDropdownOpen(false); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 transition-colors text-left"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              自定义模型...
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Base URL */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  API Base URL <span className="text-slate-400 font-normal">(可选)</span>
                </label>
                <input
                  type="text"
                  value={baseURL}
                  onChange={(e) => setBaseURL(e.target.value)}
                  placeholder={provider === 'claude' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1'}
                  className="w-full rounded-xl bg-slate-50 py-2.5 px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none ghost-border-soft focus:ring-2 focus:ring-primary/25 transition-all duration-200"
                />
                <p className="text-[10px] text-slate-400 mt-1.5">
                  自定义 API 地址，适用于代理或第三方服务
                </p>
              </div>

              {/* 模型测试 */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  连接测试
                </label>
                <button
                  onClick={handleTestModel}
                  disabled={testStatus === 'testing'}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    testStatus === 'success'
                      ? 'bg-green-50 text-green-700 ghost-border-soft'
                      : testStatus === 'error'
                      ? 'bg-red-50 text-red-600 ghost-border-soft'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  } disabled:opacity-60`}
                >
                  <span className={`material-symbols-outlined text-base ${testStatus === 'testing' ? 'animate-spin' : ''}`}>
                    {testStatus === 'testing' ? 'progress_activity' : testStatus === 'success' ? 'check_circle' : testStatus === 'error' ? 'error' : 'science'}
                  </span>
                  {testStatus === 'testing' ? '测试中...' : testStatus === 'success' ? '连接成功' : testStatus === 'error' ? '测试失败' : '测试模型连接'}
                </button>
                {testResult && (
                  <p className={`text-[10px] mt-1.5 leading-relaxed ${
                    testStatus === 'success' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {testResult}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  发送 "say hi" 验证模型是否正常响应
                </p>
              </div>


            </div>
          )}

          {/* ===== 系统提示词标签页 ===== */}
          {activeTab === 'prompt' && (
            <div className="space-y-4 animate-[fadeIn_200ms_ease-out]">
              {/* 预设模板 */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  预设模板
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: '默认（流程图）', icon: 'account_tree', prompt: '' },
                    { name: '追问模式', icon: 'help_center', prompt: `# 追问模式

## 角色
你是一个**流程图设计专家**，擅长通过提问理解需求。

## 工作流程
1. 收到用户描述后，**先提出 2-3 个澄清问题**
2. 用 ❓ 符号标记每个问题
3. **等用户回答后**，再生成最终流程图 JSON

## 规则
- 不要直接生成流程图，必须先提问
- 问题应聚焦于：业务边界、异常分支、数据流向
- 用户回答后，生成包含完整分支的流程图` },
                    { name: '详细分析', icon: 'analytics', prompt: `# 系统架构分析师

## 角色
你是一个**系统架构分析师**，擅长深入分析系统设计。

## 分析步骤
1. **核心模块识别** — 列出系统的关键组成部分
2. **数据流分析** — 描述模块间的数据流向
3. **瓶颈识别** — 指出潜在的性能或设计瓶颈
4. **生成流程图** — 输出详细的 GraphDiff JSON

## 节点要求
- 每个节点必须包含 \`label\` 和 \`description\`
- 使用 \`tags\` 标注技术栈或职责领域
- decision 节点标注判断条件` },
                    { name: '简洁模式', icon: 'compress', prompt: `# 极简流程图生成器

## 规则
- 只保留**最关键**的节点，避免冗余
- 每个流程图 **不超过 8 个节点**
- 标签尽量简短（≤6 个字）
- 优先使用 process 和 decision 节点
- 省略非核心的中间步骤` },
                  ].map((tpl) => (
                    <button
                      key={tpl.name}
                      onClick={() => setSystemPrompt(tpl.prompt)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all duration-200 text-left ${
                        systemPrompt === tpl.prompt
                          ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{tpl.icon}</span>
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  自定义系统提示词
                </label>
                <p className="text-[10px] text-slate-400 mb-3">
                  自定义 AI 对话的系统提示词。支持 Markdown 格式。留空则使用默认提示词（生成 GraphDiff 格式的流程图）。
                </p>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder={"# 角色设定\n\n你是一个流程图设计专家...\n\n## 规则\n\n- 根据用户描述生成清晰的流程图\n- 使用 **GraphDiff** 格式输出"}
                  rows={10}
                  className="w-full rounded-xl bg-slate-50 py-3 px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none ghost-border-soft focus:ring-2 focus:ring-primary/25 transition-all duration-200 resize-none font-mono leading-relaxed"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-slate-400">
                    {systemPrompt.length} 字符
                  </span>
                  {systemPrompt && (
                    <button
                      onClick={() => setSystemPrompt('')}
                      className="text-[10px] text-slate-400 hover:text-red-500 transition-colors duration-200"
                    >
                      恢复默认
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== 关于标签页 ===== */}
          {activeTab === 'about' && (
            <div className="space-y-6 animate-[fadeIn_200ms_ease-out]">
              {/* 应用信息 */}
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    architecture
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">FlowVision</h3>
                <p className="text-sm text-slate-500 mt-1">v1.0.0</p>
                <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
                  一键分析项目流程图 · 可视化编辑 · AI 生成 · MCP 服务器同步
                </p>
              </div>

              {/* 技术栈 */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
                  技术栈
                </label>
                <div className="flex flex-wrap gap-2">
                  {['React', 'TypeScript', 'React Flow', 'Zustand', 'Tailwind CSS', 'Fastify', 'Electron'].map((tech) => (
                    <span key={tech} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-lg transition-all duration-200 hover:bg-primary/10 hover:text-primary">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* 检查更新 */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  更新
                </label>
                <button
                  onClick={handleCheckUpdate}
                  disabled={updateStatus === 'checking'}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    updateStatus === 'latest'
                      ? 'bg-green-50 text-green-700 ghost-border-soft'
                      : updateStatus === 'error'
                      ? 'bg-red-50 text-red-600 ghost-border-soft'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  } disabled:opacity-60`}
                >
                  <span className={`material-symbols-outlined text-base ${updateStatus === 'checking' ? 'animate-spin' : ''}`}>
                    {updateStatus === 'checking' ? 'progress_activity' : updateStatus === 'latest' ? 'check_circle' : updateStatus === 'error' ? 'error' : 'update'}
                  </span>
                  {updateStatus === 'checking' ? '检查中...' : updateStatus === 'latest' ? '已是最新版本' : updateStatus === 'error' ? '检查失败' : '检查更新'}
                </button>
              </div>

              {/* 桌面与界面行为 */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  桌面行为
                </label>

                <div className="settings-switch-row">
                  <div className="min-w-0">
                    <p className="settings-switch-title">关闭窗口时最小化到任务栏</p>
                    <p className="settings-switch-desc">启用后点击右上角关闭不会直接退出应用。</p>
                  </div>
                  <button
                    onClick={() => setCloseToTrayOnClose((v) => !v)}
                    className={`switch-control ${closeToTrayOnClose ? 'switch-control-on' : 'switch-control-off'}`}
                    aria-label="关闭窗口时最小化到任务栏"
                  >
                    <span className={`switch-thumb ${closeToTrayOnClose ? 'translate-x-5' : ''}`}></span>
                  </button>
                </div>
              </div>

              {/* GitHub 链接 */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  开源仓库
                </label>
                <a
                  href="https://github.com/znc15/flowvision"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all duration-200"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub 仓库
                </a>
              </div>


            </div>
          )}

          {/* ===== 系统状态标签页 ===== */}
          {activeTab === 'status' && (
            <div className="space-y-6 animate-[fadeIn_200ms_ease-out]">
              {/* 后端服务状态 */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
                  后端服务
                </label>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 ghost-border-soft">
                  <div className={`w-3 h-3 rounded-full ${backendStatus === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : backendStatus === 'offline' ? 'bg-red-500' : 'bg-amber-400 animate-pulse'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">localhost:3001</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Fastify 后端服务</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${statusBadgeClass}`}>
                    {backendStatus === 'online' ? '在线' : backendStatus === 'offline' ? '离线' : '检测中'}
                  </span>
                </div>
              </div>

              {/* 连接客户端 */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
                  WebSocket 连接
                </label>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 ghost-border-soft">
                  <span className="material-symbols-outlined text-xl text-slate-400">devices</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">已连接客户端</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">前端及 MCP 客户端实时同步</p>
                  </div>
                  <span className="text-lg font-bold text-slate-700">{clientCount}</span>
                </div>
              </div>

              {/* MCP 服务 */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
                  MCP 服务
                </label>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 ghost-border-soft">
                  <span className="material-symbols-outlined text-xl text-slate-400">hub</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">MCP 端点</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">http://localhost:3001/mcp</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${statusBadgeClass}`}>
                    {backendStatus === 'online' ? '可用' : '不可用'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-all duration-200 active:scale-95"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsDialog;
