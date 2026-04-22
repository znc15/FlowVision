import { useState, useEffect } from 'react';
import { useMcpStore } from '../store/mcpStore';
import type { McpServerConfig } from '../store/mcpStore';

/** MCP 服务器设置面板 */
function McpSettingsPanel() {
  const { configs, status, tools, fetchServers, fetchTools, addServer, updateServer, removeServer, connectServer, disconnectServer, testServer } = useMcpStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string; tools?: string[] } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  // 添加/编辑表单状态
  const [formName, setFormName] = useState('');
  const [formTransport, setFormTransport] = useState<'stdio' | 'sse' | 'streamable-http'>('stdio');
  const [formCommand, setFormCommand] = useState('');
  const [formArgs, setFormArgs] = useState('');
  const [formEnv, setFormEnv] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formDescription, setFormDescription] = useState('');

  useEffect(() => {
    fetchServers();
    fetchTools();
  }, [fetchServers, fetchTools]);

  const resetForm = () => {
    setFormName('');
    setFormTransport('stdio');
    setFormCommand('');
    setFormArgs('');
    setFormEnv('');
    setFormUrl('');
    setFormEnabled(true);
    setFormDescription('');
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleEdit = (config: McpServerConfig) => {
    setEditingId(config.id);
    setFormName(config.name);
    setFormTransport(config.transport);
    setFormCommand(config.stdio?.command || '');
    setFormArgs(config.stdio?.args?.join(' ') || '');
    setFormEnv(config.stdio?.env ? Object.entries(config.stdio.env).map(([k, v]) => `${k}=${v}`).join('\n') : '');
    setFormUrl(config.url || '');
    setFormEnabled(config.enabled);
    setFormDescription(config.description || '');
    setShowAddForm(true);
  };

  const handleSubmit = async () => {
    const id = editingId || `mcp-${Date.now()}`;
    const config: McpServerConfig = {
      id,
      name: formName || '未命名服务器',
      transport: formTransport,
      enabled: formEnabled,
      description: formDescription || undefined,
    };

    if (formTransport === 'stdio') {
      config.stdio = {
        command: formCommand,
        args: formArgs ? formArgs.split(/\s+/).filter(Boolean) : undefined,
        env: formEnv ? Object.fromEntries(formEnv.split('\n').filter((l) => l.includes('=')).map((l) => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })) : undefined,
      };
    } else {
      config.url = formUrl;
    }

    if (editingId) {
      await updateServer(config);
    } else {
      await addServer(config);
    }
    resetForm();
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setTestResult(null);
    try {
      const result = await testServer(id);
      setTestResult({ id, ...result });
    } catch (error: any) {
      setTestResult({ id, success: false, message: error.message });
    } finally {
      setTesting(null);
    }
  };

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'connected': return 'bg-green-100 text-green-700';
      case 'connecting': return 'bg-blue-100 text-blue-700 animate-pulse';
      case 'error': return 'bg-red-100 text-red-600';
      case 'disconnected': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'connected': return '已连接';
      case 'connecting': return '连接中';
      case 'error': return '错误';
      case 'disconnected': return '已断开';
      default: return '未启用';
    }
  };

  return (
    <div className="space-y-5 animate-[fadeIn_200ms_ease-out]">
      {/* 说明 */}
      <div className="p-4 rounded-xl bg-blue-50/50 ghost-border-soft">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-blue-500 text-lg shrink-0 mt-0.5">info</span>
          <div>
            <p className="text-xs text-blue-800 font-medium">MCP 服务器接入</p>
            <p className="text-[10px] text-blue-600/70 mt-1 leading-relaxed">
              连接外部 MCP 服务器以扩展 AI 能力，如联网搜索、代码执行等。支持 stdio（子进程）和 HTTP/SSE 传输。
            </p>
          </div>
        </div>
      </div>

      {/* 服务器列表 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">已配置服务器</label>
          <button
            onClick={() => { resetForm(); setShowAddForm(true); }}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            添加服务器
          </button>
        </div>

        {configs.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-50 text-center ghost-border-soft">
            <span className="material-symbols-outlined text-2xl text-slate-300 mb-2 block">hub</span>
            <p className="text-xs text-slate-400">尚未配置 MCP 服务器</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {configs.map((config) => {
              const serverStatus = status.find((s) => s.id === config.id);
              const serverTools = tools.find((t) => t.serverId === config.id);
              const isConnected = serverStatus?.status === 'connected';

              return (
                <div key={config.id} className="p-4 rounded-xl bg-white ghost-border-soft shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{config.name}</span>
                        {config.builtin && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">内置</span>
                        )}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${getStatusStyle(serverStatus?.status || 'disabled')}`}>
                          {getStatusLabel(serverStatus?.status || 'disabled')}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {config.transport === 'stdio' ? `stdio: ${config.stdio?.command}` : `${config.transport}: ${config.url}`}
                      </p>
                      {config.description && (
                        <p className="text-[10px] text-slate-500 mt-1">{config.description}</p>
                      )}
                      {isConnected && serverTools && serverTools.tools.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {serverTools.tools.slice(0, 6).map((tool) => (
                            <span key={tool.name} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{tool.name}</span>
                          ))}
                          {serverTools.tools.length > 6 && (
                            <span className="text-[9px] text-slate-400">+{serverTools.tools.length - 6}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleTest(config.id)}
                        disabled={testing === config.id}
                        className="icon-button-soft h-7 w-7"
                        title="测试连接"
                      >
                        <span className={`material-symbols-outlined text-sm ${testing === config.id ? 'animate-spin' : ''}`}>
                          {testing === config.id ? 'progress_activity' : 'network_check'}
                        </span>
                      </button>
                      {isConnected ? (
                        <button onClick={() => disconnectServer(config.id)} className="icon-button-soft h-7 w-7" title="断开">
                          <span className="material-symbols-outlined text-sm text-amber-500">link_off</span>
                        </button>
                      ) : (
                        <button onClick={() => connectServer(config.id)} className="icon-button-soft h-7 w-7" title="连接">
                          <span className="material-symbols-outlined text-sm text-green-500">link</span>
                        </button>
                      )}
                      {!config.builtin && (
                        <>
                          <button onClick={() => handleEdit(config)} className="icon-button-soft h-7 w-7" title="编辑">
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button onClick={() => removeServer(config.id)} className="icon-button-soft h-7 w-7 hover:text-red-500" title="删除">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </>
                      )}
                      {!config.builtin && (
                        <button onClick={() => handleEdit(config)} className="icon-button-soft h-7 w-7" title="编辑">
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {/* 测试结果 */}
                  {testResult && testResult.id === config.id && (
                    <div className={`mt-3 p-2.5 rounded-lg text-[10px] ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">{testResult.success ? 'check_circle' : 'error'}</span>
                        {testResult.message}
                      </div>
                      {testResult.tools && testResult.tools.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {testResult.tools.map((t) => (
                            <span key={t} className="px-1 py-0.5 bg-green-100 rounded text-green-600">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 添加/编辑表单 */}
      {showAddForm && (
        <div className="p-5 rounded-xl bg-slate-50 ghost-border-soft space-y-4 animate-[fadeIn_200ms_ease-out]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              {editingId ? '编辑 MCP 服务器' : '添加 MCP 服务器'}
            </h3>
            <button onClick={resetForm} className="icon-button-soft h-7 w-7">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          {/* 名称 */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">名称</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="如: GrokSearch" className="settings-input" />
          </div>

          {/* 传输类型 */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">传输类型</label>
            <div className="flex gap-2">
              {(['stdio', 'sse', 'streamable-http'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFormTransport(t)}
                  className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                    formTransport === t ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t === 'stdio' ? 'Stdio（子进程）' : t === 'sse' ? 'SSE' : 'HTTP'}
                </button>
              ))}
            </div>
          </div>

          {/* Stdio 配置 */}
          {formTransport === 'stdio' && (
            <>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">命令</label>
                <input value={formCommand} onChange={(e) => setFormCommand(e.target.value)} placeholder="如: uvx 或 node" className="settings-input" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">参数（空格分隔）</label>
                <input value={formArgs} onChange={(e) => setFormArgs(e.target.value)} placeholder="如: --from git+https://... grok-search" className="settings-input" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">环境变量（每行 KEY=VALUE）</label>
                <textarea value={formEnv} onChange={(e) => setFormEnv(e.target.value)} placeholder={"API_KEY=xxx\nMODEL=gpt-4"} rows={3} className="settings-input font-mono text-[11px]" />
              </div>
            </>
          )}

          {/* URL 配置 */}
          {(formTransport === 'sse' || formTransport === 'streamable-http') && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">服务器 URL</label>
              <input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="http://localhost:3000/mcp" className="settings-input" />
            </div>
          )}

          {/* 描述 */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">描述（可选）</label>
            <input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="服务器用途说明" className="settings-input" />
          </div>

          {/* 启用 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFormEnabled(!formEnabled)}
              className={`w-10 h-5 rounded-full transition-colors duration-200 ${formEnabled ? 'bg-primary' : 'bg-slate-300'} relative`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${formEnabled ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className="text-xs text-slate-600">启用</span>
          </div>

          {/* 提交 */}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={resetForm} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 rounded-lg transition-colors">取消</button>
            <button onClick={handleSubmit} className="px-4 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors">
              {editingId ? '更新' : '添加'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default McpSettingsPanel;
