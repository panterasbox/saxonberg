import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ZoneApi } from '../zone';
import { ZoneLogic } from '../../obj/api/ZoneLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import { ContainmentApi } from '../containment';
import { PersistenceManager, Collections } from '../../../backend/PersistenceManager';
import CartesianLocation from '../../lib/location/CartesianLocation';
import Thing from '../../lib/stuff/Thing';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { Stuff } from '../../lib/stuff/Stuff';

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
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('returns the nearest-ancestor zone template', async () => {
    installInMemoryStore([
      {
        path: '/narnia/castle',
        class: '/obj/location/CartesianZone',
        data: { name: 'Castle' },
      },
      {
        path: '/narnia/castle/foyer',
        class: '/obj/location/Room',
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
        class: '/obj/location/CartesianZone',
        data: {},
      },
      {
        path: '/narnia/castle',
        class: '/obj/location/SphericalZone',
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
        class: '/obj/location/Room',
        data: {},
      },
    ]);
    expect(await ZoneApi.resolveZoneForPath('/orphan/leaf')).toBeNull();
  });

  it('returns null when the template at path is itself a Zone', async () => {
    installInMemoryStore([
      {
        path: '/narnia',
        class: '/obj/location/CartesianZone',
        data: { name: 'Narnia' },
      },
    ]);
    expect(await ZoneApi.resolveZoneForPath('/narnia')).toBeNull();
  });

  it('caches clones — same zone object across calls', async () => {
    installInMemoryStore([
      {
        path: '/narnia/castle',
        class: '/obj/location/CartesianZone',
        data: { name: 'Castle' },
      },
    ]);
    const first = await ZoneApi.resolveZoneForPath('/narnia/castle/foyer');
    const second = await ZoneApi.resolveZoneForPath('/narnia/castle/library');
    expect(first).toBe(second);
  });

  it('resolves the same zone instance via StuffApi.findById', async () => {
    installInMemoryStore([
      {
        path: '/narnia/castle',
        class: '/obj/location/CartesianZone',
        data: { name: 'Castle' },
      },
    ]);
    const zone = await ZoneApi.resolveZoneForPath('/narnia/castle/foyer');
    expect(zone).not.toBeNull();
    expect(StuffApi.findById(zone!.stuffId)).toBe(zone);
  });

  it('singleton(path) returns same instance as resolveZoneForPath', async () => {
    installInMemoryStore([
      {
        path: '/narnia/castle',
        class: '/obj/location/CartesianZone',
        data: { name: 'Castle' },
      },
    ]);
    const zone = await ZoneApi.resolveZoneForPath('/narnia/castle/foyer');
    const direct = await StuffApi.singleton('/narnia/castle');
    expect(direct).toBe(zone);
  });

  it('skips a non-spatial folder ancestor (Clade) during the walk', async () => {
    // Clade extends Zone (so ZoneApi.isFolderClass returns true) but
    // does NOT extend SpatialZone (so isSpatialZoneClass returns
    // false). A species member at this path has no spatial zone
    // ancestor, so the walk returns null even though
    // /obj/species/animalia is a legal folder ancestor.
    installInMemoryStore([
      {
        path: '/obj/species/animalia',
        class: '/obj/species/Clade',
        data: { name: 'Animalia', rank: 'kingdom' },
      },
    ]);
    expect(
      await ZoneApi.resolveZoneForPath('/obj/species/animalia/foo')
    ).toBeNull();
  });

  it('clone() of an already-instantiated singleton zone throws', async () => {
    installInMemoryStore([
      {
        path: '/narnia/castle',
        class: '/obj/location/CartesianZone',
        data: { name: 'Castle' },
      },
    ]);
    await ZoneApi.resolveZoneForPath('/narnia/castle/foyer');
    await expect(StuffApi.clone('/narnia/castle')).rejects.toThrow(
      /SingletonMixin/,
    );
  });
});

describe('Zone is set at clone time, not on move', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('move does not restamp the item zone', async () => {
    const park = makeStuff(() => new CartesianLocation());

    const zoneRef = { stuffId: 'zone-123' } as unknown as import('../../lib/zone/SpatialZone').SpatialZone;
    Stuff._stampZone(park, zoneRef);

    // Item created without a zone — `ContainmentApi.move` does NOT
    // back-fill it. Zone identity belongs to whichever template
    // spawned the item; runtime placement leaves it alone.
    const sword = await StuffApi.create(() => new Thing());
    expect(sword.getZone()).toBeNull();

    ContainmentApi.move(sword, park);
    expect(sword.getZone()).toBeNull();
  });
});

describe('ZoneLogic singleton encapsulation', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('lives at /obj/api/zone once the facade has materialized it', async () => {
    // A facade call lazily creates the logic singleton.
    await ZoneApi.isFolderClass('/no/such/class');
    const logic = StuffApi.findByTemplatePath('/obj/api/zone');
    expect(logic).toBeDefined();
    expect(StuffApi.findByPathGlob('/obj/api/*')).toContain(logic);
  });

  it('denies a direct logic-method call from a non-ZoneApi caller', async () => {
    await ZoneApi.isFolderClass('/no/such/class');
    const logic = StuffApi.findByTemplatePath<ZoneLogic>('/obj/api/zone');
    expect(logic).toBeDefined();
    // The test module is not `mud/api/zone#ZoneApi`, so the FromModule
    // gate on the logic's own methods denies the call. The gate denies
    // synchronously inside the proxy (before the async body runs), so
    // the throw is synchronous even though the method is async.
    expect(() => logic!.isFolderClass('/no/such/class')).toThrow(SecurityError);
  });
});
