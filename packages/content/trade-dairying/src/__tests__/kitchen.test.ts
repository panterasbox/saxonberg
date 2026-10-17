/**
 * ⭐ The kitchen takes dairy by CATEGORY (dairy D15). None of these
 * recipes names a dairy row: each asks for a TAG, and the dairy's
 * materials carry it — so butter fries what tallow fried, any milk mashes
 * and bakes, and any cheese toasts. These pins prove the match from the
 * shipped rows; the doneness band the custard's ten-kelvin window rides is
 * the kernel's and is tested there (`CraftingLogic.doneness.test.ts`).
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { CONTENT, readRow } from './rows';

type RecipeDoc = {
  inputSlots: Array<{ category: string; kind?: string }>;
  requiresHeatK?: number;
  maxHeatK?: number;
  outputMaterial?: string;
};

function recipe(pack: string, id: string): RecipeDoc {
  return YAML.parse(readFileSync(join(CONTENT, pack, 'content', 'recipes', `${id}.yaml`), 'utf8')) as RecipeDoc;
}

function tagsOf(path: string): string[] {
  return ((readRow(path).data.tags as string[] | undefined) ?? []).map(String);
}

const MILKS = [
  '/stuff/idea/material/food/milk',
  '/stuff/idea/material/food/ewe-milk',
  '/stuff/idea/material/food/goat-milk',
];
const BUTTER = '/trade/dairying/idea/material/butter';
const CHEESES = [
  '/trade/dairying/idea/material/soft-cheese',
  '/trade/dairying/idea/material/hard-cheese',
];

describe('the kitchen takes dairy by category', () => {
  it('butter is a FAT — every `category: fat` recipe fries in it', () => {
    expect(tagsOf(BUTTER)).toContain('fat');
    const fried = recipe('trade-cooking', 'pan-fried-roots');
    expect(fried.inputSlots.map((s) => s.category)).toContain('fat');
  });

  it('every milk answers `category: milk`', () => {
    for (const m of MILKS) expect(tagsOf(m)).toContain('milk');
    for (const id of ['creamed-mash', 'baked-custard']) {
      expect(recipe('trade-cooking', id).inputSlots.map((s) => s.category)).toContain('milk');
    }
    expect(recipe('trade-baking', 'milk-dough').inputSlots.map((s) => s.category)).toContain('milk');
  });

  it('every cheese answers `category: cheese` — toasted cheese takes a wedge of either', () => {
    for (const c of CHEESES) expect(tagsOf(c)).toContain('cheese');
    expect(recipe('trade-cooking', 'toasted-cheese').inputSlots.map((s) => s.category)).toContain('cheese');
  });

  it('⭐ the custard has a ten-kelvin window, and over it it curdles', () => {
    const c = recipe('trade-cooking', 'baked-custard');
    expect((c.maxHeatK ?? 0) - (c.requiresHeatK ?? 0)).toBe(10);
  });

  it('a milk dough is the same dough — it bakes into the shipped loaf', () => {
    const milk = recipe('trade-baking', 'milk-dough');
    const plain = recipe('trade-baking', 'dough');
    expect(milk.outputMaterial).toBe(plain.outputMaterial);
  });

  it('every heated kitchen recipe bounds its heat (lint:doneness)', () => {
    for (const [pack, id] of [
      ['trade-cooking', 'creamed-mash'],
      ['trade-cooking', 'toasted-cheese'],
      ['trade-cooking', 'baked-custard'],
    ] as const) {
      const r = recipe(pack, id);
      if ((r.requiresHeatK ?? 0) > 0) expect(r.maxHeatK).toBeGreaterThan(r.requiresHeatK!);
    }
  });
});
