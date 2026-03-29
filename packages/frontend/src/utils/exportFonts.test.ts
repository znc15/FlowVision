import { describe, expect, it } from 'vitest';
import { collectRemoteStylesheetUrls, extractAccessibleFontFaceCss, extractFontFaceBlocks } from './exportFonts';

describe('exportFonts', () => {
  it('只收集跨域样式表链接并去重', () => {
    const urls = collectRemoteStylesheetUrls([
      'http://localhost:5173/assets/app.css',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap',
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined',
    ], 'http://localhost:5173');

    expect(urls).toEqual([
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap',
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined',
    ]);
  });

  it('只读取同源样式表中的 @font-face 规则，跳过跨域 cssRules', () => {
    let crossOriginRead = false;
    const crossOriginSheet = {} as { href: string; cssRules: ArrayLike<{ type: number; cssText: string }> };
    Object.defineProperty(crossOriginSheet, 'href', {
      value: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap',
      configurable: true,
    });
    Object.defineProperty(crossOriginSheet, 'cssRules', {
      get() {
        crossOriginRead = true;
        throw new Error('should not read cssRules for cross-origin stylesheets');
      },
      configurable: true,
    });

    const css = extractAccessibleFontFaceCss([
      {
        href: 'http://localhost:5173/src/styles/globals.css',
        cssRules: [
          { type: 5, cssText: '@font-face { font-family: TestSans; src: url(test.woff2); }' },
          { type: 1, cssText: 'body { color: red; }' },
        ],
      },
      crossOriginSheet,
    ], 'http://localhost:5173');

    expect(css).toContain('@font-face');
    expect(css).not.toContain('body { color: red; }');
    expect(crossOriginRead).toBe(false);
  });

  it('从远程样式文本中只提取 @font-face 代码块', () => {
    const blocks = extractFontFaceBlocks(`
      .material-symbols-outlined { font-family: 'Material Symbols Outlined'; }
      @font-face { font-family: 'Material Symbols Outlined'; src: url(icon.woff2) format('woff2'); }
      body { color: red; }
      @font-face { font-family: 'Inter'; src: url(inter.woff2) format('woff2'); }
    `);

    expect(blocks).toEqual([
      "@font-face { font-family: 'Material Symbols Outlined'; src: url(icon.woff2) format('woff2'); }",
      "@font-face { font-family: 'Inter'; src: url(inter.woff2) format('woff2'); }",
    ]);
  });
});