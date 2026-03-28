const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn, execPath: nodeExecPath } = require('child_process');

// 判断是否开发模式
const isDev = !app.isPackaged;

let backendProcess = null;

/** 查找 Node.js 可执行路径（Electron 内置的 node 不适合直接跑服务端） */
function getNodePath() {
  // 优先使用 Electron 自带的 node（electron 打包后 process.execPath 是 electron 自身）
  // 用 child_process 的 execPath 获取底层 node
  if (process.platform === 'win32') {
    // Windows: 查找同目录下的 node.exe 或使用 PATH 中的 node
    const electronDir = path.dirname(app.getPath('exe'));
    const localNode = path.join(electronDir, 'node.exe');
    try {
      require('fs').accessSync(localNode);
      return localNode;
    } catch {
      return 'node'; // 退回系统 PATH
    }
  }
  return 'node';
}

/** 启动后端服务 */
function startBackend() {
  if (isDev) return; // 开发模式由 turbo 启动

  const backendDir = path.join(process.resourcesPath, 'backend');
  const serverPath = path.join(backendDir, 'dist', 'server.js');

  backendProcess = spawn(getNodePath(), [serverPath], {
    cwd: backendDir,
    env: { ...process.env, NODE_ENV: 'production', PORT: '3001' },
    stdio: 'pipe',
  });

  backendProcess.stdout?.on('data', (data) => {
    console.log(`[backend] ${data}`);
  });

  backendProcess.stderr?.on('data', (data) => {
    console.error(`[backend] ${data}`);
  });

  backendProcess.on('error', (err) => {
    console.error('后端启动失败:', err);
  });
}

/** 停止后端服务 */
function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'FlowVision',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 外部链接在系统浏览器打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    // 开发模式加载 Vite dev server
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    // 生产模式加载构建产物
    const frontendPath = path.join(process.resourcesPath, 'frontend', 'dist', 'index.html');
    win.loadFile(frontendPath);
  }
}

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopBackend();
});
