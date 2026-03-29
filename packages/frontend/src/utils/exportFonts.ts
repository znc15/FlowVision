interface CSSRuleLike {
  type: number;
  cssText: string;
}

interface StylesheetLike {
  href?: string | null;
  cssRules?: ArrayLike<CSSRuleLike>;
}

const FONT_FACE_RULE = 5;

function isSameOriginStylesheet(href: string | null | undefined, origin: string) {
  if (!href) return true;

  try {
    return new URL(href, origin).origin === origin;
  } catch {
    return false;
  }
}

export function collectRemoteStylesheetUrls(urls: string[], origin: string): string[] {
  return [...new Set(urls.filter((href) => !isSameOriginStylesheet(href, origin)))];
}

export function extractAccessibleFontFaceCss(stylesheets: StylesheetLike[], origin: string): string {
  const fontFaceRules: string[] = [];

  for (const stylesheet of stylesheets) {
    if (!isSameOriginStylesheet(stylesheet.href, origin)) {
      continue;
    }

    try {
      const rules = Array.from(stylesheet.cssRules ?? []);
      for (const rule of rules) {
        if (rule.type === FONT_FACE_RULE) {
          fontFaceRules.push(rule.cssText);
        }
      }
    } catch {
      // 忽略不可访问或解析失败的样式表
    }
  }

  return fontFaceRules.join('\n');
}

export function extractFontFaceBlocks(cssText: string): string[] {
  return cssText.match(/@font-face\s*\{[^}]*\}/g) ?? [];
}

async function fetchRemoteFontFaceCss(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) return '';
    const cssText = await response.text();
    return extractFontFaceBlocks(cssText).join('\n');
  } catch {
    return '';
  }
}

/**
 * 为 html-to-image 预构建字体嵌入 CSS，避免其内部读取跨域 stylesheet.cssRules。
 */
export async function getExportFontEmbedCss(doc: Document = document): Promise<string> {
  const origin = doc.location?.origin ?? window.location.origin;
  const localFontCss = extractAccessibleFontFaceCss(Array.from(doc.styleSheets) as StylesheetLike[], origin);

  const remoteUrls = collectRemoteStylesheetUrls(
    Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]')).map((link) => link.href),
    origin,
  );

  const remoteFontCssList = await Promise.all(remoteUrls.map((url) => fetchRemoteFontFaceCss(url)));

  return [localFontCss, ...remoteFontCssList]
    .filter((cssText) => cssText.trim().length > 0)
    .join('\n');
}