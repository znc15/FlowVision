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
import { graphState } from '../state/graphState.js';

const ALL_NODE_TYPES = z.enum(['process', 'decision', 'start', 'end', 'data', 'group', 'subprocess', 'delay', 'document', 'manual_input', 'annotation', 'connector']);

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
