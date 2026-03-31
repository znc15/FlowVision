import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { resolveWebSocketCtor } from './websocket.mjs';

const originalWebSocket = globalThis.WebSocket;

afterEach(() => {
  if (typeof originalWebSocket === 'undefined') {
    delete globalThis.WebSocket;
    return;
  }

  globalThis.WebSocket = originalWebSocket;
});

describe('resolveWebSocketCtor', () => {
  it('优先复用全局 WebSocket 构造器', async () => {
    const FakeWebSocket = class FakeWebSocket {};
    globalThis.WebSocket = FakeWebSocket;

    const resolved = await resolveWebSocketCtor(async () => {
      throw new Error('不应走到模块回退');
    });

    assert.equal(resolved, FakeWebSocket);
  });

  it('在没有全局 WebSocket 时回退到 ws 模块', async () => {
    delete globalThis.WebSocket;
    const FakeWebSocket = class FakeWebSocket {};

    const resolved = await resolveWebSocketCtor(async () => ({ WebSocket: FakeWebSocket }));

    assert.equal(resolved, FakeWebSocket);
  });
});