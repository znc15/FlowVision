import { GraphNode, GraphEdge, GraphData } from '../types/graph';

/**
 * 图状态管理单例
 * 在后端进程内存中维护当前的流程图状态
 * 供 HTTP API 和 MCP Server 共享访问
 */
class GraphState {
  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];

  /**
   * 获取完整的图数据
   */
  getGraph(): GraphData {
    return {
      nodes: [...this.nodes],
      edges: [...this.edges],
    };
  }

  /**
   * 替换整个图
   */
  setGraph(graph: GraphData): void {
    this.nodes = [...graph.nodes];
    this.edges = [...graph.edges];
  }

  /**
   * 添加节点
   */
  addNode(node: GraphNode): void {
    this.nodes.push(node);
  }

  /**
   * 删除节点（同时删除关联的边）
   */
  removeNode(nodeId: string): void {
    this.nodes = this.nodes.filter((n) => n.id !== nodeId);
    this.edges = this.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
  }

  /**
   * 更新节点
   */
  updateNode(nodeId: string, data: Partial<GraphNode>): GraphNode | null {
    const index = this.nodes.findIndex((n) => n.id === nodeId);
    if (index === -1) return null;

    this.nodes[index] = { ...this.nodes[index], ...data };
    return this.nodes[index];
  }

  /**
   * 添加边
   */
  addEdge(edge: GraphEdge): void {
    this.edges.push(edge);
  }

  /**
   * 删除边
   */
  removeEdge(edgeId: string): void {
    this.edges = this.edges.filter((e) => e.id !== edgeId);
  }

  /**
   * 清空图
   */
  clear(): void {
    this.nodes = [];
    this.edges = [];
  }
}

// 导出单例实例
export const graphState = new GraphState();
