import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createIdleStreamTimeout } from './streamTimeout';

describe('createIdleStreamTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('在空闲超时后中断请求', () => {
    const timeout = createIdleStreamTimeout(1000);

    expect(timeout.signal.aborted).toBe(false);

    vi.advanceTimersByTime(999);
    expect(timeout.signal.aborted).toBe(false);

    vi.advanceTimersByTime(1);
    expect(timeout.signal.aborted).toBe(true);

    timeout.dispose();
  });

  it('收到新数据时重置超时窗口', () => {
    const timeout = createIdleStreamTimeout(1000);

    vi.advanceTimersByTime(900);
    timeout.touch();

    vi.advanceTimersByTime(900);
    expect(timeout.signal.aborted).toBe(false);

    vi.advanceTimersByTime(100);
    expect(timeout.signal.aborted).toBe(true);

    timeout.dispose();
  });

  it('释放后不再触发中断', () => {
    const timeout = createIdleStreamTimeout(1000);

    timeout.dispose();
    vi.advanceTimersByTime(1000);

    expect(timeout.signal.aborted).toBe(false);
  });
});