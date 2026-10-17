/**
 * The pack's rows, as rows: every path they name exists, every recipe asks
 * for a category some shipped material carries, no fraction speaks a
 * number, and the pack is the shape it claims (no verb, no Api).
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, relative } from 'path';
import YAML from 'yaml';
import { CONTENT, PACK, rowFile } from './rows';

function yamlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...yamlFiles(p));
    else if (f.endsWith('.yaml')) out.push(p);
  }
  return out;
}

/** Every template-path-shaped string value under `node`, with its key. */
function paths(node: unknown, key = ''): Array<{ key: string; path: string }> {
  if (typeof node === 'string') {
    return /^\/(trade|stuff|platform|world)\/[\w/-]+$/.test(node) ? [{ key, path: node }] : [];
  }
  if (Array.isArray(node)) return node.flatMap((n) => paths(n, key));
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => (k === 'class' ? [] : paths(v, k)));
  }
  return [];
}

const ROWS = yamlFiles(join(PACK, 'content'));
const parsed = ROWS.map((f) => ({ file: relative(PACK, f), row: YAML.parse(readFileSync(f, 'utf8')) }));

/** Every material tag shipped anywhere. */
function shippedTags(): Set<string> {
  const tags = new Set<string>();
  for (const pack of readdirSync(CONTENT)) {
    const root = join(CONTENT, pack, 'content');
    if (!existsSync(root)) continue;
    for (const f of yamlFiles(root)) {
      if (!f.includes(`${'/idea/material/'}`)) continue;
      const row = YAML.parse(readFileSync(f, 'utf8')) as { data?: { tags?: string[] } };
      for (const t of row?.data?.tags ?? []) tags.add(t);
    }
  }
  return tags;
}

describe('the dairying rows', () => {
  it('every path a row names resolves to a row on disk', () => {
    const missing: string[] = [];
    let seen = 0;
    for (const { file, row } of parsed) {
      for (const { key, path } of paths(row)) {
        seen += 1;
        if (!rowFile(path)) missing.push(`${file}: ${key} → ${path}`);
      }
    }
    expect(missing).toEqual([]);
    // ⚠ Not vacuous: the rows name dozens of paths.
    expect(seen).toBeGreaterThan(30);
  });

  it('every pack class a row names has a source file', () => {
    for (const { row } of parsed) {
      const cls = (row as { class?: string }).class ?? '';
      if (!cls.startsWith('/trade/dairying/')) continue;
      const file = join(PACK, 'src', `${cls.replace('/trade/dairying/', '')}.ts`);
      expect(existsSync(file), cls).toBe(true);
    }
  });

  it('every recipe asks for a category some shipped material carries', () => {
    const tags = shippedTags();
    const recipes = parsed.filter((p) => p.file.startsWith('content/recipes/'));
    expect(recipes.length).toBeGreaterThanOrEqual(3);
    for (const { file, row } of recipes) {
      for (const slot of (row as { inputSlots: Array<{ category: string }> }).inputSlots) {
        expect(tags.has(slot.category), `${file}: ${slot.category}`).toBe(true);
      }
      // ⚠ Every heated recipe bounds its heat (lint:doneness).
      const r = row as { requiresHeatK?: number; maxHeatK?: number };
      if ((r.requiresHeatK ?? 0) > 0) expect(r.maxHeatK, file).toBeGreaterThan(r.requiresHeatK!);
    }
  });

  it('no fraction speaks a number — the cut is a judgement', () => {
    const schedules = parsed.filter((p) => p.file.includes('/fractionation/'));
    expect(schedules.length).toBe(2);
    for (const { row } of schedules) {
      for (const f of (row as { data: { fractions: Array<{ character: string }> } }).data.fractions) {
        expect(f.character).not.toMatch(/\d/);
      }
    }
  });

  it('the pack ships no verb, no controller, no Api and no logic singleton', () => {
    expect(existsSync(join(PACK, 'content', 'trade', 'dairying', 'cmd'))).toBe(false);
    expect(existsSync(join(PACK, 'src', 'idea'))).toBe(false);
    const src = readdirSync(join(PACK, 'src')).filter((d) => d !== '__tests__');
    expect(src).toEqual(['thing']);
  });
});
