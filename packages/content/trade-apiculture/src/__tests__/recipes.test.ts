/**
 * The recipes — ⭐⭐ **two recipes over one input, and nothing in the code
 * branches on the tool.**
 *
 * That is the whole of AC 11: crush gives you less honey and a cake of
 * beeswax; spin gives you more honey and the comb back. Neither is
 * better, both are data, and the difference between them is one
 * capability word and one residue.
 *
 * ⚠ And the wiring nobody can see: a slot's `category` matches the
 * INPUT's Material **tags**, not the input's path. A slot reading
 * `category: comb` would have matched nothing, forever, silently — so
 * both comb slots name `honey`, which is what the comb is made of, and
 * `kind: item` vs `kind: bulk` is what keeps a jar of honey out of a
 * comb slot.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const PACK = join(here, '..', '..');
const REPO = join(PACK, '..', '..', '..');

interface Slot {
  slot: string;
  kind?: 'item' | 'bulk';
  category: string;
  count?: number;
  measureL?: number;
}
interface RecipeRow {
  recipeId: string;
  discipline: string;
  inputSlots: Slot[];
  toolCapabilities: string[];
  outputApplication: string;
  outputTemplate: string;
  outputMaterial?: string;
  outputPortionL?: number;
  outputResidue?: { template: string; count?: number };
}

function recipe(pack: string, name: string): RecipeRow {
  const file =
    pack === 'self'
      ? join(PACK, 'content', 'recipes', `${name}.yaml`)
      : join(REPO, 'packages', 'content', pack, 'content', 'recipes', `${name}.yaml`);
  return YAML.parse(readFileSync(file, 'utf-8')) as RecipeRow;
}

/** Every material row in the repo that declares the given tag. */
function rowTags(path: string): string[] {
  // `/trade/apiculture/idea/material/honey` →
  // packages/content/trade-apiculture/content/trade/apiculture/idea/material/honey.yaml
  const candidates = [
    join(PACK, 'content', path.replace(/^\//, '') + '.yaml'),
    join(REPO, 'packages/content/trade-winemaking/content', path.replace(/^\//, '') + '.yaml'),
    join(REPO, 'packages/content/base-library/content', path.replace(/^\//, '') + '.yaml'),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const doc = YAML.parse(readFileSync(file, 'utf-8')) as {
      data?: { tags?: string[] };
    };
    return doc.data?.tags ?? [];
  }
  return [];
}

describe('crush or spin', () => {
  const crush = recipe('self', 'crush-comb');
  const spin = recipe('self', 'spin-comb');

  it('⭐⭐ ONE input, TWO recipes — and the tool is the only difference', () => {
    expect(crush.inputSlots).toHaveLength(1);
    expect(spin.inputSlots).toHaveLength(1);
    expect(crush.inputSlots[0]!.category).toBe(spin.inputSlots[0]!.category);
    expect(crush.inputSlots[0]!.kind).toBe('item');
    expect(spin.inputSlots[0]!.kind).toBe('item');
    // ⭐ The capability, and nothing else, picks which one runs.
    expect(crush.toolCapabilities).toEqual([]);
    expect(spin.toolCapabilities).toEqual(['extracting']);
  });

  it('⚠⚠ the slot category is a MATERIAL TAG the comb actually carries', () => {
    // A slot reading `category: comb` would have matched nothing forever
    // and said nothing about it.
    const tags = rowTags('/trade/apiculture/idea/material/honey');
    expect(tags).toContain(crush.inputSlots[0]!.category);
  });

  it('⭐ AC 11 — spin gives MORE honey; crush gives the wax', () => {
    expect(spin.outputPortionL!).toBeGreaterThan(crush.outputPortionL!);
    expect(crush.outputResidue!.template).toBe(
      '/trade/apiculture/thing/beeswax-cake',
    );
    // …and the comb back, which is the other half of the trade-off.
    expect(spin.outputResidue!.template).toBe(
      '/trade/apiculture/thing/drawn-comb',
    );
  });

  it('both land in the same vessel and both credit the trade', () => {
    for (const r of [crush, spin]) {
      expect(r.outputApplication).toBe('bulk');
      expect(r.outputTemplate).toBe('/trade/apiculture/thing/honey-jar');
      expect(r.outputMaterial).toBe('/trade/apiculture/idea/material/honey');
      expect(r.discipline).toBe('apiculture');
    }
  });
});

describe('the candle', () => {
  const candle = recipe('self', 'candle');

  it('⭐ AC 12 — wax makes a light, and the tag is what carries it', () => {
    expect(candle.inputSlots[0]!.category).toBe('wax');
    expect(rowTags('/stuff/idea/material/organic/beeswax')).toContain('wax');
    expect(candle.outputTemplate).toBe('/stuff/thing/candle');
    expect(candle.outputApplication).toBe('tangible');
  });
});

describe('the must', () => {
  const must = recipe('trade-winemaking', 'honey-must');

  it('⭐⭐ AC 15 — diluting honey is the hurdle run backwards', () => {
    const honey = must.inputSlots.find((s) => s.category === 'honey')!;
    const water = must.inputSlots.find((s) => s.category === 'water')!;
    expect(honey.kind).toBe('bulk');
    expect(water.kind).toBe('bulk');
    // Three parts water to one of honey, which is roughly a traditional
    // mead — and the reason the microbial floor stops holding.
    expect(water.measureL! / honey.measureL!).toBeCloseTo(3, 6);
  });

  it('⚠ a comb cannot satisfy a BULK slot and a jar cannot satisfy an ITEM one', () => {
    // Which is what keeps `crush-comb` and `honey-must` — both naming
    // `honey` — from ever colliding.
    const crush = recipe('self', 'crush-comb');
    expect(crush.inputSlots[0]!.kind).toBe('item');
    expect(must.inputSlots.every((s) => s.kind === 'bulk')).toBe(true);
  });

  it('it needs no tool: a bucket and a stick', () => {
    expect(must.toolCapabilities).toEqual([]);
  });
});
