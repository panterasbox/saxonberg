import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ZoneApi } from '../zone';
import { StuffApi } from '../stuff';
import { PersistenceManager, Collections } from '../../../backend/PersistenceManager';
import { FolderZone } from '../../lib/zone/FolderZone';
import { Zone } from '../../lib/zone/Zone';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

/**
 * Tests for `ZoneApi.resolveZoneField` — template-ancestry inheritance
 * walk. The helper reads `fieldName` first on the zone itself, then
 * walks ancestor folders (FolderZone, HomeZone, SpatialZone subclasses,
 * Clade — every Zone subclass participates), and returns the nearest
 * non-null/non-undefined value, or `null` at universe-root.
 *
 * The tests use a fixture FieldFixture class with a nullable
 * `celestialProfile` field. The default `null` lets the walk continue
 * past zones that haven't set their own value — distinct from `Zone.name`,
 * which is `string` with `''` default and so always "defined."
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

describe('ZoneApi.resolveZoneField', () => {
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
    const value = await ZoneApi.resolveZoneField<string>(zone, 'name');
    expect(value).toBe('Castle');
  });

  it('walks ancestors and returns the nearest non-null value', async () => {
    // The descendant zone has no value for the field (null default
    // after the runtime stamp); the parent folder defines it.
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
    // Plant a runtime-only field on the parent zone — the walk uses
    // reflective access so a non-`persistentFields` field is fine for
    // exercising the helper.
    (folder as unknown as Record<string, unknown>).celestialProfile =
      'starlit';
    const castle = await StuffApi.singleton<Zone>('/narnia/castle');
    const value = await ZoneApi.resolveZoneField<string>(
      castle,
      'celestialProfile'
    );
    expect(value).toBe('starlit');
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
    const value = await ZoneApi.resolveZoneField<string>(
      castle,
      'doesNotExist'
    );
    expect(value).toBeNull();
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
    const value = await ZoneApi.resolveZoneField<string>(university, 'biome');
    expect(value).toBe('temperate');
  });

  it('handles a Zone without a templatePath gracefully — own field only', async () => {
    // Orphan zone — no templatePath. The walk reads only its own field
    // and returns null when nothing matches.
    const orphan = makeStuff(() => new FolderZone());
    const empty = await ZoneApi.resolveZoneField<string>(
      orphan,
      'doesNotExist'
    );
    expect(empty).toBeNull();
    (orphan as unknown as Record<string, unknown>).biome = 'arctic';
    const named = await ZoneApi.resolveZoneField<string>(orphan, 'biome');
    expect(named).toBe('arctic');
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
    const value = await ZoneApi.resolveZoneField<string>(inner, 'biome');
    expect(value).toBe('middle-biome'); // nearest non-null wins
  });
});
