import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { broadcaster } from '../ws/broadcaster.js';
import { GraphDiff } from '../types/graph.js';
import { applyDiffTool } from './tools/applyDiff.js';
import { addNodeTool } from './tools/addNode.js';
import { connectNodesTool } from './tools/connectNodes.js';
import { getGraphTool } from './tools/getGraph.js';
import { removeNodeTool } from './tools/removeNode.js';
import { updateNodeTool } from './tools/updateNode.js';
import { batchConnectNodesTool } from './tools/batchConnectNodes.js';
import { autoLayoutTool } from './tools/autoLayout.js';
import { cloneNodeTool } from './tools/cloneNode.js';
import { graphState } from '../state/graphState.js';

const ALL_NODE_TYPES = z.enum([
  'process', 'decision', 'start', 'end', 'data', 'group', 'subprocess', 'delay',
  'document', 'manual_input', 'annotation', 'connector', 'preparation', 'merge', 'timer', 'queue',
  'entity', 'attribute', 'relationship', 'database',
  'function_block', 'input_output', 'control', 'mechanism',
  'actor', 'usecase_item', 'system_boundary',
  'lifeline', 'activation', 'combined_fragment',
  'class', 'interface', 'enum_node',
  'state', 'initial_state', 'final_state', 'choice',
  'fork_join', 'swimlane', 'note',
]);

const server = new McpServer({
  name: 'flowvision-mcp',
  version: '0.1.0',
});

server.tool('get_graph', '获取当前完整流程图结构', {}, async () => {
  const result = await getGraphTool();
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result.graph, null, 2),
      },
    ],
  };
});

server.tool(
  'add_node',
  '向流程图中添加一个新节点',
  {
    id: z.string(),
    type: ALL_NODE_TYPES,
    label: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
  },
  async (input) => {
    const result = await addNodeTool(input);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.graph, null, 2),
        },
      ],
    };
  }
);

server.tool(
  'remove_node',
  '删除一个节点，并级联删除关联边',
  {
    nodeId: z.string(),
  },
  async ({ nodeId }) => {
    const result = await removeNodeTool(nodeId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.graph, null, 2),
        },
      ],
    };
  }
);

server.tool(
  'connect_nodes',
  '在两个节点之间创建连线',
  {
    id: z.string(),
    source: z.string(),
    target: z.string(),
    label: z.string().optional(),
    type: z.enum(['default', 'step', 'smoothstep', 'straight']).optional(),
  },
  async (input) => {
    const result = await connectNodesTool(input);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.graph, null, 2),
        },
      ],
    };
  }
);

server.tool(
  'apply_diff',
  '批量应用 GraphDiff 到当前流程图',
  {
    diff: z.object({
      add: z.object({
        nodes: z.array(z.any()),
        edges: z.array(z.any()),
      }),
      update: z.object({
        nodes: z.array(z.any()),
        edges: z.array(z.any()),
      }),
      remove: z.object({
        nodeIds: z.array(z.string()),
        edgeIds: z.array(z.string()),
      }),
    }),
  },
  async ({ diff }) => {
    const result = await applyDiffTool(diff as GraphDiff);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.graph, null, 2),
        },
      ],
    };
  }
);

server.tool(
  'update_node',
  '修改指定节点的属性（label、description、type、color）',
  {
    nodeId: z.string().describe('要修改的节点 ID'),
    label: z.string().optional().describe('新的显示名称'),
    description: z.string().optional().describe('新的节点说明'),
    type: ALL_NODE_TYPES.optional().describe('新的节点类型'),
    color: z.string().optional().describe('自定义颜色（hex 格式，如 "#FF6B6B"）'),
  },
  async (input) => {
    const result = await updateNodeTool(input);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.graph, null, 2),
        },
      ],
    };
  }
);

