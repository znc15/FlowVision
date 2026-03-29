export interface IdleStreamTimeoutController {
  signal: AbortSignal;
  touch: () => void;
  dispose: () => void;
}

/**
 * 为长时间流式请求提供空闲超时，而不是固定总时长超时。
 * 只要持续收到数据，就会重置计时器，避免把慢任务误判为失败。
 */
export function createIdleStreamTimeout(timeoutMs: number): IdleStreamTimeoutController {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const touch = () => {
    clearTimer();
    timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
  };

  const dispose = () => {
    clearTimer();
  };

  touch();

  return {
    signal: controller.signal,
    touch,
    dispose,
  };
}