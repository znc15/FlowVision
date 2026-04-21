const { contextBridge, ipcRenderer } = require('electron');

function getAppVersion() {
  try {
    return ipcRenderer.sendSync('app:getVersionSync');
  } catch {
    return '1.0.0';
  }
}

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  isElectron: true,
  appVersion: getAppVersion(),
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizedChanged: (callback) => {
      const handler = (_event, value) => callback(Boolean(value));
      ipcRenderer.on('window:maximized-changed', handler);
      return () => ipcRenderer.removeListener('window:maximized-changed', handler);
    },
  },
  desktop: {
    getSettings: () => ipcRenderer.invoke('desktop:getSettings'),
    getRuntimePaths: () => ipcRenderer.invoke('desktop:getRuntimePaths'),
    capturePage: (options) => ipcRenderer.invoke('desktop:capturePage', options),
    setCloseAction: (action) => ipcRenderer.invoke('desktop:setCloseAction', action),
    setBackendHost: (host) => ipcRenderer.invoke('desktop:setBackendHost', host),
    setBackendPort: (port) => ipcRenderer.invoke('desktop:setBackendPort', port),
    loadPersistentStorage: (keys) => ipcRenderer.invoke('desktop:loadPersistentStorage', keys),
    savePersistentStorage: (entries) => ipcRenderer.invoke('desktop:savePersistentStorage', entries),
    clearPersistentStorage: (keys) => ipcRenderer.invoke('desktop:clearPersistentStorage', keys),
    onCloseActionChanged: (callback) => {
      const handler = (_event, action) => callback(action);
      ipcRenderer.on('desktop:closeAction-changed', handler);
      return () => ipcRenderer.removeListener('desktop:closeAction-changed', handler);
    },
    onCloseRequested: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('window:close-requested', handler);
      return () => ipcRenderer.removeListener('window:close-requested', handler);
    },
    respondClose: (response) => ipcRenderer.invoke('window:closeResponse', response),
  },
});
