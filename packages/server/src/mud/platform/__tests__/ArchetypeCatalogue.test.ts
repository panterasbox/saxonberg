/**
 * The venue archetype at runtime (libations 1e): the catalogue warms
 * from `documents {kind: archetype}`; `describe` DERIVES the tool/heat
 * rows from the industry's recipes and merges them into the authored
 * slots; `checklist` reports what a venue satisfies and never refuses;
 * `materialize` builds the derived test venue from the defaults.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DocumentApi } from '../../api/document';
import { StuffApi } from '../../api/stuff';
import { ArchetypeApi } from '../../api/archetype';
import { ContainmentApi } from '../../api/containment';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { Quantity } from '../../lib/quantity';
import ArchetypeCatalogue from '../idea/ArchetypeCatalogue';
import RecipeCatalogue from '../idea/RecipeCatalogue';
import Room from '../location/Room';
import Thing from '../../lib/stuff/Thing';
import { ToolMixin } from '../../lib/craft/Tooled';
import { SurfacedMixin } from '../../lib/spatial/Surfaced';
import type { StoredDocument } from '../../lib/document/StoredDocument';
import type { Stuff } from '../../lib/stuff/Stuff';

class Bench extends SurfacedMixin(Thing) {}
class Tool extends ToolMixin(Thing) {}

function doc(path: string, data: Record<string, unknown>): StoredDocument {
  return { getPath: () => path, getData: () => data, getKind: () => path.includes('/recipes/') ? 'recipe' : 'archetype' } as unknown as StoredDocument;
}

const BAR = {
  archetypeId: 'hospitality',
  label: 'a hospitality venue',
  industry: 'bartending',
  capabilities: [
    { key: 'surface', needs: { surface: true }, default: '/fx/thing/bench' },
    { key: 'dispensing', needs: { tool: 'tap' }, default: '/fx/thing/tap' },
    { key: 'seating', needs: { seating: 1 } },
    // Cold storage has no default: it is a property of a SPACE (a cellar,
    // a walk-in), and you cannot clone a room into a room.
    { key: 'cold', needs: { coldStorage: true } },
  ],
};
const RECIPES = [
  { recipeId: 'pint', name: 'pint', discipline: 'bartending', toolCapabilities: ['tap'], outputTemplate: '/fx/thing/pint', inputSlots: [{ kind: 'bulk', category: 'x', measureL: 0.01 }] },
  { recipeId: 'martini', name: 'martini', discipline: 'bartending', toolCapabilities: ['mixing-glass', 'strainer'], outputTemplate: '/fx/thing/coupe', inputSlots: [{ kind: 'bulk', category: 'x', measureL: 0.01 }] },
  { recipeId: 'syrup', name: 'simple syrup', discipline: 'bartending', toolCapabilities: ['pot'], requiresHeatK: 340, outputTemplate: '/fx/thing/bottle', inputSlots: [{ kind: 'bulk', category: 'x', measureL: 0.01 }] },
  { recipeId: 'poker', name: 'fire poker', discipline: 'smithing', toolCapabilities: ['anvil'], requiresHeatK: 1400, outputTemplate: '/fx/thing/poker', inputSlots: [{ kind: 'bulk', category: 'x', measureL: 0.01 }] },
];

let seq = 0;

describe('ArchetypeApi', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(DocumentApi, 'listOfKind').mockImplementation(async (kind: string) =>
      kind === 'archetype'
        ? [doc('/trade/fx/archetypes/hospitality', BAR), doc('/trade/fx/archetypes/broken', { archetypeId: 'broken' })]
        : RECIPES.map((r) => doc(`/trade/fx/recipes/${r.recipeId}`, r)),
    );
    const cat = makeStuffAtPath(() => new ArchetypeCatalogue(), '/platform/idea/ArchetypeCatalogue');
    await cat.warm();
    const rec = makeStuffAtPath(() => new RecipeCatalogue(), '/platform/idea/RecipeCatalogue');
    await rec.warm();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('warms from the document store; a malformed row is skipped loudly, never fatal', () => {
    expect(ArchetypeApi.all().map((a) => a.getArchetypeId())).toEqual(['hospitality']);
    expect(ArchetypeApi.describe('nope')).toBeNull();
  });

  it('describe derives the tool/heat rows from the INDUSTRY’s recipes and merges into authored slots', () => {
    const d = ArchetypeApi.describe('hospitality')!;
    const byKey = new Map(d.rows.map((r) => [r.key, r]));
    // The authored `dispensing` slot IS the derived `tool:tap` — merged, default kept.
    expect(byKey.get('dispensing')).toMatchObject({ needs: { tool: 'tap' }, default: '/fx/thing/tap', derivedFrom: ['pint'] });
    // Needs no slot states become rows of their own with no default.
    expect(byKey.get('tool:mixing-glass')).toMatchObject({ default: null, derivedFrom: ['martini'] });
    expect(byKey.get('tool:strainer')).toBeDefined();
    expect(byKey.get('heatK')).toMatchObject({ needs: { heatK: 340 }, derivedFrom: ['syrup'] });
    // Another industry's recipe contributes nothing.
    expect(byKey.get('tool:anvil')).toBeUndefined();
    expect(byKey.get('heatK')!.needs).toEqual({ heatK: 340 });
  });

  it('checklist reports what the venue satisfies — and refuses nothing', () => {
    const venue = makeStuff(() => new Room());
    stampTemplatePathForTest(venue, `/fx/location/venue-${seq++}`);
    const bench = makeStuff(() => new Bench());
    stampTemplatePathForTest(bench, `/fx/thing/bench-${seq++}`);
    const tap = makeStuff(() => new Tool()) as Tool;
    stampTemplatePathForTest(tap, `/fx/thing/tap-${seq++}`);
    tap.capabilities = ['tap'];
    ContainmentApi.move(bench as never, venue as never);
    ContainmentApi.move(tap as never, venue as never);

    const rows = ArchetypeApi.checklist('hospitality', venue as unknown as Stuff)!;
    const sat = new Map(rows.map((r) => [r.key, r.satisfied]));
    expect(sat.get('surface')).toBe(true);
    expect(sat.get('dispensing')).toBe(true);
    expect(sat.get('seating')).toBe(false);
    expect(sat.get('tool:mixing-glass')).toBe(false);
    expect(sat.get('heatK')).toBe(false);
    expect(rows.find((r) => r.key === 'dispensing')!.by).toBeTruthy();
  });

  // ⭐ Cold storage is a property of a SPACE, not a kind of appliance: a
  // cellar is cool because it is underground, a walk-in because a chiller
  // holds it there, and anything carried into either drifts to that
  // through the shipped thermal resolver. The bar shipped a `cold-store`
  // prop that was Thermal + Sealable + Bulkable with NO Container — a
  // 200 L insulated tub of ice that could not hold a keg — and it was the
  // venue's only nominal cold storage.
  it('a cool ROOM is cold storage on its own; a temperate one is not', () => {
    const cold = makeStuff(() => new Room());
    stampTemplatePathForTest(cold, `/fx/location/cellar-${seq++}`);
    cold.setTemperature(Quantity.of(285, 'K'));

    const warm = makeStuff(() => new Room());
    stampTemplatePathForTest(warm, `/fx/location/backroom-${seq++}`);
    warm.setTemperature(Quantity.of(295, 'K'));

    const coldRow = ArchetypeApi.checklist('hospitality', cold as unknown as Stuff)!
      .find((r) => r.key === 'cold')!;
    expect(coldRow.satisfied).toBe(true);
    expect(coldRow.by).toBeTruthy();

    const warmRow = ArchetypeApi.checklist('hospitality', warm as unknown as Stuff)!
      .find((r) => r.key === 'cold')!;
    expect(warmRow.satisfied).toBe(false);
  });

  it('materialize clones the venue row and each authored default into it', async () => {
    const cloned: string[] = [];
    vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
      cloned.push(path);
      const s: Stuff =
        path === '/platform/location/venue'
          ? (makeStuff(() => new Room()) as unknown as Stuff)
          : path.endsWith('bench')
            ? (makeStuff(() => new Bench()) as unknown as Stuff)
            : (makeStuff(() => new Tool()) as unknown as Stuff);
      stampTemplatePathForTest(s, `${path}-${seq++}`);
      if (path.endsWith('tap')) (s as unknown as Tool).capabilities = ['tap'];
      return s;
    });
    const venue = await ArchetypeApi.materialize('hospitality');
    expect(cloned).toEqual(['/platform/location/venue', '/fx/thing/bench', '/fx/thing/tap']);
    expect(venue.getContents().length).toBe(2);
    const rows = ArchetypeApi.checklist('hospitality', venue as unknown as Stuff)!;
    expect(rows.filter((r) => r.satisfied).map((r) => r.key).sort()).toEqual(['dispensing', 'surface']);
  });
});
