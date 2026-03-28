const { contextBridge } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  isElectron: true,
  appVersion: require('./package.json').version,
});
