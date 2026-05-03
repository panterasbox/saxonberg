import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ZoneApi } from './zone';
import { StuffApi } from './stuff';
import { ContainmentApi } from './containment';
import { PersistenceManager, Collections } from '../../backend/PersistenceManager';
import { CartesianLocation } from '../lib/spatial/CartesianLocation';
import { Thing } from '../lib/stuff/Thing';
import { makeStuff } from '../lib/security/test-setup';

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

describe('ZoneApi.resolveZoneForPath', () => {
  beforeEach(() => {
    ZoneApi.clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    ZoneApi.clearCache();
  });

  it('returns the nearest-ancestor zone template', async () => {
    installInMemoryStore([
      {
        path: '/narnia/castle',
        class: '/lib/spatial/CartesianZone',
        data: { name: 'Castle' },
      },
      {
        path: '/narnia/castle/foyer',
        class: '/lib/spatial/CartesianLocation',
        data: {},
      },
    ]);

    const zone = await ZoneApi.resolveZoneForPath('/narnia/castle/foyer');
    expect(zone).not.toBeNull();
    expect(zone!.constructor.name).toMatch(/CartesianZone/);
  });

  it('prefers nearest-ancestor over deeper-root zones', async () => {
    // Outer zone is Cartesian, inner is Spherical — the class of the
    // resolved zone tells us which ancestor won without depending on data
    // interpolation during cloning.
    installInMemoryStore([
      {
        path: '/narnia',
        class: '/lib/spatial/CartesianZone',
        data: {},
      },
      {
        path: '/narnia/castle',
        class: '/lib/spatial/SphericalZone',
        data: {},
      },
    ]);

    const zone = await ZoneApi.resolveZoneForPath('/narnia/castle/foyer');
    expect(zone).not.toBeNull();
    expect(zone!.constructor.name).toMatch(/SphericalZone/);
  });

  it('returns null when no ancestor is a Zone template', async () => {
    installInMemoryStore([
      {
        path: '/orphan/leaf',
        class: '/lib/spatial/CartesianLocation',
        data: {},
      },
    ]);
    expect(await ZoneApi.resolveZoneForPath('/orphan/leaf')).toBeNull();
  });

  it('returns null when the template at path is itself a Zone', async () => {
    installInMemoryStore([
      {
        path: '/narnia',
        class: '/lib/spatial/CartesianZone',
        data: { name: 'Narnia' },
      },
    ]);
    expect(await ZoneApi.resolveZoneForPath('/narnia')).toBeNull();
  });

  it('caches clones — same zone object across calls', async () => {
    installInMemoryStore([
      {
        path: '/narnia/castle',
        class: '/lib/spatial/CartesianZone',
        data: { name: 'Castle' },
      },
    ]);
    const first = await ZoneApi.resolveZoneForPath('/narnia/castle/foyer');
    const second = await ZoneApi.resolveZoneForPath('/narnia/castle/library');
    expect(first).toBe(second);
  });

  it('resolveById finds a previously cloned zone', async () => {
    installInMemoryStore([
      {
        path: '/narnia/castle',
        class: '/lib/spatial/CartesianZone',
        data: { name: 'Castle' },
      },
    ]);
    const zone = await ZoneApi.resolveZoneForPath('/narnia/castle/foyer');
    expect(zone).not.toBeNull();
    expect(ZoneApi.resolveById(zone!.stuffId)).toBe(zone);
  });
});

describe('Runtime-fallback zone stamp', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stamps a newly-created Thing on first placement and stays put after', async () => {
    const park = makeStuff(() => new CartesianLocation());
    const park2 = makeStuff(() => new CartesianLocation());

    // Manually stamp a zone on both rooms (simulating clone-time stamping).
    const zoneRef = { stuffId: 'zone-123' } as unknown as import('../lib/spatial/Zone').Zone;
    park.zone = zoneRef;
    park2.zone = zoneRef;

    const sword = await StuffApi.create(() => new Thing());
    expect(sword.zone).toBeNull();

    ContainmentApi.move(sword, park);
    expect(sword.zone).toBe(zoneRef);

    // Second move in the same zone should leave the stamp alone (idempotent).
    ContainmentApi.move(sword, park2);
    expect(sword.zone).toBe(zoneRef);
  });
});
