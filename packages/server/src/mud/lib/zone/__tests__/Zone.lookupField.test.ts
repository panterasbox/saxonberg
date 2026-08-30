import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ZoneApi } from '../../../api/zone';
import { PersistenceManager, Collections } from '../../../../backend/PersistenceManager';
import FolderZone from '../../../platform/idea/FolderZone';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import { Zone } from '../Zone';
import { makeStuff } from '../../security/__tests__/test-setup';
import { MixinApi } from '../../../api/mixin';

/**
 * Tests for `Zone.lookupField` — the template-ancestry inheritance
 * walk. Reads the field on this zone first, then delegates to the
 * enclosing zone's `lookupField` (recursion handles the upward walk).
 * Returns the nearest non-null value, or `null` at universe-root.
 *
 * Subclasses can override `lookupAncestorField` to alter the walk
 * (e.g., a `RootedZone` returning null to stop inheritance at
 * itself). The `RootedZone barrier` test below proves the seam works.
 *
 * The tests use a runtime-only `celestialProfile` / `biome` field —
 * Zone's `name` defaults to empty string, which is a defined value
 * per the `!= null` semantics, so it's not useful for exercising
 * the walk.
 */

type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
  data: Record<string, unknown>;
};

function installInMemoryStore(initial: Doc[] = []): Doc[] {
  const store: Doc[] = initial.map((d, i) => ({ _id: String(i + 1), ...d }));

  const save = vi.fn(async (_collection: string, doc: Doc) => {
    const copy = { ...doc };
    if (copy._id) {
      const idx = store.findIndex((d) => d._id === copy._id);
      if (idx >= 0) store[idx] = copy;
      else store.push(copy);
      return copy._id!;
    }
    copy._id = String(store.length + 1);
    store.push(copy);
    return copy._id;
  });

  const find = vi.fn(async (collection: string, query: Record<string, unknown>) => {
    if (collection !== Collections.Content) return [];
    if (typeof query.path === 'string') {
      return store.filter((d) => d.path === query.path);
    }
    return store.slice();
  });

  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
  } as unknown as PersistenceManager);

  return store;
}

describe('Zone.lookupField', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('returns the value defined on the zone itself when present', async () => {
    installInMemoryStore([
      {
        path: '/narnia/castle',
        class: '/platform/idea/location/CartesianZone',
        data: {},
      },
    ]);
    const zone = await StuffApi.singleton<Zone>('/narnia/castle');
    zone.setName('Castle');
    expect(await zone.lookupField<string>('name')).toBe('Castle');
  });

  it('walks ancestors and returns the nearest non-null value', async () => {
    installInMemoryStore([
      {
        path: '/narnia',
        class: '/platform/idea/FolderZone',
        data: {},
      },
      {
        path: '/narnia/castle',
        class: '/platform/idea/location/CartesianZone',
        data: {},
      },
    ]);
    const folder = await StuffApi.singleton<Zone>('/narnia');
    (folder as unknown as Record<string, unknown>).celestialProfile = 'starlit';
    const castle = await StuffApi.singleton<Zone>('/narnia/castle');
    expect(
      await castle.lookupField<string>('celestialProfile')
    ).toBe('starlit');
  });

  it('returns null when no ancestor defines the field', async () => {
    installInMemoryStore([
      {
        path: '/narnia/castle',
        class: '/platform/idea/location/CartesianZone',
        data: {},
      },
    ]);
    const castle = await StuffApi.singleton<Zone>('/narnia/castle');
    expect(await castle.lookupField<string>('doesNotExist')).toBeNull();
  });

  it('walks through FolderZones (non-spatial folders are inheritance nodes)', async () => {
    installInMemoryStore([
      {
        path: '/eternal',
        class: '/platform/idea/FolderZone',
        data: {},
      },
      {
        path: '/eternal/university',
        class: '/platform/idea/location/CartesianZone',
        data: {},
      },
    ]);
    const eternal = await StuffApi.singleton<Zone>('/eternal');
    (eternal as unknown as Record<string, unknown>).biome = 'temperate';
    const university = await StuffApi.singleton<Zone>('/eternal/university');
    expect(await university.lookupField<string>('biome')).toBe('temperate');
  });

  it('handles a Zone without a templatePath gracefully — own field only', async () => {
    const orphan = makeStuff(() => new FolderZone());
    expect(await orphan.lookupField<string>('doesNotExist')).toBeNull();
    (orphan as unknown as Record<string, unknown>).biome = 'arctic';
    expect(await orphan.lookupField<string>('biome')).toBe('arctic');
  });

  it('prefers nearest non-null ancestor value over deeper-root', async () => {
    installInMemoryStore([
      {
        path: '/outer',
        class: '/platform/idea/FolderZone',
        data: {},
      },
      {
        path: '/outer/middle',
        class: '/platform/idea/FolderZone',
        data: {},
      },
      {
        path: '/outer/middle/inner',
        class: '/platform/idea/location/CartesianZone',
        data: {},
      },
    ]);
    const outer = await StuffApi.singleton<Zone>('/outer');
    (outer as unknown as Record<string, unknown>).biome = 'outer-biome';
    const middle = await StuffApi.singleton<Zone>('/outer/middle');
    (middle as unknown as Record<string, unknown>).biome = 'middle-biome';
    const inner = await StuffApi.singleton<Zone>('/outer/middle/inner');
    expect(await inner.lookupField<string>('biome')).toBe('middle-biome');
  });
});

