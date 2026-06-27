/**
 * Menu — the offer object. `resolveOrder` maps an order keyword to an
 * *offered* recipe id (gates on the offer, not craftability), declining
 * un-offered or unknown drinks.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Menu from '../Menu';
import RecipeCatalogue from '../../../obj/RecipeCatalogue';
import { StuffApi } from '../../../api/stuff';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';

let store: Record<string, Record<string, unknown>[]>;

beforeEach(async () => {
  store = {
    recipes: [
      { recipeId: 'martini', name: 'Gin Martini', keywords: ['martini'], inputSlots: [], toolCapabilities: [], outputTemplate: '/x', outputMaterial: '/y', baseGradeBand: '' },
      { recipeId: 'daiquiri', name: 'Daiquiri', keywords: ['daiquiri'], inputSlots: [], toolCapabilities: [], outputTemplate: '/x', outputMaterial: '/y', baseGradeBand: '' },
    ],
  };
  StuffApi.clearAll();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) =>
      (store[col] ?? []).filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never,
  );
  const catalogue = makeStuffAtPath(() => new RecipeCatalogue(), '/obj/RecipeCatalogue');
  await catalogue.warm();
});

afterEach(() => vi.restoreAllMocks());

describe('Menu.resolveOrder', () => {
  it('resolves an offered cocktail by keyword to its recipe id', async () => {
    const menu = makeStuff(() => new Menu());
    menu.setOfferedRecipes(['martini']);
    expect(await menu.resolveOrder('martini')).toBe('martini');
  });

  it('declines a cocktail the catalogue knows but the menu does not offer', async () => {
    const menu = makeStuff(() => new Menu());
    menu.setOfferedRecipes(['martini']); // daiquiri exists but is not offered here
    expect(await menu.resolveOrder('daiquiri')).toBeNull();
  });

  it('declines an unknown cocktail', async () => {
    const menu = makeStuff(() => new Menu());
    menu.setOfferedRecipes(['martini', 'daiquiri']);
    expect(await menu.resolveOrder('mai-tai')).toBeNull();
  });
});
