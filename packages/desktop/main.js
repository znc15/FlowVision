const { app, BrowserWindow, shell, Menu, Tray, nativeImage, ipcMain, utilityProcess, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execPath: nodeExecPath } = require('child_process');

// 禁止 Chromium 生成 BrowserMetrics-*.pma 遥测文件
app.commandLine.appendSwitch('metrics-recording-only');
app.commandLine.appendSwitch('disable-breakpad');

// 判断是否开发模式
const isDev = !app.isPackaged;

let backendProcess = null;
let mainWindow = null;
let tray = null;
let isQuitting = false;

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sanitizeDownloadFilename(filename, fallback = 'flowvision-graph.png') {
  const safeName = String(filename || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .trim();

  return safeName || fallback;
}

function getSessionDataPath() {
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, 'FlowVision', 'Session Data');
  }

  return path.join(app.getPath('userData'), 'session-data');
}

const SESSION_DATA_PATH = getSessionDataPath();
ensureDirectory(SESSION_DATA_PATH);
app.setPath('sessionData', SESSION_DATA_PATH);

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
const PERSISTENT_STORAGE_PATH = path.join(app.getPath('userData'), 'persistent-storage.json');
const DEFAULT_DESKTOP_SETTINGS = {
  closeAction: 'ask', // 'ask' | 'tray' | 'quit'
  backendHost: '127.0.0.1', // '127.0.0.1' | '0.0.0.0'
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

/** 加载持久化存储数据（日志、统计等） */
function loadPersistentStorage() {
  try {
    const raw = fs.readFileSync(PERSISTENT_STORAGE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** 保存持久化存储数据 */
function savePersistentStorage(data) {
  try {
    fs.writeFileSync(PERSISTENT_STORAGE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('保存持久化存储失败:', error);
  }
}

let desktopSettings = loadDesktopSettings();

/** 等待后端健康检查通过 */
function waitForBackendReady(port = 3001, maxRetries = 60, interval = 500) {
  const http = require('http');
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else if (attempts < maxRetries) {
          setTimeout(check, interval);
        } else {
          reject(new Error('后端启动超时'));
        }
      });
      req.on('error', () => {
        if (attempts < maxRetries) {
          setTimeout(check, interval);
        } else {
          reject(new Error('后端启动超时'));
        }
      });
      req.end();
    };
    check();
  });
}

/** 启动后端服务并等待就绪（使用 Electron 内置 Node.js 运行时） */
async function startBackend() {
  if (isDev) return; // 开发模式由 turbo 启动

  const backendDir = process.resourcesPath;
  const serverPath = path.join(process.resourcesPath, 'backend', 'server.bundle.mjs');

  console.log('[desktop] 正在启动后端服务:', serverPath);

  backendProcess = utilityProcess.fork(serverPath, [], {
    cwd: backendDir,
    env: { ...process.env, NODE_ENV: 'production', PORT: '3001', BACKEND_HOST: desktopSettings.backendHost || '127.0.0.1' },
    stdio: 'pipe',
  });

  backendProcess.stdout?.on('data', (data) => {
    console.log(`[backend] ${data}`);
  });

  backendProcess.stderr?.on('data', (data) => {
    console.error(`[backend] ${data}`);
  });

  backendProcess.on('exit', (code) => {
    console.log(`[backend] 进程退出，退出码: ${code}`);
    backendProcess = null;
  });

  // 等待后端健康检查通过
  try {
    await waitForBackendReady();
    console.log('[desktop] 后端服务已就绪');
  } catch (err) {
    console.error('[desktop] 等待后端就绪超时，继续启动前端:', err.message);
  }
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
  ipcMain.on('app:getVersionSync', (event) => {
    event.returnValue = app.getVersion();
  });

  ipcMain.handle('desktop:getRuntimePaths', () => ({
    userData: app.getPath('userData'),
    sessionData: app.getPath('sessionData'),
    downloads: app.getPath('downloads'),
  }));

  ipcMain.handle('desktop:capturePage', async (_event, options = {}) => {
    const win = getAliveMainWindow();
    if (!win) {
      throw new Error('主窗口不可用，无法导出 PNG');
    }

    const rect = {
      x: Math.max(0, Math.round(Number(options.x) || 0)),
      y: Math.max(0, Math.round(Number(options.y) || 0)),
      width: Math.max(1, Math.round(Number(options.width) || 0)),
      height: Math.max(1, Math.round(Number(options.height) || 0)),
    };

    const filename = sanitizeDownloadFilename(options.filename, 'flowvision-graph.png');
    const downloadDir = app.getPath('downloads');
    ensureDirectory(downloadDir);
    const filePath = path.join(downloadDir, filename);

    const image = await win.capturePage(rect);
    fs.writeFileSync(filePath, image.toPNG());

    const stats = fs.statSync(filePath);
    const size = image.getSize();

    return {
      path: filePath,
      width: size.width,
      height: size.height,
      size: stats.size,
    };
  });

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

  // 持久化存储 IPC：将关键数据存储到 userData 目录（重新安装不丢失）
  ipcMain.handle('desktop:loadPersistentStorage', (_event, keys) => {
    const data = loadPersistentStorage();
    const result = {};
    for (const key of keys) {
      if (key in data) result[key] = data[key];
    }
    return result;
  });

  ipcMain.handle('desktop:savePersistentStorage', (_event, entries) => {
    const data = loadPersistentStorage();
    for (const [key, value] of Object.entries(entries)) {
      data[key] = value;
    }
    savePersistentStorage(data);
    return true;
  });

  ipcMain.handle('desktop:clearPersistentStorage', (_event, keys) => {
    if (!keys || keys.length === 0) {
      savePersistentStorage({});
    } else {
      const data = loadPersistentStorage();
      for (const key of keys) {
        delete data[key];
      }
      savePersistentStorage(data);
    }
    return true;
  });

  ipcMain.handle('desktop:setCloseAction', (_event, action) => {
    const valid = ['ask', 'tray', 'quit'];
    if (!valid.includes(action)) return desktopSettings;
    desktopSettings = { ...desktopSettings, closeAction: action };
    saveDesktopSettings(desktopSettings);
    return desktopSettings;
  });

  ipcMain.handle('desktop:setBackendHost', (_event, host) => {
    const valid = ['127.0.0.1', '0.0.0.0'];
    if (!valid.includes(host)) return desktopSettings;
    desktopSettings = { ...desktopSettings, backendHost: host };
    saveDesktopSettings(desktopSettings);
    return desktopSettings;
  });

  ipcMain.handle('window:closeResponse', (_event, { action, remember }) => {
    const win = getAliveMainWindow();
    if (!win) return;

    if (action === 'cancel') return;

    const chosenAction = action === 'tray' ? 'tray' : 'quit';

    if (remember) {
      desktopSettings = { ...desktopSettings, closeAction: chosenAction };
      saveDesktopSettings(desktopSettings);
      win.webContents.send('desktop:closeAction-changed', chosenAction);
    }

    if (chosenAction === 'tray') {
      win.hide();
    } else {
      isQuitting = true;
      app.quit();
    }
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
    if (isQuitting) return;

    const action = desktopSettings.closeAction || 'ask';

    if (action === 'tray') {
      event.preventDefault();
      win.hide();
      return;
    }

    if (action === 'quit') {
      isQuitting = true;
      app.quit();
      return;
    }

    // action === 'ask'：通知前端显示美化关闭对话框
    event.preventDefault();
    win.webContents.send('window:close-requested');
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

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  setupIpc();
  await startBackend();
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
