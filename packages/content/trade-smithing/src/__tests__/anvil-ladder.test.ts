/**
 * ⭐⭐ **The anvil ladder, and why it has to have no ties.**
 *
 * `quench` selects nothing. It hands the build buffer to `matchBuild`,
 * which reverse-matches it against the whole installed catalogue: the
 * most heat-demanding recipe the build actually satisfies wins, with no
 * leftovers, and ties break by catalogue ORDER — which is to say, by
 * accident of filename.
 *
 * That is the mechanic the whole by-hand path rests on: *the work
 * determines the form*. A poker at 700 K and a belt knife at 1400 K come
 * out of identical stock, and the only thing the player chose was how
 * hot they got it. It only works while two recipes taking the same stock
 * at the same heat do not exist — because then the player's choice
 * decides nothing and the answer comes out of the directory listing.
 *
 * ⚠ **A ratchet, not an amnesty.** Two ties pre-date this build and are
 * named below; the check fails on a third. Every recipe this build added
 * was placed to avoid one, which is what the heats in the ladder are for.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKS = join(HERE, '..', '..', '..');

/**
 * The ties that already existed, each for a reason that pre-dates the
 * `forgeable` retag — an iron bar satisfied both `ferrous` and `metal`
 * before there was a third word for it, so neither pair is new.
 */
const KNOWN_TIES: readonly string[] = [
  'assay-kit+miners-dial',
  'pick-head+tongs',
];

interface Recipe {
  recipeId: string;
  outputTemplate?: string;
  toolCapabilities?: string[];
  requiresHeatK?: number;
  inputSlots?: Array<{ category: string; count?: number; minGrade?: string }>;
}

/** Every shipped recipe of the three trades that make metal. */
function anvilRecipes(): Recipe[] {
  const out: Recipe[] = [];
  for (const pack of ['trade-smithing', 'trade-mining', 'trade-smelting']) {
    const dir = join(PACKS, pack, 'content', 'recipes');
    for (const file of readdirSync(dir)) {
      const row = YAML.parse(readFileSync(join(dir, file), 'utf8')) as Recipe | null;
      if (row && (row.toolCapabilities ?? []).includes('anvil')) out.push(row);
    }
  }
  return out;
}

/**
 * What `matchBuild` actually discriminates on: the exact slot signature
 * (category × count × minimum grade) and the heat gate. Two recipes
 * sharing one are indistinguishable to it.
 */
function signatureOf(r: Recipe): string {
  const slots = (r.inputSlots ?? [])
    .map((s) => `${s.category}x${s.count ?? 1}:${s.minGrade ?? ''}`)
    .sort()
    .join('|');
  return `${slots} @${r.requiresHeatK ?? 0}`;
}

describe('the anvil ladder', () => {
  const recipes = anvilRecipes();

  it('⚠ the scan reads a real corpus — it would pass identically finding nothing', () => {
    expect(recipes.length).toBeGreaterThan(20);
  });

  it('⭐⭐ no NEW recipe is indistinguishable from another at the anvil', () => {
    const groups = new Map<string, string[]>();
    for (const r of recipes) {
      const key = signatureOf(r);
      groups.set(key, [...(groups.get(key) ?? []), r.recipeId]);
    }
    const ties = [...groups.values()]
      .filter((ids) => ids.length > 1)
      .map((ids) => [...ids].sort().join('+'))
      .sort();
    expect(
      ties,
      `a tie means the player's choice decides nothing and the catalogue's ` +
        `file order picks the output. Separate them by heat, count or ` +
        `minGrade — never by adding to the known list.`,
    ).toEqual([...KNOWN_TIES].sort());
  });

  it('⭐ every anvil recipe asks for `forgeable` stock — one tag, one rule', () => {
    const offenders: string[] = [];
    for (const r of recipes) {
      // The stock slot is the metal one; wood hafts and cases are not it.
      const metal = (r.inputSlots ?? []).filter(
        (s) => s.category !== 'wood' && s.category !== 'bloom',
      );
      for (const s of metal) {
        if (s.category !== 'forgeable') offenders.push(`${r.recipeId}: ${s.category}`);
      }
    }
    // ⚠ `ferrous` would admit a pig of cast iron, which shatters under a
    // hammer; `metal` would admit a pig AND a bloom, which is a quarter
    // glass. `forgeable` admits exactly what an anvil can work.
    expect(
      offenders,
      `anvil recipes not asking for forgeable stock:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });

  it('⭐ the barbell — a load device the smith makes, two bars of stock, at the anvil', () => {
    const r = recipes.find((x) => x.recipeId === 'barbell');
    expect(r).toBeDefined();
    expect(r?.outputTemplate).toBe('/trade/smithing/thing/barbell');
    expect(r?.toolCapabilities).toEqual(['striking', 'anvil']);
    const stock = r?.inputSlots?.[0];
    expect(stock?.category).toBe('forgeable');
    expect(stock?.count).toBe(2);
  });

  it('⭐⭐ the nine arms are all makeable, and more metal is more work', () => {
    const arms = [
      'dagger', 'spear', 'flail', 'warhammer', 'mace',
      'sword', 'mail-hauberk', 'shield', 'breastplate',
    ];
    const byId = new Map(recipes.map((r) => [r.recipeId, r]));
    for (const id of arms) {
      const r = byId.get(id);
      expect(
        r,
        `no recipe for ${id} — seventeen arms templates shipped unmakeable once already`,
      ).toBeDefined();
      expect(r!.requiresHeatK).toBeGreaterThan(1000);
    }
    const stockOf = (id: string): number =>
      byId.get(id)!.inputSlots!.find((s) => s.category === 'forgeable')!.count ?? 1;
    expect(stockOf('dagger')).toBe(1);
    expect(stockOf('sword')).toBe(2);
    expect(stockOf('breastplate')).toBe(4);
  });
});