describe('Zone.lookupAncestorField — override seam for barrier subclasses', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a subclass overriding lookupAncestorField becomes an inheritance barrier', async () => {
    /**
     * Demonstrates the extension point: a `RootedZone` subclass
     * overrides `lookupAncestorField` to return null, ignoring any
     * ancestor-defined values. The descendant's own value still
     * wins; nothing flows in from above.
     */
    class RootedZone extends Zone {
      public override async lookupAncestorField<T>(
        _fieldName: string
      ): Promise<T | null> {
        return null;
      }
    }
    const rooted = makeStuff(() => new RootedZone());
    // Without an own value, lookupField returns null even when a
    // template ancestor (would-be) sets the field.
    expect(await rooted.lookupField<string>('biome')).toBeNull();
    // With an own value, it surfaces.
    (rooted as unknown as Record<string, unknown>).biome = 'self-defined';
    expect(await rooted.lookupField<string>('biome')).toBe('self-defined');
  });

  /**
   * ⭐ The region fields live on `SpatialZone`, not on `Zone`.
   *
   * They arrived on the base in the libations build and were moved down
   * on review: only a region IN SPACE can stock goods, while a
   * `FolderZone` is a namespace root (`/wiki`, `/home`, `/studio`) — and
   * an `authorable` field on the base offers "how many bottles of vodka
   * stand here" for every zone in the game, in the studio panel.
   *
   * The pair below is the whole contract: a spatial zone resolves what it
   * authored, and a folder zone yields the reader's empty default rather
   * than carrying a field it can never mean anything by. Behaviour is
   * unchanged because `lookupField` walks ancestors either way.
   */
  it('a SpatialZone carries the region fields and resolves what it authored', async () => {
    const yard = makeStuff(() => new CartesianZone());
    yard.setStocks({ 'spirit:vodka': 24 });
    yard.setFavours(['spirit']);
    yard.setBlessingOdds({ cursed: 3, uncursed: 95, blessed: 2 });

    expect(await yard.lookupField<Record<string, number>>('stocks')).toMatchObject({
      'spirit:vodka': 24,
    });
    expect(await yard.lookupField<string[]>('favours')).toEqual(['spirit']);
    expect(await yard.lookupField<unknown>('blessingOdds')).toMatchObject({ blessed: 2 });
  });

  it('a FolderZone does not carry them, and the reader takes its empty default', async () => {
    const namespaceRoot = makeStuff(() => new FolderZone());
    // Not merely unset — the field does not exist on this class at all.
    expect('stocks' in (namespaceRoot as unknown as Record<string, unknown>)).toBe(false);
    expect('favours' in (namespaceRoot as unknown as Record<string, unknown>)).toBe(false);

    // The walk finds nothing and returns null, which is exactly what
    // `ResidencyLogic.regionStockFor` turns into `{}` / `[]`.
    expect(await namespaceRoot.lookupField<Record<string, number>>('stocks')).toBeNull();
    expect(await namespaceRoot.lookupField<string[]>('favours')).toBeNull();
  });

  /**
   * ⚠ The Hydrator reflects into fields it finds in the merged
   * `fieldMeta` chain, so an UNDECLARED field is silently dropped from a
   * template's `data:` — the bug `stocks`/`favours` had before libations
   * declared them, and which `blessingOdds` still had afterwards:
   * `ResidencyLogic` read `lookupField('blessingOdds')` and the
   * documented zone-wide BUC override could never fire, because nothing
   * ever put a value there to be read.
   *
   * This asserts the declaration itself, since that is what the Hydrator
   * consults — a `lookupField` test alone would pass on a hand-set value
   * and hide the drop.
   */
  it('all three region fields are DECLARED on the spatial chain, so the Hydrator can reach them', () => {
    const spatial = MixinApi.getAllFieldMeta(CartesianZone);
    for (const field of ['stocks', 'favours', 'blessingOdds']) {
      expect(spatial[field], `${field} declared`).toBeDefined();
    }
    // And the base still owns only what a zone IS.
    const folder = MixinApi.getAllFieldMeta(FolderZone);
    expect(folder.name).toBeDefined();
    for (const field of ['stocks', 'favours', 'blessingOdds']) {
      expect(folder[field], `${field} absent from a namespace root`).toBeUndefined();
    }
  });

  it('ZoneApi.getEnclosingZone returns nearest Zone-class template ancestor', async () => {
    installInMemoryStore([
      {
        path: '/zone',
        class: '/platform/idea/FolderZone',
        data: {},
      },
      {
        path: '/zone/sub',
        class: '/platform/idea/location/CartesianZone',
        data: {},
      },
    ]);
    const sub = await StuffApi.singleton<Zone>('/zone/sub');
    const parent = await ZoneApi.getEnclosingZone(sub);
    expect(parent).not.toBeNull();
    expect(parent!.getTemplatePath()).toBe('/zone');
    // The root has no enclosing zone.
    const root = await StuffApi.singleton<Zone>('/zone');
    expect(await ZoneApi.getEnclosingZone(root)).toBeNull();
  });
});
