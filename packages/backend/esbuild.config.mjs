import { build } from 'esbuild';

await build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/server.bundle.mjs',
  sourcemap: false,
  minify: false,
  // 内置 Node 模块保持外部引用
  external: ['pino-pretty'],
  banner: {
    // ESM 中使用 __dirname / __filename 的兼容处理
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});

console.log('✅ 后端打包完成: dist/server.bundle.mjs');