async function main() {
  // 注册额外工具
  server.tool(
    'list_nodes',
    '列出所有节点的摘要信息（ID、类型、标签）',
    {},
    async () => {
      const graph = graphState.getGraph();
      const summary = graph.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.data.label,
        description: n.data.description,
        tags: n.data.tags,
      }));
      return {
        content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
      };
    }
  );

  server.tool(
    'get_node',
    '获取指定节点的完整信息（包含位置、连线关系）',
    {
      nodeId: z.string().describe('节点 ID'),
    },
    async ({ nodeId }) => {
      const graph = graphState.getGraph();
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) {
        return { content: [{ type: 'text', text: `未找到节点: ${nodeId}` }] };
      }
      const inEdges = graph.edges.filter((e) => e.target === nodeId);
      const outEdges = graph.edges.filter((e) => e.source === nodeId);
      return {
        content: [{ type: 'text', text: JSON.stringify({ node, inEdges, outEdges }, null, 2) }],
      };
    }
  );

  server.tool(
    'get_stats',
    '获取流程图统计信息（节点数、边数、类型分布）',
    {},
    async () => {
      const graph = graphState.getGraph();
      const typeCounts: Record<string, number> = {};
      for (const n of graph.nodes) {
        typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
      }
      const stats = {
        totalNodes: graph.nodes.length,
        totalEdges: graph.edges.length,
        nodesByType: typeCounts,
        isolatedNodes: graph.nodes.filter(
          (n) => !graph.edges.some((e) => e.source === n.id || e.target === n.id)
        ).map((n) => n.id),
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }],
      };
    }
  );

  server.tool(
    'clear_graph',
    '清空画布上的所有节点和连线',
    {},
    async () => {
      graphState.clear();
      broadcaster.broadcast({ type: 'graph:replace', payload: { nodes: [], edges: [] } });
      return {
        content: [{ type: 'text', text: '画布已清空' }],
      };
    }
  );

  server.tool(
    'remove_edge',
    '删除指定连线',
    {
      edgeId: z.string().describe('边 ID'),
    },
    async ({ edgeId }) => {
      graphState.removeEdge(edgeId);
      const graph = graphState.getGraph();
      broadcaster.broadcast({ type: 'graph:replace', payload: graph });
      return {
        content: [{ type: 'text', text: JSON.stringify(graph, null, 2) }],
      };
    }
  );

  server.tool(
    'search_nodes',
    '搜索节点（按标签、描述或标签关键词）',
    {
      query: z.string().describe('搜索关键词'),
    },
    async ({ query }) => {
      const graph = graphState.getGraph();
      const q = query.toLowerCase();
      const results = graph.nodes.filter(
        (n) =>
          n.data.label.toLowerCase().includes(q) ||
          (n.data.description && n.data.description.toLowerCase().includes(q)) ||
          (n.data.tags && n.data.tags.some((t) => t.toLowerCase().includes(q)))
      );
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ query, count: results.length, nodes: results }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'get_subgraph',
    '获取指定节点及其直接相连节点构成的子图',
    {
      nodeId: z.string().describe('中心节点 ID'),
      depth: z.number().optional().describe('遍历深度（默认 1）'),
    },
    async ({ nodeId, depth = 1 }) => {
      const graph = graphState.getGraph();
      const visited = new Set<string>();
      const queue: { id: string; d: number }[] = [{ id: nodeId, d: 0 }];

      while (queue.length > 0) {
        const { id, d } = queue.shift()!;
        if (visited.has(id) || d > depth) continue;
        visited.add(id);
        if (d < depth) {
          for (const e of graph.edges) {
            if (e.source === id && !visited.has(e.target)) queue.push({ id: e.target, d: d + 1 });
            if (e.target === id && !visited.has(e.source)) queue.push({ id: e.source, d: d + 1 });
          }
        }
      }

      const subNodes = graph.nodes.filter((n) => visited.has(n.id));
      const subEdges = graph.edges.filter((e) => visited.has(e.source) && visited.has(e.target));
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ nodes: subNodes, edges: subEdges }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'update_edge',
    '修改指定连线的属性',
    {
      edgeId: z.string().describe('边 ID'),
      label: z.string().optional().describe('新标签'),
      type: z.enum(['default', 'step', 'smoothstep', 'straight']).optional().describe('连线类型'),
      animated: z.boolean().optional().describe('是否设为动画连线'),
    },
    async ({ edgeId, label, type, animated }) => {
      const graph = graphState.getGraph();
      const edge = graph.edges.find((e) => e.id === edgeId);
      if (!edge) {
        return { content: [{ type: 'text', text: `未找到连线: ${edgeId}` }] };
      }
      if (label !== undefined) edge.label = label;
      if (type !== undefined) edge.type = type;
      if (animated !== undefined) edge.animated = animated;
      graphState.setGraph(graph);
      broadcaster.broadcast({ type: 'graph:replace', payload: graph });
      return {
        content: [{ type: 'text', text: JSON.stringify(graph, null, 2) }],
      };
    }
  );

  server.tool(
    'export_graph',
    '导出流程图为 Mermaid 格式文本',
    {},
    async () => {
      const graph = graphState.getGraph();
      let mermaid = 'graph TD\n';
      for (const n of graph.nodes) {
        const label = n.data.label.replace(/"/g, "'");
        if (n.type === 'decision') {
          mermaid += `    ${n.id}{{"${label}"}}\n`;
        } else if (n.type === 'start' || n.type === 'end') {
          mermaid += `    ${n.id}(["${label}"])\n`;
        } else if (n.type === 'data') {
          mermaid += `    ${n.id}[/"${label}"/]\n`;
        } else {
          mermaid += `    ${n.id}["${label}"]\n`;
        }
      }
      for (const e of graph.edges) {
        const lbl = e.label ? `|${e.label.replace(/"/g, "'")}|` : '';
        mermaid += `    ${e.source} -->${lbl} ${e.target}\n`;
      }
      return {
        content: [{ type: 'text', text: mermaid }],
      };
    }
  );

  server.tool(
    'batch_add_nodes',
    '批量添加多个节点（不含连线）',
    {
      nodes: z.array(z.object({
        id: z.string(),
        type: ALL_NODE_TYPES,
        label: z.string(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })),
    },
    async ({ nodes: inputNodes }) => {
      for (const n of inputNodes) {
        graphState.addNode({
          id: n.id,
          type: n.type,
          position: { x: Math.random() * 600, y: Math.random() * 400 },
          data: {
            label: n.label,
            description: n.description,
            tags: n.tags,
          },
        });
      }
      const graph = graphState.getGraph();
      broadcaster.broadcast({ type: 'graph:replace', payload: graph });
      return {
        content: [{ type: 'text', text: JSON.stringify({ added: inputNodes.length, graph }, null, 2) }],
      };
    }
  );

  // 批量创建连线
  server.tool(
    'batch_connect_nodes',
    '批量创建多条连线',
    {
      edges: z.array(z.object({
        id: z.string(),
        source: z.string(),
        target: z.string(),
        label: z.string().optional(),
        type: z.enum(['default', 'step', 'smoothstep', 'straight']).optional(),
        relation: z.string().optional(),
      })),
    },
    async ({ edges }) => {
      const result = await batchConnectNodesTool({ edges });
      return { content: [{ type: 'text', text: JSON.stringify(result.graph, null, 2) }] };
    }
  );

  // 自动布局
  server.tool(
    'auto_layout',
    '触发自动布局（使用 dagre 算法）',
    {
      direction: z.enum(['TB', 'LR', 'BT', 'RL']).optional().describe('布局方向：TB 上到下，LR 左到右'),
      nodeSep: z.number().optional().describe('节点间距'),
      rankSep: z.number().optional().describe('层级间距'),
    },
    async (input) => {
      const result = await autoLayoutTool(input);
      return { content: [{ type: 'text', text: JSON.stringify(result.graph, null, 2) }] };
    }
  );

  // 验证图表
  server.tool(
    'validate_graph',
    '验证图表完整性（检查孤立边、悬挂节点）',
    {},
    async () => {
      const graph = graphState.getGraph();
      const issues: string[] = [];

      // 检查孤立边（source 或 target 不存在）
      const nodeIds = new Set(graph.nodes.map((n) => n.id));
      for (const edge of graph.edges) {
        if (!nodeIds.has(edge.source)) {
          issues.push(`边 ${edge.id} 的源节点 ${edge.source} 不存在`);
        }
        if (!nodeIds.has(edge.target)) {
          issues.push(`边 ${edge.id} 的目标节点 ${edge.target} 不存在`);
        }
      }

      // 检查孤立节点（无任何连接）
      const connectedNodes = new Set<string>();
      for (const edge of graph.edges) {
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
      }
      const isolatedNodes = graph.nodes.filter((n) => !connectedNodes.has(n.id));
      if (isolatedNodes.length > 0) {
        issues.push(`孤立节点: ${isolatedNodes.map((n) => n.id).join(', ')}`);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            valid: issues.length === 0,
            issues,
            stats: {
              totalNodes: graph.nodes.length,
              totalEdges: graph.edges.length,
              isolatedNodeCount: isolatedNodes.length,
            },
          }, null, 2),
        }],
      };
    }
  );

  // 获取图表类型信息
  server.tool(
    'get_diagram_info',
    '获取当前图表类型和配置信息',
    {},
    async () => {
      const graph = graphState.getGraph();
      const diagramType = graph.meta?.diagramType || 'flowchart';
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            diagramType,
            meta: graph.meta,
            nodeCount: graph.nodes.length,
            edgeCount: graph.edges.length,
          }, null, 2),
        }],
      };
    }
  );

  // 克隆节点
  server.tool(
    'clone_node',
    '克隆指定节点',
    {
      nodeId: z.string().describe('要克隆的节点 ID'),
      newId: z.string().optional().describe('新节点 ID（可选）'),
      offsetX: z.number().optional().describe('X 偏移量'),
      offsetY: z.number().optional().describe('Y 偏移量'),
    },
    async (input) => {
      const result = await cloneNodeTool(input);
      return { content: [{ type: 'text', text: JSON.stringify(result.graph, null, 2) }] };
    }
  );

  // 移动节点
  server.tool(
    'move_node',
    '移动节点到指定位置',
    {
      nodeId: z.string().describe('节点 ID'),
      x: z.number().describe('新 X 坐标'),
      y: z.number().describe('新 Y 坐标'),
    },
    async ({ nodeId, x, y }) => {
      const graph = graphState.getGraph();
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) {
        return { content: [{ type: 'text', text: `节点不存在: ${nodeId}` }] };
      }
      node.position = { x, y };
      graphState.setGraph(graph);
      broadcaster.broadcast({ type: 'graph:replace', payload: graph });
      return { content: [{ type: 'text', text: JSON.stringify(graph, null, 2) }] };
    }
  );

  // 设置图表类型
  server.tool(
    'set_diagram_type',
    '设置当前图表类型',
    {
      diagramType: z.enum(['flowchart', 'er', 'functional', 'usecase', 'sequence', 'uml_class', 'uml_activity', 'uml_state']).describe('图表类型'),
    },
    async ({ diagramType }) => {
      const graph = graphState.getGraph();
      graph.meta = { ...graph.meta, diagramType };
      graphState.setGraph(graph);
      broadcaster.broadcast({ type: 'graph:replace', payload: graph });
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, diagramType }, null, 2) }] };
    }
  );

  broadcaster.broadcast({
    type: 'mcp:connected',
    payload: { clientName: 'flowvision-mcp' },
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('MCP 服务启动失败:', error);
  process.exit(1);
});
