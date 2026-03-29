const { app, BrowserWindow, shell, Menu, Tray, nativeImage, ipcMain, utilityProcess, dialog } = require('electron');
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
  closeAction: 'ask', // 'ask' | 'minimize' | 'quit'
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

  ipcMain.handle('desktop:setCloseAction', (_event, action) => {
    const valid = ['ask', 'minimize', 'quit'];
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

  win.on('close', async (event) => {
    if (isQuitting) return;

    const action = desktopSettings.closeAction || 'ask';

    if (action === 'minimize') {
      event.preventDefault();
      win.minimize();
      return;
    }

    if (action === 'quit') {
      isQuitting = true;
      app.quit();
      return;
    }

    // action === 'ask'：弹出询问对话框
    event.preventDefault();
    const { response, checkboxChecked } = await dialog.showMessageBox(win, {
      type: 'question',
      title: '关闭窗口',
      message: '你想要退出应用还是最小化到任务栏？',
      buttons: ['最小化', '退出应用', '取消'],
      defaultId: 0,
      cancelId: 2,
      checkboxLabel: '记住我的选择',
      checkboxChecked: false,
    });

    if (response === 2) return; // 取消

    const chosenAction = response === 0 ? 'minimize' : 'quit';

    if (checkboxChecked) {
      desktopSettings = { ...desktopSettings, closeAction: chosenAction };
      saveDesktopSettings(desktopSettings);
    }

    if (chosenAction === 'minimize') {
      win.minimize();
    } else {
      isQuitting = true;
      app.quit();
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
