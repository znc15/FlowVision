import { spawn, spawnSync } from 'node:child_process';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, '..');
const artifactsDir = path.join(desktopRoot, 'smoke-artifacts');

function log(message) {
  console.log(`[desktop-smoke] ${message}`);
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('无法获取空闲端口'));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on('error', reject);
  });
}

async function waitFor(check, { timeout = 30000, interval = 200, label = '条件' } = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    const result = await check();
    if (result) return result;
    await delay(interval);
  }

  throw new Error(`${label}等待超时（${timeout}ms）`);
}

function getDefaultExecutablePath() {
  if (process.platform === 'win32') {
    return path.join(desktopRoot, 'dist', 'win-unpacked', 'FlowVision.exe');
  }

  throw new Error('当前 smoke 脚本仅支持 Windows 桌面端，请通过 FLOWVISION_DESKTOP_EXE 指定可执行文件并自行扩展平台逻辑');
}

function ensureArrayBufferString(data) {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  return Buffer.from(data).toString('utf8');
}

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.socket = null;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.socket = new WebSocket(this.webSocketUrl);

    await new Promise((resolve, reject) => {
      const onOpen = () => resolve();
      const onError = (event) => reject(event.error || new Error('CDP WebSocket 连接失败'));

      this.socket.addEventListener('open', onOpen, { once: true });
      this.socket.addEventListener('error', onError, { once: true });
    });

    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(ensureArrayBufferString(event.data));
      if (!message.id) return;

      const handlers = this.pending.get(message.id);
      if (!handlers) return;

      this.pending.delete(message.id);
      if (message.error) {
        handlers.reject(new Error(message.error.message || 'CDP 请求失败'));
        return;
      }

      handlers.resolve(message.result);
    });

    this.socket.addEventListener('close', () => {
      for (const { reject } of this.pending.values()) {
        reject(new Error('CDP 连接已关闭'));
      }
      this.pending.clear();
    });
  }

  async send(method, params = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error(`CDP 连接未就绪，无法发送 ${method}`);
    }

    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });

    const response = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });

    this.socket.send(payload);
    return response;
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });

    if (result.exceptionDetails) {
      const exceptionMessage = result.exceptionDetails.exception?.description
        || result.exceptionDetails.exception?.value
        || result.exceptionDetails.text
        || '页面脚本执行失败';
      throw new Error(String(exceptionMessage));
    }

    return result.result?.value;
  }

  async close() {
    if (!this.socket) return;
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }
}

async function waitForDebuggerTarget(port) {
  return waitFor(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (!response.ok) return null;

      const targets = await response.json();
      return targets.find((target) => target.type === 'page' && typeof target.webSocketDebuggerUrl === 'string');
    } catch {
      return null;
    }
  }, { timeout: 45000, interval: 300, label: 'Electron 调试目标' });
}

async function waitForUiReady(cdp) {
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.bringToFront');

  await waitFor(async () => {
    try {
      return await cdp.evaluate(`(() => {
        return document.readyState === 'complete'
          && Boolean(document.querySelector('button[title="分享"]'))
          && Boolean(document.querySelector('button[title="AI 对话"]'));
      })()`);
    } catch {
      return false;
    }
  }, { timeout: 45000, interval: 250, label: '主界面初始化' });

  const dismissed = await cdp.evaluate(`(() => {
    const skipButton = [...document.querySelectorAll('button')].find((button) => {
      const text = button.textContent?.trim();
      return text === '跳过';
    });
    if (!skipButton) return false;
    skipButton.click();
    return true;
  })()`);

  if (dismissed) {
    await delay(300);
  }
}

async function clickButtonByTitle(cdp, title) {
  const clicked = await cdp.evaluate(`(() => {
    const button = document.querySelector(${JSON.stringify(`button[title="${title}"]`)});
    if (!button) return false;
    button.click();
    return true;
  })()`);

  if (!clicked) {
    throw new Error(`未找到标题为“${title}”的按钮`);
  }
}

