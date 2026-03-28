import { useEffect, useRef } from 'react';
import { useGraphStore } from '../store/graphStore';
import { WsMessage } from '../types/graph';

/** 分析进度回调 */
export interface AnalyzeProgress {
  phase: string;
  percent: number;
  message?: string;
}

interface UseWebSocketOptions {
  url?: string;
  onMcpConnected?: (clientName: string) => void;
  onAnalyzeProgress?: (progress: AnalyzeProgress) => void;
  onError?: (message: string) => void;
}

const RECONNECT_DELAY_MS = 3000;

/**
 * 前端 WebSocket 同步
 * 支持 graph:replace / graph:diff / mcp:connected / analyze:progress / error
 * 具备自动断线重连能力
 */
export function useWebSocketSync({
  url = 'ws://localhost:3001/ws',
  onMcpConnected,
  onAnalyzeProgress,
  onError,
}: UseWebSocketOptions = {}) {
  const replaceGraph = useGraphStore((s) => s.replaceGraph);
  const applyDiff = useGraphStore((s) => s.applyDiff);

  // 所有回调和 store 函数均通过 ref 访问，避免 effect 重新执行触发重连
  const storeRef = useRef({ replaceGraph, applyDiff });
  storeRef.current = { replaceGraph, applyDiff };

  const callbacksRef = useRef({ onMcpConnected, onAnalyzeProgress, onError });
  callbacksRef.current = { onMcpConnected, onAnalyzeProgress, onError };

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let active = true; // 标志是否仍需要此连接

    function connect() {
      if (!active) return;

      ws = new WebSocket(url);

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);

          switch (msg.type) {
            case 'graph:replace':
              storeRef.current.replaceGraph(msg.payload);
              break;
            case 'graph:diff':
              storeRef.current.applyDiff(msg.payload);
              break;
            case 'mcp:connected':
              callbacksRef.current.onMcpConnected?.(msg.payload.clientName);
              break;
            case 'analyze:progress':
              callbacksRef.current.onAnalyzeProgress?.(msg.payload);
              break;
            case 'error':
              callbacksRef.current.onError?.(msg.payload.message);
              console.error('服务端错误:', msg.payload.message);
              break;
          }
        } catch (error) {
          console.error('WebSocket 消息解析失败:', error);
        }
      };

      ws.onerror = () => {
        // onerror 后紧跟 onclose，重连逻辑在 onclose 中统一处理
      };

      ws.onclose = () => {
        if (active) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    }

    connect();

    return () => {
      active = false;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
      }
      // 只有在非 CLOSED 状态才关闭，避免 CONNECTING 阶段触发错误
      if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
        ws.close();
      }
    };
  }, [url]); // 仅 url 变化时重建连接
}
