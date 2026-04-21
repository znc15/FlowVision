/**
 * 自动备份工具
 * 支持定时备份到本地文件或 WebDAV
 */
import { useSettingsStore } from '../store/settingsStore';
import { useGraphStore } from '../store/graphStore';
import { createBackupData, backupToWebDAV } from './export';
import { getBackendUrl } from './backend';

let autoBackupTimer: ReturnType<typeof setInterval> | null = null;

/** 执行备份 */
async function performBackup(): Promise<{ success: boolean; message: string }> {
  const settings = useSettingsStore.getState();
  const graph = useGraphStore.getState();

  if (settings.autoBackupMode === 'webdav') {
    const { url, username, password, path } = settings.autoBackupWebDAV;
    if (!url) {
      return { success: false, message: 'WebDAV 地址未配置' };
    }
    return backupToWebDAV({ nodes: graph.nodes, edges: graph.edges }, { url, username, password, path });
  } else {
    // 本地备份通过后端 API 写入文件
    const backupData = createBackupData({ nodes: graph.nodes, edges: graph.edges });
    try {
      const res = await fetch(`${getBackendUrl()}/api/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: backupData,
          path: settings.autoBackupLocalPath || undefined,
        }),
      });
      const result = await res.json();
      if (result.success) {
        return { success: true, message: `备份已保存到 ${result.path}` };
      }
      return { success: false, message: result.error || '备份失败' };
    } catch (err) {
      return { success: false, message: `备份失败：${err instanceof Error ? err.message : '未知错误'}` };
    }
  }
}

/** 启动自动备份定时器 */
export function startAutoBackup(): void {
  stopAutoBackup();

  const settings = useSettingsStore.getState();
  if (!settings.autoBackupEnabled) return;

  const intervalMs = Math.max(1, settings.autoBackupInterval) * 60 * 1000;

  autoBackupTimer = setInterval(async () => {
    const result = await performBackup();
    if (result.success) {
      console.log('[AutoBackup]', result.message);
    } else {
      console.error('[AutoBackup]', result.message);
    }
  }, intervalMs);

  console.log(`[AutoBackup] 已启动，间隔 ${settings.autoBackupInterval} 分钟`);
}

/** 停止自动备份定时器 */
export function stopAutoBackup(): void {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
    autoBackupTimer = null;
    console.log('[AutoBackup] 已停止');
  }
}

/** 重启自动备份（配置变更时调用） */
export function restartAutoBackup(): void {
  stopAutoBackup();
  startAutoBackup();
}

/** 立即执行一次备份 */
export async function triggerBackupNow(): Promise<{ success: boolean; message: string }> {
  return performBackup();
}
