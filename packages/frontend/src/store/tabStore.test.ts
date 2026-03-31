import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphData } from '../types/graph';

function createLocalStorageMock() {
  const storage = new Map<string, string>();

  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
  };
}

describe('tabStore', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', createLocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('新建标签时支持携带初始图数据并自动切换过去', async () => {
    const { useTabStore } = await import('./tabStore');

    const graph: GraphData = {
      nodes: [
        {
          id: 'start-1',
          type: 'start',
          position: { x: 0, y: 0 },
          data: { label: '开始' },
        },
      ],
      edges: [],
    };

    const tabId = useTabStore.getState().addTab('AI 新画布', graph);
    const state = useTabStore.getState();
    const createdTab = state.tabs.find((tab) => tab.id === tabId);

    expect(tabId).toBeTruthy();
    expect(state.activeTabId).toBe(tabId);
    expect(createdTab?.title).toBe('AI 新画布');
    expect(createdTab?.graph).toEqual(graph);
  });
});