import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CartesianLocation from '../CartesianLocation';
import Exit from '../../boundary/Exit';
import { PersistenceManager, Collections } from '../../../../backend/PersistenceManager';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuffAtPath,
  makeStuff,
} from '../../security/__tests__/test-setup';

/**
 * Cardinal-rule tightening (per zone-architecture-slate § The
 * cardinal-only-intra-zone exit invariant).
 *
 * - Cardinal direction (n/s/e/w/diagonals/up/down): always allowed.
 * - Non-cardinal direction: only allowed when destination's
 *   templatePath resolves to a different zone than the source's.
 * - Check is path-based via `ZoneApi.resolveZoneForPath`; destination
 *   Location is never instantiated.
 */
type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
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

describe('CartesianLocation.addExit cardinal rule', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('intra-zone non-cardinal exit throws at addExit time', async () => {
    installInMemoryStore([
      {
        path: '/zone/a',
        class: '/obj/location/CartesianZone',
        data: {},
      },
    ]);
    const source = makeStuffAtPath(
      () => new CartesianLocation(),
      '/zone/a/room1'
    );
    const dest = makeStuffAtPath(
      () => new CartesianLocation(),
      '/zone/a/room2'
    );
    const exit = makeStuff(
      () => new Exit({ direction: 'portal', source, destination: dest })
    );
    await expect(source.addExit(exit)).rejects.toThrow(/same .*zone|zone '/i);
  });

  it('cross-zone non-cardinal exit succeeds', async () => {
    installInMemoryStore([
      {
        path: '/zoneA',
        class: '/obj/location/CartesianZone',
        data: {},
      },
      {
        path: '/zoneB',
        class: '/obj/location/CartesianZone',
        data: {},
      },
    ]);
    const source = makeStuffAtPath(
      () => new CartesianLocation(),
      '/zoneA/room1'
    );
    const dest = makeStuffAtPath(
      () => new CartesianLocation(),
      '/zoneB/room1'
    );
    const exit = makeStuff(
      () => new Exit({ direction: 'portal', source, destination: dest })
    );
    expect(await source.addExit(exit)).toBe(true);
  });

  it('cardinal direction always succeeds (intra-zone)', async () => {
    installInMemoryStore([
      {
        path: '/zone/a',
        class: '/obj/location/CartesianZone',
        data: {},
      },
    ]);
    const source = makeStuffAtPath(
      () => new CartesianLocation(),
      '/zone/a/room1'
    );
    const dest = makeStuffAtPath(
      () => new CartesianLocation(),
      '/zone/a/room2'
    );
    const exit = makeStuff(
      () => new Exit({ direction: 'north', source, destination: dest })
    );
    expect(await source.addExit(exit)).toBe(true);
  });

  it('check is path-based: destination room never materialized', async () => {
    installInMemoryStore([
      {
        path: '/zoneA',
        class: '/obj/location/CartesianZone',
        data: {},
      },
      {
        path: '/zoneB',
        class: '/obj/location/CartesianZone',
        data: {},
      },
    ]);
    const source = makeStuffAtPath(
      () => new CartesianLocation(),
      '/zoneA/room1'
    );
    // No `dest` Stuff is created; the exit just carries the path.
    const exit = makeStuff(
      () =>
        new Exit({
          direction: 'portal',
          source,
          destinationPath: '/zoneB/room1',
        })
    );
    expect(await source.addExit(exit)).toBe(true);
    // The destination Location was never registered as a Stuff.
    expect(StuffApi.findByTemplatePath('/zoneB/room1')).toBeFalsy();
  });

  it('exit with no destination path is permissive (orphan ref)', async () => {
    // No store needed; the check shortcuts to permissive before any
    // path-resolution happens.
    const source = makeStuffAtPath(
      () => new CartesianLocation(),
      '/zone/a/room1'
    );
    const dest = makeStuff(() => new CartesianLocation()); // no path
    const exit = makeStuff(
      () => new Exit({ direction: 'portal', source, destination: dest })
    );
    expect(await source.addExit(exit)).toBe(true);
  });
});
