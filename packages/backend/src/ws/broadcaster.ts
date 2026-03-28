import { WebSocket } from 'ws';
import { WsMessage } from '../types/graph';

/**
 * WebSocket 广播器
 * 管理所有连接的 WebSocket 客户端，并广播消息
 */
class Broadcaster {
  private clients: Set<WebSocket> = new Set();

  /**
   * 添加客户端连接
   */
  addClient(ws: WebSocket): void {
    this.clients.add(ws);

    ws.on('close', () => {
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket 错误:', error);
      this.clients.delete(ws);
    });
  }

  /**
   * 广播消息给所有连接的客户端
   */
  broadcast(message: WsMessage): void {
    const data = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  /**
   * 获取当前连接数
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * 关闭所有连接
   */
  closeAll(): void {
    this.clients.forEach((client) => {
      client.close();
    });
    this.clients.clear();
  }
}

// 导出单例实例
export const broadcaster = new Broadcaster();
