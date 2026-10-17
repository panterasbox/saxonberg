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
  it('seed → plant → root → pulp → raw rubber: every row names the next', () => {
    const seed = data('trade-farming', '/trade/farming/thing/seed/kok-saghyz.yaml');
    const plant = data('trade-farming', `${String(seed.growsIntoPath)}.yaml`);
    const crop = data('trade-farming', `${String(plant.harvestTemplatePath)}.yaml`);
    const root = data('trade-farming', `${String(crop._materialPath)}.yaml`);
    expect(root.tags).toContain('rubber-root');

    const pulpRecipe = doc('trade-rubber', '/recipes/root-pulp.yaml');
    const slot = (pulpRecipe.inputSlots as Array<{ category: string }>)[0]!;
    expect(slot.category).toBe('rubber-root');
    const pulp = data('trade-rubber', `${String(pulpRecipe.outputMaterial)}.yaml`);
    expect(pulp.tags).toContain('rubber-pulp');

    const washRecipe = doc('trade-rubber', '/recipes/raw-rubber-from-pulp.yaml');
    const cats = (washRecipe.inputSlots as Array<{ category: string }>).map((s) => s.category);
    expect(cats).toEqual(['rubber-pulp', 'water']);
    const lump = data('trade-rubber', `${String(washRecipe.outputTemplate)}.yaml`);
    expect(lump._materialPath).toBe('/stuff/idea/material/organic/raw-rubber');
  });

  it('the seed is on the general store\'s counter, priced', () => {
    const counter = data('terminus', '/world/terminus/general-store/counter.yaml');
    const lines = counter.stockLines as Array<{ itemTemplatePath: string }>;
    expect(lines.some((l) => l.itemTemplatePath === '/trade/farming/thing/seed/kok-saghyz')).toBe(true);
  });
});
