import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ZoneApi } from '../../../api/zone';
import { PersistenceManager, Collections } from '../../../../backend/PersistenceManager';
import FolderZone from '../FolderZone';
import { Zone } from '../Zone';
import { makeStuff } from '../../security/__tests__/test-setup';

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
    if (collection !== Collections.Domain) return [];
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
        class: '/lib/spatial/CartesianZone',
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
        class: '/lib/zone/FolderZone',
        data: {},
      },
      {
        path: '/narnia/castle',
        class: '/lib/spatial/CartesianZone',
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
        class: '/lib/spatial/CartesianZone',
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
        class: '/lib/zone/FolderZone',
        data: {},
      },
      {
        path: '/eternal/university',
        class: '/lib/spatial/CartesianZone',
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
        class: '/lib/zone/FolderZone',
        data: {},
      },
      {
        path: '/outer/middle',
        class: '/lib/zone/FolderZone',
        data: {},
      },
      {
        path: '/outer/middle/inner',
        class: '/lib/spatial/CartesianZone',
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

  it('ZoneApi.getEnclosingZone returns nearest Zone-class template ancestor', async () => {
    installInMemoryStore([
      {
        path: '/zone',
        class: '/lib/zone/FolderZone',
        data: {},
      },
      {
        path: '/zone/sub',
        class: '/lib/spatial/CartesianZone',
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
