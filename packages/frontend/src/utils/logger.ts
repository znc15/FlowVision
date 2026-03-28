type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  detail?: unknown;
  timestamp: string;
}

const LOG_BUFFER: LogEntry[] = [];
const MAX_BUFFER_SIZE = 200;

function createEntry(level: LogLevel, message: string, detail?: unknown): LogEntry {
  return {
    level,
    message,
    detail,
    timestamp: new Date().toISOString(),
  };
}

function push(entry: LogEntry) {
  LOG_BUFFER.push(entry);
  if (LOG_BUFFER.length > MAX_BUFFER_SIZE) {
    LOG_BUFFER.shift();
  }
}

export const logger = {
  info(message: string, detail?: unknown) {
    const entry = createEntry('info', message, detail);
    push(entry);
    console.info(`[FlowVision] ${message}`, detail ?? '');
  },

  warn(message: string, detail?: unknown) {
    const entry = createEntry('warn', message, detail);
    push(entry);
    console.warn(`[FlowVision] ${message}`, detail ?? '');
  },

  error(message: string, detail?: unknown) {
    const entry = createEntry('error', message, detail);
    push(entry);
    console.error(`[FlowVision] ${message}`, detail ?? '');
  },

  /** 获取缓冲区日志（调试用） */
  getBuffer(): readonly LogEntry[] {
    return LOG_BUFFER;
  },
};

/** 初始化全局错误捕获，在 main.tsx 调用一次 */
export function initGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    logger.error('未捕获错误', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('未处理的 Promise 拒绝', {
      reason: event.reason instanceof Error ? event.reason.message : String(event.reason),
    });
  });
}
