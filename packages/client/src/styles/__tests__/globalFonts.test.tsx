/**
 * No-CDN guard — the three functional faces are self-hosted; no Google
 * Fonts (or any third-party) request is issued at runtime.
 *
 * Reads the `GlobalFonts` `@font-face` source and `index.html` and
 * asserts every font `src` is a same-origin `/fonts/*.woff2` URL — no
 * `googleapis` / `gstatic` host, no `http(s)://`-scheme font URL, no
 * `@import url(http...)`. [AC: self-hosted, no Google CDN at runtime]
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { GlobalFonts } from '../GlobalFonts';

const here = dirname(fileURLToPath(import.meta.url));
const globalFontsSrc = readFileSync(
  resolve(here, '../GlobalFonts.ts'),
  'utf8',
);
const indexHtml = readFileSync(
  resolve(here, '../../../index.html'),
  'utf8',
);
const mainSrc = readFileSync(resolve(here, '../../main.tsx'), 'utf8');

describe('GlobalFonts — self-hosted, no third-party CDN', () => {
  it('declares the three functional faces', () => {
    expect(globalFontsSrc).toContain("'Source Serif 4'");
    expect(globalFontsSrc).toContain("'Source Sans 3'");
    expect(globalFontsSrc).toContain("'Source Code Pro'");
  });

  it('every @font-face src is a same-origin /fonts/*.woff2 URL', () => {
    const srcUrls = Array.from(
      globalFontsSrc.matchAll(/url\((['"]?)([^'")]+)\1\)/g),
      (m) => m[2]!,
    );
    expect(srcUrls.length).toBeGreaterThanOrEqual(4);
    for (const url of srcUrls) {
      expect(url.startsWith('/fonts/')).toBe(true);
      expect(url.endsWith('.woff2')).toBe(true);
    }
  });

  it('references no Google Fonts / third-party font host', () => {
    for (const source of [globalFontsSrc, indexHtml]) {
      expect(source).not.toMatch(/fonts\.googleapis\.com/);
      expect(source).not.toMatch(/fonts\.gstatic\.com/);
      expect(source).not.toMatch(/@import\s+url\(\s*['"]?https?:/);
      // No http(s)-scheme font URL anywhere.
      expect(source).not.toMatch(/url\(\s*['"]?https?:\/\//);
    }
  });

  it('uses font-display: swap so first paint is not blocked', () => {
    expect(globalFontsSrc).toMatch(/font-display:\s*swap/);
  });
});

describe('GlobalFonts — actually injects @font-face when rendered', () => {
  // The source-string checks above can't catch a runtime injection
  // failure. Render the component and assert styled-components emits the
  // @font-face rules into the document (the gap that let a non-injecting
  // mount ship: the faces declared but never registered → zero
  // @font-face rules → prose silently fell back to the generic serif).
  it('emits @font-face rules naming all three faces', () => {
    render(<GlobalFonts />);
    const css = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('');
    expect(css).toContain('@font-face');
    expect(css).toContain('Source Serif 4');
    expect(css).toContain('Source Sans 3');
    expect(css).toContain('Source Code Pro');
  });
});

describe('main.tsx — GlobalFonts mounted OUTSIDE StrictMode', () => {
  // Regression guard for the styled-components #3601 trap: a
  // createGlobalStyle nested under React 18 StrictMode is injected then
  // removed by the simulated mount→unmount→remount and never re-added,
  // so its @font-face block silently never lands. GlobalFonts must sit
  // outside <React.StrictMode>. Assert structurally on the entry source.
  it('renders <GlobalFonts /> before / outside <React.StrictMode>', () => {
    expect(mainSrc).toContain('<GlobalFonts />');
    const fontsIdx = mainSrc.indexOf('<GlobalFonts />');
    const strictIdx = mainSrc.indexOf('<React.StrictMode>');
    expect(fontsIdx).toBeGreaterThanOrEqual(0);
    expect(strictIdx).toBeGreaterThanOrEqual(0);
    // GlobalFonts appears before StrictMode opens (i.e. not nested in it).
    expect(fontsIdx).toBeLessThan(strictIdx);
  });
});
