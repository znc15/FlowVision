import { describe, expect, it } from 'vitest';
import config from './vite.config';

describe('Vite Electron 打包配置', () => {
  it('在生产构建时输出相对静态资源路径', () => {
    expect(config.base).toBe('./');
  });
});