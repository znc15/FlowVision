import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getFileContext, readFileContent } from './files.js';

function createReply() {
  return {
    statusCode: 200,
    code(nextCode: number) {
      this.statusCode = nextCode;
      return this;
    },
  };
}

describe('Gitee 文件路由', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('通过 Gitee API 读取仓库文件内容', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: Buffer.from('console.log("gitee");').toString('base64'),
          encoding: 'base64',
          size: 21,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const reply = createReply();
    const result = await readFileContent(
      {
        query: {
          projectPath: 'gitee:owner/repo',
          filePath: 'src/index.ts',
        },
      } as any,
      reply as any,
    );

    expect(result.success).toBe(true);
    if (!('data' in result)) {
      throw new Error(result.error);
    }
    expect(result.data.content).toContain('console.log("gitee");');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/repos/owner/repo/contents/src%2Findex.ts');
  });

  it('通过 Gitee API 生成项目文件上下文', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/git/trees/')) {
        return new Response(
          JSON.stringify({
            tree: [
              { path: 'README.md', type: 'blob' },
              { path: 'src', type: 'tree' },
              { path: 'src/index.ts', type: 'blob' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.includes('/contents/README.md')) {
        return new Response(
          JSON.stringify({
            content: Buffer.from('# demo').toString('base64'),
            encoding: 'base64',
            size: 6,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const reply = createReply();
    const result = await getFileContext(
      {
        query: {
          projectPath: 'gitee:owner/repo',
          maxDepth: '6',
          maxFiles: '5',
        },
      } as any,
      reply as any,
    );

    expect(result.success).toBe(true);
    if (!('data' in result)) {
      throw new Error(result.error);
    }
    expect(result.data.tree).toHaveLength(2);
    expect(result.data.keyFiles).toEqual([
      {
        path: 'README.md',
        content: '# demo',
      },
    ]);
    expect(result.data.allFiles).toEqual(
      expect.arrayContaining([
        { folder: '.', files: ['README.md'] },
        { folder: 'src', files: ['index.ts'] },
      ]),
    );
  });
});