import { useSettingsStore } from '../store/settingsStore';

/** 获取后端 API 基础 URL */
export function getBackendUrl(): string {
  const port = useSettingsStore.getState().backendPort || 3001;
  return `http://127.0.0.1:${port}`;
}
