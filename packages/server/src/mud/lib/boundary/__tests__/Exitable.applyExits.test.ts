import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CartesianLocation from '../../location/CartesianLocation';
import Door from '../Door';
import { PersistenceManager, Collections } from '../../../../backend/PersistenceManager';
import { StuffApi } from '../../../api/stuff';
import PersistentHydrator from '../../persistence/PersistentHydrator';
import {
  makeStuffAtPath,
  makeStuff,
} from '../../security/__tests__/test-setup';

/**
 * Tests for `ExitableMixin.applyExits` — the instruction-field
 * applier per declarative-content-slate § exits on ExitableMixin.
 */
type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
};

function installInMemoryStore(initial: Doc[] = []): Doc[] {
  const store: Doc[] = initial.map((d, i) => ({ _id: String(i + 1), ...d }));

  const save = vi.fn(async (_c: string, doc: Doc) => {
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

describe('Exitable.applyExits', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a plain cardinal exit installs ONE edge (no auto-reciprocal)', async () => {
    installInMemoryStore([
      {
        path: '/zone',
        class: '/lib/location/CartesianZone',
        data: {},
      },
    ]);
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');

    await a.applyExits({
      north: { destination: '/zone/b' },
    });

    // Only a's own edge is installed; the return trip is a separate
    // declaration on b's template (exits are explicit on both sides).
    expect(a.getExit('north')?.getDestination()).toBe(b);
    expect(b.getExit('south')).toBeUndefined();
  });

  it('bidirectional: true installs the reciprocal too (explicit opt-in)', async () => {
    installInMemoryStore([
      {
        path: '/zone',
        class: '/lib/location/CartesianZone',
        data: {},
      },
    ]);
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');

    await a.applyExits({
      north: { destination: '/zone/b', bidirectional: true },
    });

    expect(a.getExit('north')?.getDestination()).toBe(b);
    expect(b.getExit('south')?.getDestination()).toBe(a);
  });

  it('installs a door transitively via door: path', async () => {
    installInMemoryStore([
      {
        path: '/zone',
        class: '/lib/location/CartesianZone',
        data: {},
      },
    ]);
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');
    const door = makeStuffAtPath(() => new Door(), '/door1');
    door.setShortDescription('oak door');

    await a.applyExits({
      // A doored connection is authored once with `bidirectional: true` — the
      // door is one physical boundary spanning both rooms.
      north: { destination: '/zone/b', door: '/door1', bidirectional: true },
    });

    const exitN = a.getExit('north');
    const exitS = b.getExit('south');
    expect(exitN?.getDoor()).toBe(door);
    expect(exitS?.getDoor()).toBe(door);
    expect(a.getFixtureBoundaries()).toContain(door);
    expect(b.getFixtureBoundaries()).toContain(door);
  });

  it('per-direction idempotency: matching existing exit is a no-op', async () => {
    installInMemoryStore([
      {
        path: '/zone',
        class: '/lib/location/CartesianZone',
        data: {},
      },
    ]);
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    makeStuffAtPath(() => new CartesianLocation(), '/zone/b');
    await a.applyExits({ north: { destination: '/zone/b' } });
    const exitCount = a.getExits().size;
    // Second apply with matching spec.
    await expect(
      a.applyExits({ north: { destination: '/zone/b' } })
    ).resolves.toBeUndefined();
    expect(a.getExits().size).toBe(exitCount);
  });

  it('conflict on different destination throws with both paths in diagnostic', async () => {
    installInMemoryStore([
      {
        path: '/zone',
        class: '/lib/location/CartesianZone',
        data: {},
      },
    ]);
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    makeStuffAtPath(() => new CartesianLocation(), '/zone/b');
    makeStuffAtPath(() => new CartesianLocation(), '/zone/c');
    await a.applyExits({ north: { destination: '/zone/b' } });
    await expect(
      a.applyExits({ north: { destination: '/zone/c' } })
    ).rejects.toThrow(/already wired/);
  });

  it('hydrate via PersistentHydrator dispatches applyExits (Phase 2 instruction field)', async () => {
    installInMemoryStore([
      {
        path: '/zone',
        class: '/lib/location/CartesianZone',
        data: {},
      },
    ]);
    const a = makeStuffAtPath(() => new CartesianLocation(), '/zone/a');
    const b = makeStuffAtPath(() => new CartesianLocation(), '/zone/b');

    const hydrator = makeStuff(() => new PersistentHydrator());
    await hydrator.hydrate(a, { exits: { north: { destination: '/zone/b' } } });

    expect(a.getExit('north')?.getDestination()).toBe(b);
  });
});
