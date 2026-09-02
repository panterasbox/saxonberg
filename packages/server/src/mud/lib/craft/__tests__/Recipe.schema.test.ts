/**
 * Recipe schema round-trip — the crafting-branches growth acceptance:
 * old (bar-shape) rows hydrate to byte-identical field values with every
 * new field at its default; new-shape rows (item slots, heat gate,
 * output-application kinds, ladder placement) parse; the slot-kind
 * discriminator behaves.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { Recipe } from '../Recipe';
import RecipeCatalogue from '../../../platform/idea/RecipeCatalogue';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

let store: Record<string, Record<string, unknown>[]>;
let catalogue: RecipeCatalogue;

/** The bar's martini row, exactly as it has always been stored. */
const OLD_ROW = {
  recipeId: 'martini',
  name: 'Gin Martini',
  keywords: ['martini'],
  inputSlots: [
    { slot: 'base', category: 'gin', minGrade: 'fair', measureL: 0.06 },
    { slot: 'mod', category: 'vermouth', minGrade: 'fair', measureL: 0.01 },
  ],
  toolCapabilities: ['mixing-glass'],
  outputTemplate: '/trade/hospitality/thing/coupe',
  outputMaterial: '/stuff/idea/material/cocktail/martini',
  baseGradeBand: '',
};

/** A smithing row exercising every new field. */
const KNIFE_ROW = {
  recipeId: 'belt-knife',
  name: 'Belt Knife',
  keywords: ['knife', 'belt-knife'],
  inputSlots: [
    { slot: 'stock', category: 'ferrous', minGrade: 'fair', kind: 'item', count: 1 },
  ],
  toolCapabilities: ['striking', 'anvil'],
  outputTemplate: '/stuff/thing/arms/belt-knife',
  outputMaterial: '',
  baseGradeBand: '',
  requiresHeatK: 1300,
  outputApplication: 'tangible',
  difficulty: 'standard',
  discipline: 'smithing',
  // The residue output (fermentation P11) — the newest additive field.
  outputResidue: { template: '/stuff/thing/items/slag', count: 1 },
};

/** A cooking row exercising the edible output shape. */
const STEW_ROW = {
  recipeId: 'hearty-stew',
  name: 'Hearty Stew',
  keywords: ['stew'],
  inputSlots: [
    { slot: 'veg', category: 'vegetable', minGrade: 'fair', kind: 'item', count: 2 },
    { slot: 'meat', category: 'meat', minGrade: 'fair', kind: 'item', count: 1 },
  ],
  toolCapabilities: ['pot'],
  outputTemplate: '/obj/food/plated-dish',
  // The derived-blend authoring shape: no substance row; prose on the
  // recipe.
  outputMaterial: '',
  outputAppearance: 'a thick brown stew, roots and meat in a dark gravy',
  baseGradeBand: '',
  requiresHeatK: 373,
  outputApplication: 'edible',
  outputPortionL: 0.4,
  difficulty: 'standard',
  discipline: 'cooking',
};

/** A recipe is a `documents` row of kind `recipe`; the legacy row is its `data`. */
const asDocument = (data: Record<string, unknown>) => ({
  path: `/generic-objects/recipes/${String(data.recipeId)}`,
  owner: '/generic-objects',
  kind: 'recipe',
  data,
});

