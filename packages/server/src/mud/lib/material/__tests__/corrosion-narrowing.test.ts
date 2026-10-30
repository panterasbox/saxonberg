/**
 * ⭐ Rubber and ebonite shrug acid — and NOTHING ELSE moved (rubber build,
 * D12.4).
 *
 * Rubber keeps its `organic` tag (it is organic); vitriol's and lime's
 * `corrosiveTo` lose the coarse `organic` entry and name what they really
 * attack. This reads every shipped material row and asserts the set each
 * caustic attacks is exactly what it was, bar the four elastomers (and
 * seven foods `once-living` now names honestly, which nobody wears).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';

const CONTENT = join(dirname(fileURLToPath(import.meta.url)), '../../../../../../content');

function* yamlFiles(dir: string): Generator<string> {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) yield* yamlFiles(full);
    else if (e.endsWith('.yaml')) yield full;
  }
}

function rows(): Map<string, { tags: string[]; corrosiveTo?: string[] }> {
  const out = new Map<string, { tags: string[]; corrosiveTo?: string[] }>();
  for (const pack of readdirSync(CONTENT)) {
    const root = join(CONTENT, pack, 'content');
    try {
      statSync(root);
    } catch {
      continue;
    }
    for (const f of yamlFiles(root)) {
      let doc: unknown;
      try {
        doc = parse(readFileSync(f, 'utf8'));
      } catch {
        continue;
      }
      const data = (doc as { data?: Record<string, unknown> } | null)?.data;
      if (!data || !Array.isArray(data.tags)) continue;
      out.set(f.slice(root.length), {
        tags: data.tags as string[],
        corrosiveTo: Array.isArray(data.corrosiveTo) ? (data.corrosiveTo as string[]) : undefined,
      });
    }
  }
  return out;
}

const ELASTOMERS = new Set([
  '/stuff/idea/material/organic/rubber.yaml',
  '/stuff/idea/material/organic/raw-rubber.yaml',
  '/stuff/idea/material/organic/ebonite.yaml',
  '/stuff/idea/material/organic/rubber-scorched.yaml',
  // ⭐ (ceramics W0) raw rubber milled with sulfur, before its cure — an
  // elastomer like its neighbours, which lime does not eat.
  '/stuff/idea/material/organic/compounded-rubber.yaml',
]);

/** The two lists as they shipped before the rubber build. */
const BEFORE: Record<string, string[]> = {
  '/stuff/idea/material/bulk/vitriol.yaml': ['metal', 'organic', 'tissue', 'leather', 'textile'],
  '/stuff/idea/material/caustic/quicklime.yaml': ['organic', 'tissue', 'leather', 'textile'],
};

describe('the caustics name what they attack', () => {
  const all = rows();
  for (const [agentPath, before] of Object.entries(BEFORE)) {
    it(`${agentPath.split('/').pop()}: every outcome is unchanged except the elastomers`, () => {
      const after = all.get(agentPath)?.corrosiveTo;
      expect(after, `${agentPath} lost its corrosiveTo`).toBeDefined();
      expect(after).not.toContain('organic');
      const hit = (list: readonly string[]) =>
        new Set([...all].filter(([, r]) => r.tags.some((t) => list.includes(t))).map(([p]) => p));
      const was = hit(before);
      const now = hit(after!);
      const lost = [...was].filter((p) => !now.has(p));
      const gained = [...now].filter((p) => !was.has(p));
      // ⭐ `once-living` also catches seven FOODS that never carried
      // `organic` (sap, milk, eggs, fat) — honestly: acid does eat them. No
      // corrosion outcome moves, because corrosion folds only through a
      // worn COVERING and nothing anybody wears is made of milk.
      expect(gained.filter((p) => !all.get(p)!.tags.includes('food'))).toEqual([]);
      expect(new Set(lost)).toEqual(new Set([...ELASTOMERS].filter((p) => was.has(p))));
      expect(lost.length).toBeGreaterThan(0);
    });
  }
});
