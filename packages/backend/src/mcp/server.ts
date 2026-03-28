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
    type: z.enum(['process', 'decision', 'start', 'end', 'data', 'group']),
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
    type: z.enum(['process', 'decision', 'start', 'end', 'data', 'group']).optional().describe('新的节点类型'),
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
