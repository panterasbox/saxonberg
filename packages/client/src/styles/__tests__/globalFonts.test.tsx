/**
 * No-CDN guard — the four civic faces are self-hosted; no Google Fonts
 * (or any third-party) request is issued at runtime.
 *
 * Reads the `GlobalFonts` `@font-face` source and `index.html` and
 * asserts every font `src` is a same-origin `/fonts/*.woff2` URL — no
 * `googleapis` / `gstatic` host, no `http(s)://`-scheme font URL, no
 * `@import url(http...)`. [AC: self-hosted, no Google CDN at runtime]
 *
 * Also closes the two halves of the Newsreader criterion. "Newsreader
 * loads rather than falling back to Times" has no request tuple to
 * assert under self-hosting, so it is asserted as: (a) no client source
 * names the `opsz` axis, and (b) every declared face has a file on disk.
 * (b) generalizes past Newsreader — a declared face with no file is a
 * silent fallback, which is the failure mode this whole file exists for.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
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
const fontsDir = resolve(here, '../../../public/fonts');
const srcDir = resolve(here, '../..');

/** The four families, by the name a `@font-face` block declares. */
const FAMILIES = ['Spectral', 'Public Sans', 'Newsreader', 'IBM Plex Mono'];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|css|html)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('GlobalFonts — self-hosted, no third-party CDN', () => {
  it('declares the four civic faces', () => {
    for (const family of FAMILIES) {
      expect(globalFontsSrc).toContain(`font-family: '${family}'`);
    }
  });

  it('every @font-face src is a same-origin /fonts/*.woff2 URL', () => {
    const srcUrls = Array.from(
      globalFontsSrc.matchAll(/url\((['"]?)([^'")]+)\1\)/g),
      (m) => m[2]!,
    );
    expect(srcUrls.length).toBeGreaterThanOrEqual(6);
    for (const url of srcUrls) {
      expect(url.startsWith('/fonts/')).toBe(true);
      expect(url.endsWith('.woff2')).toBe(true);
    }
  });

  it('every declared face has a woff2 on disk', () => {
    // A declared face with no file loads nothing and falls back
    // silently — the exact failure the Newsreader criterion names.
    const srcUrls = Array.from(
      globalFontsSrc.matchAll(/url\((['"]?)(\/fonts\/[^'")]+)\1\)/g),
      (m) => m[2]!,
    );
    expect(srcUrls.length).toBeGreaterThanOrEqual(6);
    for (const url of srcUrls) {
      const file = resolve(fontsDir, url.replace('/fonts/', ''));
      expect(existsSync(file), `missing font file: ${url}`).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(1000);
    }
    // Newsreader specifically, named so the criterion is greppable.
    expect(existsSync(resolve(fontsDir, 'newsreader-latin.woff2'))).toBe(
      true,
    );
    expect(globalFontsSrc).toContain('newsreader-latin.woff2');
  });

  it('no shipped woff2 is orphaned by the declarations', () => {
    // The reverse direction: a file nothing declares is dead weight in
    // the bundle and usually the residue of a half-finished face swap.
    const declared = new Set(
      Array.from(
        globalFontsSrc.matchAll(/url\((['"]?)\/fonts\/([^'")]+)\1\)/g),
        (m) => m[2]!,
      ),
    );
    for (const file of readdirSync(fontsDir)) {
      if (!file.endsWith('.woff2')) continue;
      expect(declared.has(file), `undeclared font file: ${file}`).toBe(
        true,
      );
    }
  });

  it('requests no `opsz` axis anywhere in the client', () => {
    // Newsreader requested WITH the optical-size axis silently fails to
    // load and falls back to Times. Under self-hosting there is no
    // request to inspect, so the guard is that the axis never appears in
    // an axis-tuple position — `opsz,wght`, `ital,opsz`, `opsz@6..72`.
    // Prose that names the axis (this file, GlobalFonts' warning) is
    // deliberately not a match: banning the word would make the trap
    // undocumentable, which is worse than the narrower regex.
    const tuple = /(\bopsz\s*[,@:])|([,:]\s*opsz\b)/;
    for (const file of walk(srcDir).concat([
      resolve(here, '../../../index.html'),
    ])) {
      if (file === fileURLToPath(import.meta.url)) continue;
      expect(readFileSync(file, 'utf8'), file).not.toMatch(tuple);
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

  it('ships Spectral 500 as a real face, not a synthesized weight', () => {
    // The engraved display role is specified at 500. Browsers
    // synthesize bold only and round 500 down to 400, so a lone 400
    // Spectral would quietly lose the weight the design asks for.
    expect(globalFontsSrc).toContain('spectral-500-latin.woff2');
    expect(globalFontsSrc).toMatch(/font-weight:\s*500/);
  });

  it('declares Public Sans across the variable weight range', () => {
    // Upstream Public Sans is one variable file (wght 100-900), so the
    // 600 chrome emphasis must come from the axis. Pinning the block to
    // 400 would synthesize bold from the same bytes.
    expect(globalFontsSrc).toMatch(/font-weight:\s*100 900/);
  });
});

describe('GlobalFonts — actually injects @font-face when rendered', () => {
  // The source-string checks above can't catch a runtime injection
  // failure. Render the component and assert styled-components emits the
  // @font-face rules into the document (the gap that let a non-injecting
  // mount ship: the faces declared but never registered → zero
  // @font-face rules → prose silently fell back to the generic serif).
  it('emits @font-face rules naming all four faces', () => {
    render(<GlobalFonts />);
    const css = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('');
    expect(css).toContain('@font-face');
    for (const family of FAMILIES) expect(css).toContain(family);
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
