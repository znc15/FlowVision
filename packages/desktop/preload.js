const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  isElectron: true,
  appVersion: require('./package.json').version,
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
    setCloseAction: (action) => ipcRenderer.invoke('desktop:setCloseAction', action),
    setBackendHost: (host) => ipcRenderer.invoke('desktop:setBackendHost', host),
    onCloseActionChanged: (callback) => {
      const handler = (_event, action) => callback(action);
      ipcRenderer.on('desktop:closeAction-changed', handler);
      return () => ipcRenderer.removeListener('desktop:closeAction-changed', handler);
    },
  },
});
