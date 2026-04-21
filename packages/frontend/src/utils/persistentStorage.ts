/**
 * 持久化存储工具。
 * 在 Electron 环境中将数据保存到 userData 目录（重新安装不丢失），
 * 在浏览器环境中降级到 localStorage。
 */

const PERSIST_KEYS = [
  'flowvision-logs',
  'flowvision-settings',
  'flowvision-project-overview',
  'flowvision-ai-usage-stats',
];

/** 是否在 Electron 环境中 */
function isElectron(): boolean {
  return Boolean(window.electron?.isElectron);
}

/** 从持久化存储加载数据 */
export async function loadPersistentData(): Promise<Record<string, any>> {
  if (!isElectron()) {
    // 浏览器环境：直接从 localStorage 读取
    const result: Record<string, any> = {};
    for (const key of PERSIST_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) result[key] = JSON.parse(raw);
      } catch { /* 忽略 */ }
    }
    return result;
  }

  try {
    return await (window as any).electron.desktop.loadPersistentStorage(PERSIST_KEYS);
  } catch {
    // 降级到 localStorage
    const result: Record<string, any> = {};
    for (const key of PERSIST_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) result[key] = JSON.parse(raw);
      } catch { /* 忽略 */ }
    }
    return result;
  }
}

/** 保存数据到持久化存储 */
export async function savePersistentData(entries: Record<string, any>): Promise<boolean> {
  // 同时写入 localStorage（作为即时缓存）
  for (const [key, value] of Object.entries(entries)) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* 忽略 */ }
  }

  if (!isElectron()) return true;

  try {
    return await (window as any).electron.desktop.savePersistentStorage(entries);
  } catch {
    return false;
  }
}

/** 清除指定的持久化数据 */
export async function clearPersistentData(keys?: string[]): Promise<boolean> {
  if (keys) {
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  }

  if (!isElectron()) return true;

  try {
    return await (window as any).electron.desktop.clearPersistentStorage(keys);
  } catch {
    return false;
  }
}

/**
 * 启动时从持久化存储恢复数据到 localStorage。
 * 这是关键步骤：确保 Electron 重新安装后数据不丢失。
 */
export async function restorePersistentData(): Promise<void> {
  if (!isElectron()) return;

  try {
    const data = await loadPersistentData();
    for (const [key, value] of Object.entries(data)) {
      try {
        // 只在 localStorage 没有该数据时写入（避免覆盖更新的本地数据）
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, JSON.stringify(value));
        }
      } catch { /* 忽略 */ }
    }
  } catch { /* 忽略 */ }
}

/** 定期将 localStorage 中的关键数据同步到持久化存储 */
export function startAutoSync(intervalMs = 30000): () => void {
  let stopped = false;

  const sync = async () => {
    if (stopped) return;

    const entries: Record<string, any> = {};
    for (const key of PERSIST_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) entries[key] = JSON.parse(raw);
      } catch { /* 忽略 */ }
    }

    if (Object.keys(entries).length > 0) {
      await savePersistentData(entries);
    }
  };

  // 立即同步一次
  sync();
  const timer = setInterval(sync, intervalMs);

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
