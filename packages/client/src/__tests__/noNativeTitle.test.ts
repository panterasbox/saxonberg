/**
 * ⭐ No native browser hover text (tooltips D9, requirements § Goals:
 * *"every hover string in the client is a tooltip"*).
 *
 * A native `title` is a tooltip nobody can style, nest, reach by keyboard
 * or read on a phone — the touch rule (client-shell.md) says a reason that
 * lives only in hover is a reason a phone player never reads. Every
 * former `title=` is a `useTip(...)` now; an icon's label stays as its
 * `aria-label`, which is the accessible name and not hover text.
 *
 * ## Census, then ratchet (docs/lint-family.md)
 *
 * W0 measured **104**: 101 `title=` hover attributes in 37 files (38 of
 * them in the CMS and studio), the SVG `<title>` in `ui/icons/Icon.tsx`,
 * and two `title:` keys spread onto JSX (`ui/Figure.tsx`, `PressRoom.tsx`).
 * Each retrofit wave lowers `CEILING`; it may fall, never rise; the floor
 * is **0**. The three `<iframe title=…>` in `embed/StreamEmbed.tsx` are an
 * iframe's accessible name — required, and not hover text — and are never
 * counted (recognized by their element, not by file).
 *
 * ⚠ The spread form (`{ title: x }` passed as props) cannot be told from a
 * card's data field by a regex, so only the two known sites are matched by
 * name. A new spread evasion is a review catch, not a gate catch.
 *
 * Excluded: `__tests__/**`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '..');

/** The ratchet. Lower it as sites are retrofitted; never raise it. */
const CEILING = 97;

const PATTERNS: RegExp[] = [
  /\btitle=/g,
  /<title[\s>]/g,
  /\{\s*title:\s*ariaLabel\s*\}/g, // ui/Figure.tsx spread
  /\btitle:\s*open\s*\?/g, // PressRoom.tsx props object
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      walk(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function isIframeTitle(lines: string[], i: number): boolean {
  // The attribute may sit on its own line inside a multi-line <iframe …>.
  for (let k = i; k >= Math.max(0, i - 8); k--) {
    if (/<iframe\b/.test(lines[k]!)) return true;
    if (/<[A-Za-z]/.test(lines[k]!) && k !== i) return false;
  }
  return false;
}

function census(): string[] {
  const hits: string[] = [];
  for (const file of walk(srcDir)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const re of PATTERNS) {
        const n = line.match(re)?.length ?? 0;
        for (let k = 0; k < n; k++) {
          if (re.source.startsWith('\\btitle=') && isIframeTitle(lines, i)) continue;
          hits.push(`${relative(srcDir, file)}:${i + 1}: ${line.trim()}`);
        }
      }
    });
  }
  return hits;
}

describe('no native hover text', () => {
  it(`at most ${CEILING} native title sites remain (the ratchet)`, () => {
    const hits = census();
    expect(
      hits.length,
      `native hover text — use useTip(...) instead:\n${hits.join('\n')}`
    ).toBeLessThanOrEqual(CEILING);
  });

  it('the ceiling is tight (lower it when a wave removes sites)', () => {
    expect(census().length).toBe(CEILING);
  });
});