async function runShareSmoke(cdp) {
  log('开始验证分享弹窗居中');
  await clickButtonByTitle(cdp, '分享');

  const metrics = await waitFor(async () => {
    try {
      return await cdp.evaluate(`(() => {
        const heading = [...document.querySelectorAll('h3')].find((element) => element.textContent?.trim() === '分享流程图');
        if (!heading) return null;

        const dialog = heading.closest('div.relative');
        if (!dialog) return null;

        const rect = dialog.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        };
      })()`);
    } catch {
      return null;
    }
  }, { timeout: 10000, interval: 150, label: '分享弹窗' });

  const dialogCenterX = metrics.left + metrics.width / 2;
  const dialogCenterY = metrics.top + metrics.height / 2;
  const viewportCenterX = metrics.viewportWidth / 2;
  const viewportCenterY = metrics.viewportHeight / 2;

  if (Math.abs(dialogCenterX - viewportCenterX) > 24 || Math.abs(dialogCenterY - viewportCenterY) > 32) {
    throw new Error(`分享弹窗未居中：dialog=(${dialogCenterX.toFixed(1)}, ${dialogCenterY.toFixed(1)}) viewport=(${viewportCenterX.toFixed(1)}, ${viewportCenterY.toFixed(1)})`);
  }

  await cdp.evaluate(`(() => {
    const overlay = [...document.querySelectorAll('div')].find((element) => {
      return typeof element.className === 'string'
        && element.className.includes('fixed inset-0')
        && element.textContent?.includes('分享流程图');
    });

    if (!overlay) return false;
    overlay.click();
    return true;
  })()`);

  log('分享弹窗位置验证通过');
}

async function installAiMock(cdp) {
  await cdp.evaluate(`(() => {
    if (window.__flowvisionSmokeMockInstalled) return true;

    const originalFetch = window.fetch.bind(window);
    const encoder = new TextEncoder();
    const diff = {
      add: {
        nodes: [
          {
            id: 'smoke-node-1',
            type: 'process',
            position: { x: 180, y: 120 },
            data: { label: 'Smoke 节点' },
          },
        ],
        edges: [],
      },
      update: { nodes: [], edges: [] },
      remove: { nodeIds: [], edgeIds: [] },
    };

    window.fetch = async (input, init) => {
      const url = typeof input === 'string'
        ? input
        : input instanceof Request
        ? input.url
        : String(input);

      if (url.includes('/api/ai/generate-stream')) {
        const stream = new ReadableStream({
          start(controller) {
            const events = [
              { type: 'chunk', text: '正在生成新画布流程图...' },
              { type: 'done', diff },
            ];

            events.forEach((event, index) => {
              setTimeout(() => {
                controller.enqueue(encoder.encode('data: ' + JSON.stringify(event) + '\\n\\n'));
                if (index === events.length - 1) {
                  controller.close();
                }
              }, index * 80);
            });
          },
        });

        return new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        });
      }

      return originalFetch(input, init);
    };

    window.__flowvisionSmokeMockInstalled = true;
    return true;
  })()`);
}

