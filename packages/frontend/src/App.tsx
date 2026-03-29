import { useState, useEffect, useCallback } from 'react';
import { Group, Panel, Separator, type Layout } from 'react-resizable-panels';
import SideNavBar from './components/SideNavBar';
import ProjectSidebar from './components/Sidebar/ProjectSidebar';
import ChatPanel from './components/Sidebar/ChatPanel';
import McpPanel from './components/Sidebar/McpPanel';
import AgentLogPanel from './components/Sidebar/AgentLogPanel';
import FileExplorer from './components/Explorer/FileExplorer';
import CodePreview from './components/CodePreview/CodePreview';
import Canvas from './components/Canvas/Canvas';
import TabBar from './components/Workbench/TabBar';
import SettingsDialog from './components/SettingsDialog';
import OnboardingGuide from './components/OnboardingGuide';
import WindowTitleBar from './components/WindowTitleBar';
import { useWebSocketSync } from './hooks/useWebSocket';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { loadSharedGraph } from './utils/share';
import { useGraphStore } from './store/graphStore';
import { useSettingsStore } from './store/settingsStore';

const LAYOUT_KEY = 'flowvision-layout';
const DEFAULT_LAYOUT: Layout = {
  sidebar: 18,
  explorer: 12,
  preview: 22,
  canvas: 48,
};

function loadLayout(): Layout | undefined {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* 忽略 */ }
  return undefined;
}

function App() {
  const [activeTab, setActiveTab] = useState<'project' | 'chat' | 'mcp' | 'log'>('project');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // 当前项目路径（从 localStorage 读取，与 FileExplorer 共享）
  const [projectPath, setProjectPath] = useState(() => {
    try { return localStorage.getItem('flowvision-project-path') || ''; } catch { return ''; }
  });

  // 监听 localStorage 变更（FileExplorer 写入时同步）
  useEffect(() => {
    const onStorage = () => {
      try {
        setProjectPath(localStorage.getItem('flowvision-project-path') || '');
      } catch { /* 忽略 */ }
    };
    window.addEventListener('storage', onStorage);
    // 每秒轮询一次（同标签页 localStorage 变更不触发 storage 事件）
    const timer = setInterval(onStorage, 1000);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(timer); };
  }, []);

  useWebSocketSync();
  useKeyboardShortcuts();

  // 非 Electron 模式下，closeAction 为 'ask' 时拦截页面关闭
  useEffect(() => {
    const isElectron = Boolean(window.electron?.isElectron);
    if (isElectron) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const { closeAction } = useSettingsStore.getState();
      if (closeAction === 'ask') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 启动时检查分享链接
  useEffect(() => {
    const shared = loadSharedGraph();
    if (shared) {
      useGraphStore.getState().replaceGraph(shared);
      window.location.hash = '';
    }
  }, []);

  const handleLayoutChanged = useCallback((layout: Layout) => {
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch { /* 忽略 */ }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background text-on-background">
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <OnboardingGuide />
      <WindowTitleBar />

      {/* 主布局容器 - 4 栏水平排列 */}
      <main className="flex flex-1 overflow-hidden bg-surface pt-10">
        {/* 第 1 栏：左侧导航栏（固定宽度，在 PanelGroup 外） */}
        <SideNavBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* 可拖拽调节宽度的面板组 */}
        <Group
          orientation="horizontal"
          defaultLayout={loadLayout() ?? DEFAULT_LAYOUT}
          onLayoutChanged={handleLayoutChanged}
        >
          {/* 第 2 栏：项目信息侧边栏 / AI 对话面板 */}
          <Panel id="sidebar" defaultSize="18%" minSize="12%" maxSize="30%">
            <aside className="h-full bg-surface-container-low flex flex-col overflow-hidden ghost-border-soft border-y-0 border-l-0">
              {activeTab === 'project' ? <ProjectSidebar /> : activeTab === 'chat' ? <ChatPanel /> : activeTab === 'log' ? <AgentLogPanel /> : <McpPanel />}
            </aside>
          </Panel>

          <Separator className="resize-handle" />

          {/* 第 3 栏：文件浏览器 */}
          <Panel id="explorer" defaultSize="12%" minSize="8%" maxSize="20%">
            <FileExplorer selectedFile={selectedFile} onFileSelect={setSelectedFile} />
          </Panel>

          <Separator className="resize-handle" />

          {/* 第 4 栏：代码预览 */}
          <Panel id="preview" defaultSize="22%" minSize="15%" maxSize="40%">
            <CodePreview
              fileName={selectedFile?.split('/').pop()}
              filePath={selectedFile || undefined}
              projectPath={projectPath || undefined}
            />
          </Panel>

          <Separator className="resize-handle" />

          {/* 第 5 栏：流程图画布 */}
          <Panel id="canvas" defaultSize="48%" minSize="25%">
            <section className="h-full bg-surface flex flex-col overflow-hidden relative">
              <TabBar />
              <Canvas />
            </section>
          </Panel>
        </Group>
      </main>
    </div>
  );
}

export default App;
