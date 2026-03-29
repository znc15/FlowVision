const { app, BrowserWindow, shell, Menu, Tray, nativeImage, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execPath: nodeExecPath } = require('child_process');

// 判断是否开发模式
const isDev = !app.isPackaged;

let backendProcess = null;
let mainWindow = null;
let tray = null;
let isQuitting = false;

function getAliveMainWindow() {
  if (!mainWindow) return null;
  if (mainWindow.isDestroyed()) {
    mainWindow = null;
    return null;
  }
  return mainWindow;
}

function showOrCreateMainWindow() {
  const win = getAliveMainWindow();
  if (win) {
    if (win.isMinimized()) {
      win.restore();
    } else {
      win.show();
    }
    win.focus();
    return;
  }
  createWindow();
}

const DESKTOP_SETTINGS_PATH = path.join(app.getPath('userData'), 'desktop-settings.json');
const DEFAULT_DESKTOP_SETTINGS = {
  closeToTray: true,
};

function loadDesktopSettings() {
  try {
    const raw = fs.readFileSync(DESKTOP_SETTINGS_PATH, 'utf8');
    return { ...DEFAULT_DESKTOP_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_DESKTOP_SETTINGS };
  }
}

function saveDesktopSettings(next) {
  try {
    fs.writeFileSync(DESKTOP_SETTINGS_PATH, JSON.stringify(next, null, 2), 'utf8');
  } catch (error) {
    console.error('保存桌面设置失败:', error);
  }
}

let desktopSettings = loadDesktopSettings();

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

function getTrayIconPath() {
  if (isDev) {
    return path.join(__dirname, '..', '..', 'logo', 'logo_32.png');
  }
  return path.join(process.resourcesPath, 'logo', 'logo_32.png');
}

function createTray() {
  if (tray) return;

  const iconPath = getTrayIconPath();
  if (!fs.existsSync(iconPath)) return;

  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('FlowVision');
  tray.on('double-click', () => {
    showOrCreateMainWindow();
  });
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => {
          showOrCreateMainWindow();
        },
      },
      {
        label: '退出',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
}

function setupIpc() {
  ipcMain.handle('window:minimize', () => {
    const win = getAliveMainWindow();
    if (win) win.minimize();
  });

  ipcMain.handle('window:toggleMaximize', () => {
    const win = getAliveMainWindow();
    if (!win) return false;
    if (win.isMaximized()) {
      win.unmaximize();
      return false;
    }
    win.maximize();
    return true;
  });

  ipcMain.handle('window:close', () => {
    const win = getAliveMainWindow();
    if (win) win.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    const win = getAliveMainWindow();
    return Boolean(win && win.isMaximized());
  });

  ipcMain.handle('desktop:getSettings', () => desktopSettings);

  ipcMain.handle('desktop:setCloseToTray', (_event, enabled) => {
    desktopSettings = { ...desktopSettings, closeToTray: Boolean(enabled) };
    saveDesktopSettings(desktopSettings);
    return desktopSettings;
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'FlowVision',
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow = win;

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  win.on('maximize', () => {
    win.webContents.send('window:maximized-changed', true);
  });

  win.on('unmaximize', () => {
    win.webContents.send('window:maximized-changed', false);
  });

  win.on('close', (event) => {
    if (!isQuitting && desktopSettings.closeToTray) {
      event.preventDefault();
      if (!win.isMinimized()) {
        win.minimize();
      }
    }
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
  Menu.setApplicationMenu(null);
  setupIpc();
  startBackend();
  createTray();
  createWindow();
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  stopBackend();
});
