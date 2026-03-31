export async function resolveWebSocketCtor(importer = (specifier) => import(specifier)) {
  if (typeof globalThis.WebSocket === 'function') {
    return globalThis.WebSocket;
  }

  const module = await importer('ws');
  const WebSocketCtor = module.WebSocket || module.default;

  if (typeof WebSocketCtor !== 'function') {
    throw new Error('无法加载可用的 WebSocket 实现');
  }

  return WebSocketCtor;
}