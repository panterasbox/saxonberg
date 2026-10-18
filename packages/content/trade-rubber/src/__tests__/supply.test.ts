/**
 * ⭐ Every rubber input is obtainable with nothing granted (rubber build,
 * AC 1) — read off the shipped rows: the caprock band wins sulfur between
 * the coal and the salt, and the dandelion chain's rows name each other
 * all the way to a lump of raw rubber.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';

const CONTENT = fileURLToPath(new URL('../../../', import.meta.url));
const doc = (pack: string, rel: string): Record<string, unknown> =>
  parse(readFileSync(`${CONTENT}${pack}/content${rel}`, 'utf8')) as Record<string, unknown>;
const data = (pack: string, rel: string): Record<string, unknown> =>
  doc(pack, rel).data as Record<string, unknown>;

describe('sulfur is caprock', () => {
  const bands = (data('rejection', '/world/terminus/rejection/idea/deposit/quarry-hill.yaml')
    .stratigraphy as Array<{ toZ: number; host: string; wins?: string }>);

  it('a dig past the coal and before the salt wins a nodule of sulfur', () => {
    const at = (z: number) => bands.find((b) => z >= b.toZ)!;
    expect(at(-9.5).wins).toBe('/trade/quarrying/thing/coal');
    expect(at(-10.5).host).toBe('/stuff/idea/material/mineral/sulfur');
    expect(at(-10.5).wins).toBe('/trade/quarrying/thing/sulfur');
    expect(at(-11.5).host).toBe('/stuff/idea/material/mineral/halite');
  });

  it('the won nodule is sulfur, and light enough to weigh a cure by count', () => {
    const nodule = data('trade-quarrying', '/trade/quarrying/thing/sulfur.yaml');
    expect(nodule._materialPath).toBe('/stuff/idea/material/mineral/sulfur');
    expect(Number(nodule.mass)).toBeLessThan(0.1);
    const sulfur = data('base-library', '/stuff/idea/material/mineral/sulfur.yaml');
    expect(sulfur.tags).toContain('sulfur');
  });
});

describe('rubber from a field', () => {
  it('seed → plant → root → (wet-milled) latex → the pan: every row names the next', () => {
    const seed = data('trade-farming', '/trade/farming/thing/seed/kok-saghyz.yaml');
    const plant = data('trade-farming', `${String(seed.growsIntoPath)}.yaml`);
    const crop = data('trade-farming', `${String(plant.harvestTemplatePath)}.yaml`);
    const root = data('trade-farming', `${String(crop._materialPath)}.yaml`);
    expect(root.tags).toContain('rubber-root');
    // ⭐ Edible, and that is what makes a grown, marked root STOCK to a
    // craft (CraftingLogic.isItemCandidate) — the drive found it refused.
    expect(root.edibility).toBe(true);

    const recipe = doc('trade-rubber', '/recipes/dandelion-latex.yaml');
    const cats = (recipe.inputSlots as Array<{ category: string }>).map((sl) => sl.category);
    expect(cats).toEqual(['rubber-root', 'water']);
    expect(recipe.toolCapabilities).toEqual(['millstone']);
    // No ladder placement: rubber has no knowledge gate.
    expect(recipe.difficulty).toBeUndefined();
    expect(recipe.discipline).toBeUndefined();
    // ⭐ It runs off as the Hevea's latex, so it SETS in the same pan.
    expect(recipe.outputMaterial).toBe('/stuff/idea/material/organic/latex');
    const latex = data('base-library', '/stuff/idea/material/organic/latex.yaml');
    expect(latex.drainSetting).toBeTruthy();
  });

  it('the seed is on the general store\'s counter, priced', () => {
    const counter = data('terminus', '/world/terminus/general-store/counter.yaml');
    const lines = counter.stockLines as Array<{ itemTemplatePath: string }>;
    expect(lines.some((l) => l.itemTemplatePath === '/trade/farming/thing/seed/kok-saghyz')).toBe(true);
  });
});
