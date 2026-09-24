/**
 * The rung check, asserted (content-packs § The rung check): every row
 * this pack ships parses, names a class this pack can resolve, and every
 * CLASS this pack ships is named by some row — the two halves of "a pack
 * ships `src/` and the rows that reach it".
 *
 * ⚠ The failure this catches is silent by construction: a class nothing
 * names is dead code that still type-checks, and a row naming a class
 * that moved fails at hydration, deep in a boot log.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, relative } from 'path';
import YAML from 'yaml';

const PACK = fileURLToPath(new URL('../../', import.meta.url));
const CONTENT = join(PACK, 'content');
const SRC = join(PACK, 'src');
const ROOT = '/trade/shopkeeping';

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const abs = join(dir, f);
    if (statSync(abs).isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}

const rows = walk(CONTENT)
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => ({
    file: relative(PACK, f),
    doc: YAML.parse(readFileSync(f, 'utf8')) as Record<string, unknown>,
  }));

describe('the pack ships rows that reach its classes', () => {
  it('every YAML parses to an object', () => {
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(typeof r.doc, r.file).toBe('object');
      expect(r.doc, r.file).not.toBeNull();
    }
  });

  it('every `class:` under this root resolves to a file in src/', () => {
    const named = rows
      .map((r) => r.doc.class)
      .filter((c): c is string => typeof c === 'string' && c.startsWith(ROOT));
    expect(named.length).toBeGreaterThan(0);
    for (const c of named) {
      const rel = c.slice(ROOT.length + 1); // `thing/Stock`
      expect(existsSync(join(SRC, `${rel}.ts`)), c).toBe(true);
    }
  });

  it('every class this pack ships is named by some row', () => {
    const named = new Set(
      rows
        .map((r) => r.doc.class)
        .filter((c): c is string => typeof c === 'string'),
    );
    const classes = walk(SRC)
      .filter((f) => f.endsWith('.ts') && !f.includes('__tests__'))
      // A brain is named by a row's `behaviors[].brain`, not by `class:`.
      .filter((f) => !relative(SRC, f).startsWith('behavior'))
      .map((f) => `${ROOT}/${relative(SRC, f).replace(/\.ts$/, '')}`);
    for (const c of classes) {
      expect(named.has(c), `${c} is shipped but no row names it`).toBe(true);
    }
  });

  it('every brain this pack ships is named by some row, somewhere', () => {
    const brains = walk(join(SRC, 'behavior'))
      .filter((f) => f.endsWith('.ts') && !f.includes('__tests__'))
      .map((f) => `${ROOT}/behavior/${relative(join(SRC, 'behavior'), f).replace(/\.ts$/, '')}`);
    expect(brains.sort()).toEqual([
      `${ROOT}/behavior/consigns`,
      `${ROOT}/behavior/stocks`,
    ]);
    // The rows that name them live in the packs whose agents run them
    // (terminus's keeper and the goods-yard hands), so the assertion here
    // is the roster; `lint:census` covers the naming.
  });
});