beforeEach(async () => {
  store = { documents: [OLD_ROW, KNIFE_ROW, STEW_ROW].map(asDocument) };
  StuffApi.clearAll();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) =>
      (store[col] ?? []).filter((d) =>
        Object.entries(query).every(([k, v]) => (d as never)[k] === v),
      ) as never,
  );
  catalogue = makeStuffAtPath(
    () => new RecipeCatalogue(),
    '/platform/idea/RecipeCatalogue',
  );
  await catalogue.warm();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Recipe schema round-trip', () => {
  it('hydrates an old bar row to identical values, defaults on every new field', () => {
    const r = catalogue.getRecipe('martini')!;
    expect(r).not.toBeNull();
    expect(r.getRecipeId()).toBe('martini');
    expect(r.getName()).toBe('Gin Martini');
    expect(r.getKeywords()).toEqual(['martini']);
    expect(r.getInputSlots()).toEqual(OLD_ROW.inputSlots);
    expect(r.getToolCapabilities()).toEqual(['mixing-glass']);
    expect(r.getOutputTemplate()).toBe('/trade/hospitality/thing/coupe');
    expect(r.getOutputMaterial()).toBe('/stuff/idea/material/cocktail/martini');
    expect(r.getBaseGrade()).toBeNull();
    // New fields default: no heat gate, bulk application, no ladder row.
    expect(r.getRequiresHeatK()).toBe(0);
    expect(r.getOutputApplication()).toBe('bulk');
    expect(r.getOutputPortionL()).toBe(0);
    expect(r.getDifficulty()).toBe('');
    expect(r.getDiscipline()).toBe('');
    expect(r.getOutputResidue()).toBeNull();
    for (const slot of r.getInputSlots()) {
      expect(Recipe.isItemSlot(slot)).toBe(false);
    }
  });

  it('hydrates a tangible (smithing) row: item slots, heat gate, ladder', () => {
    const r = catalogue.getRecipe('belt-knife')!;
    expect(r).not.toBeNull();
    expect(r.getRequiresHeatK()).toBe(1300);
    expect(r.getOutputApplication()).toBe('tangible');
    expect(r.getDifficulty()).toBe('standard');
    expect(r.getDiscipline()).toBe('smithing');
    expect(r.getOutputResidue()).toEqual({
      template: '/stuff/thing/items/slag',
      count: 1,
    });
    const slots = r.getInputSlots();
    expect(slots).toHaveLength(1);
    expect(Recipe.isItemSlot(slots[0]!)).toBe(true);
    expect(slots[0]!.count).toBe(1);
    expect(slots[0]!.measureL).toBeUndefined();
  });

  it('hydrates an edible (cooking) row: portion + edible application', () => {
    const r = catalogue.getRecipe('hearty-stew')!;
    expect(r).not.toBeNull();
    expect(r.getOutputApplication()).toBe('edible');
    expect(r.getOutputPortionL()).toBeCloseTo(0.4, 9);
    expect(r.getOutputMaterial()).toBe(''); // derived — no substance row
    expect(r.getOutputAppearance()).toMatch(/thick brown stew/);
    expect(r.getRequiresHeatK()).toBe(373);
    const slots = r.getInputSlots();
    expect(slots.every((s) => Recipe.isItemSlot(s))).toBe(true);
  });

  it('maps an unknown stored outputApplication word to bulk (fail-safe)', () => {
    const r = new Recipe();
    r.outputApplication = 'garbage';
    expect(r.getOutputApplication()).toBe('bulk');
  });

  it('carries the document path, and toData round-trips fromData', () => {
    const r = catalogue.getRecipe('belt-knife')!;
    expect(r.path).toBe('/generic-objects/recipes/belt-knife');
    expect(Recipe.fromData(r.toData()).toData()).toEqual(r.toData());
  });

  it('refuses what the retired seeder refused: empty inputSlots, missing outputTemplate', () => {
    expect(() => Recipe.fromData({ recipeId: 'x', inputSlots: [], outputTemplate: '/t' })).toThrow(/inputSlots/);
    expect(() => Recipe.fromData({ recipeId: 'x', inputSlots: [{}] })).toThrow(/outputTemplate/);
  });
});

describe('RecipeCatalogue.invalidateCache + warm', () => {
  it('picks up a row added after the first warm', async () => {
    expect(catalogue.knows('new-thing')).toBe(false);
    store.documents!.push(asDocument({ ...OLD_ROW, recipeId: 'new-thing', name: 'New', keywords: ['new'] }));
    catalogue.invalidateCache();
    expect(catalogue.allRecipes()).toEqual([]); // dropped; the read surface is sync
    await catalogue.warm();
    expect(catalogue.knows('new-thing')).toBe(true);
    expect(catalogue.findByKeyword('new')?.getRecipeId()).toBe('new-thing');
  });
});