async function runNewCanvasSmoke(cdp) {
  log('开始验证 AI 新画布流程');
  await clickButtonByTitle(cdp, 'AI 对话');

  await waitFor(async () => {
    try {
      return await cdp.evaluate(`(() => document.querySelector('h2')?.textContent?.trim() === 'AI 对话')()`);
    } catch {
      return false;
    }
  }, { timeout: 10000, interval: 150, label: 'AI 对话面板' });

  await installAiMock(cdp);
  await clickButtonByTitle(cdp, '本次结果输出到新建画布标签页');

  const submitted = await cdp.evaluate(`(() => new Promise((resolve) => {
    const input = document.querySelector('input[placeholder*="描述需求"]');
    if (!input) {
      resolve(false);
      return;
    }

    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (!setter) {
      resolve(false);
      return;
    }

    input.focus();
    setter.call(input, '自动化 smoke 新画布回归验证');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    requestAnimationFrame(() => {
      const sendButton = [...document.querySelectorAll('button')].find((button) => {
        return button.querySelector('.material-symbols-outlined')?.textContent?.trim() === 'send';
      });

      if (!sendButton) {
        resolve(false);
        return;
      }

      sendButton.click();
      resolve(true);
    });
  }))()`);

  if (!submitted) {
    throw new Error('无法提交 AI 新画布请求');
  }

  const tabSnapshot = await waitFor(async () => {
    try {
      return await cdp.evaluate(`(() => {
        const raw = localStorage.getItem('flowvision-tabs');
        if (!raw) return null;

        const data = JSON.parse(raw);
        if (!Array.isArray(data.tabs) || data.tabs.length < 2) return null;

        const activeTab = data.tabs.find((tab) => tab.id === data.activeTabId);
        if (!activeTab || typeof activeTab.title !== 'string' || !activeTab.title.startsWith('AI · ')) {
          return null;
        }

        const nodeCount = Array.isArray(activeTab.graph?.nodes) ? activeTab.graph.nodes.length : 0;
        const edgeCount = Array.isArray(activeTab.graph?.edges) ? activeTab.graph.edges.length : 0;

        if (nodeCount < 1) return null;

        return {
          tabCount: data.tabs.length,
          activeTitle: activeTab.title,
          nodeCount,
          edgeCount,
        };
      })()`);
    } catch {
      return null;
    }
  }, { timeout: 15000, interval: 200, label: 'AI 新画布结果' });

  log(`AI 新画布验证通过，当前标签：${tabSnapshot.activeTitle}，节点数：${tabSnapshot.nodeCount}`);
}

async function captureFailureScreenshot(cdp) {
  if (!cdp) return null;

  try {
    const result = await cdp.send('Page.captureScreenshot', { format: 'png' });
    await mkdir(artifactsDir, { recursive: true });
    const screenshotPath = path.join(artifactsDir, `desktop-smoke-failure-${Date.now()}.png`);
    await writeFile(screenshotPath, result.data, 'base64');
    return screenshotPath;
  } catch {
    return null;
  }
}

function terminateProcess(childProcess) {
  if (!childProcess?.pid) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(childProcess.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }

  childProcess.kill('SIGTERM');
}

async function main() {
  const executablePath = process.env.FLOWVISION_DESKTOP_EXE || getDefaultExecutablePath();
  const executableStat = await stat(executablePath).catch(() => null);

  if (!executableStat?.isFile()) {
    throw new Error(`未找到桌面端可执行文件：${executablePath}`);
  }

  const debuggingPort = await getFreePort();
  const tempRoot = path.join(os.tmpdir(), `flowvision-desktop-smoke-${Date.now()}`);
  await mkdir(tempRoot, { recursive: true });

  log(`启动桌面应用：${executablePath}`);
  const childProcess = spawn(executablePath, [`--remote-debugging-port=${debuggingPort}`], {
    cwd: path.dirname(executablePath),
    env: {
      ...process.env,
      APPDATA: tempRoot,
      LOCALAPPDATA: tempRoot,
      TEMP: tempRoot,
      TMP: tempRoot,
    },
    stdio: 'ignore',
    windowsHide: true,
  });

  let cdp = null;

  try {
    const target = await waitForDebuggerTarget(debuggingPort);
    cdp = new CdpClient(target.webSocketDebuggerUrl);
    await cdp.connect();
    await waitForUiReady(cdp);
    await runShareSmoke(cdp);
    await runNewCanvasSmoke(cdp);
    log('桌面端 smoke 全部通过');
  } catch (error) {
    const screenshotPath = await captureFailureScreenshot(cdp);
    if (screenshotPath) {
      console.error(`[desktop-smoke] 已保存失败截图：${screenshotPath}`);
    }
    throw error;
  } finally {
    await cdp?.close().catch(() => undefined);
    terminateProcess(childProcess);
    await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(`[desktop-smoke] 失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});