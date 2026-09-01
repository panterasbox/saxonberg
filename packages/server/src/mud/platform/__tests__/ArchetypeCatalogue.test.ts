/**
 * The venue archetype at runtime (libations 1e): the catalogue warms
 * from `documents {kind: archetype}`; `describe()` DERIVES the tool/heat
 * rows from the industry's recipes and merges them into the authored
 * slots; `materialize()` builds the derived test venue from the defaults.
 *
 * ⭐ An archetype describes and materializes ITSELF — there is no
 * `ArchetypeApi` (see `Archetype`'s docstring for why), and no
 * `checklist`: D11 said *no runtime enforcement*, so a reporting surface
 * nothing read was the does-nothing shape.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DocumentApi } from '../../api/document';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import ArchetypeCatalogue from '../idea/ArchetypeCatalogue';
import RecipeCatalogue from '../idea/RecipeCatalogue';
import SingletonCartesianLocation from '../location/SingletonCartesianLocation';
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

/**
 * A genuinely malformed row. It states TWO needs in one capability,
 * which is the validator's own rule ("exactly ONE need") — it used to be
 * a row with no `industry`, but a room archetype legitimately has none
 * (residences D15), so absence stopped being an error and this fixture
 * had to say something that is still wrong.
 */
const BROKEN = {
  archetypeId: 'broken',
  capabilities: [{ key: 'muddle', needs: { surface: true, seating: 1 } }],
};

let seq = 0;
let catalogue: ArchetypeCatalogue;

describe('the venue archetype', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(DocumentApi, 'listOfKind').mockImplementation(async (kind: string) =>
      kind === 'archetype'
        ? [doc('/trade/fx/archetypes/hospitality', BAR), doc('/trade/fx/archetypes/broken', BROKEN)]
        : RECIPES.map((r) => doc(`/trade/fx/recipes/${r.recipeId}`, r)),
    );
    catalogue = makeStuffAtPath(() => new ArchetypeCatalogue(), '/platform/idea/ArchetypeCatalogue');
    await catalogue.warm();
    const rec = makeStuffAtPath(() => new RecipeCatalogue(), '/platform/idea/RecipeCatalogue');
    await rec.warm();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('warms from the document store; a malformed row is skipped loudly, never fatal', () => {
    expect(catalogue.allArchetypes().map((a) => a.getArchetypeId())).toEqual(['hospitality']);
    expect(catalogue.getArchetype('nope')).toBeNull();
  });

  it('describe derives the tool/heat rows from the INDUSTRY’s recipes and merges into authored slots', () => {
    const d = catalogue.getArchetype('hospitality')!.describe();
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

  it('materialize clones the venue row and each authored default into it', async () => {
    const cloned: string[] = [];
    vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
      cloned.push(path);
      const s: Stuff =
        path === '/platform/location/venue'
          ? (makeStuff(() => new SingletonCartesianLocation()) as unknown as Stuff)
          : path.endsWith('bench')
            ? (makeStuff(() => new Bench()) as unknown as Stuff)
            : (makeStuff(() => new Tool()) as unknown as Stuff);
      stampTemplatePathForTest(s, `${path}-${seq++}`);
      if (path.endsWith('tap')) (s as unknown as Tool).capabilities = ['tap'];
      return s;
    });
    const venue = await catalogue.getArchetype('hospitality')!.materialize();
    expect(cloned).toEqual(['/platform/location/venue', '/fx/thing/bench', '/fx/thing/tap']);
    expect(venue.getContents().length).toBe(2);
  });
});
