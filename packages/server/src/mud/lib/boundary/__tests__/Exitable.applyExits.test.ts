import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Location from '../../location/Location';
import Door from '../../../platform/thing/Door';
import { PersistenceManager, Collections } from '../../../../backend/PersistenceManager';
import { StuffApi } from '../../../api/stuff';
import { DiagnosticApi } from '../../../api/diagnostics';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import {
  makeStuffAtPath,
  makeStuffAtPathAsync,
  makeStuff,
  EXIT_KIND_TEST_ROWS,
} from '../../security/__tests__/test-setup';

/**
 * Tests for `ExitableMixin.applyExits` — the instruction-field
 * applier per declarative-content-slate § exits on ExitableMixin.
 */
type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
  data: Record<string, unknown>;
};

function installInMemoryStore(initial: Doc[] = []): Doc[] {
  // ⭐ Every exit is a clone of a kind row now, so a store with no
  // rows in it cannot build one.
  const store: Doc[] = [...(EXIT_KIND_TEST_ROWS as unknown as Doc[]), ...initial].map(
    (d, i) => ({ ...d, _id: String(i + 1) }),
  );

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
        class: '/platform/idea/location/CartesianZone',
        data: {},
      },
    ]);
    const a = makeStuffAtPath(() => new Location(), '/zone/a');
    const b = makeStuffAtPath(() => new Location(), '/zone/b');

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
        class: '/platform/idea/location/CartesianZone',
        data: {},
      },
    ]);
    const a = makeStuffAtPath(() => new Location(), '/zone/a');
    const b = makeStuffAtPath(() => new Location(), '/zone/b');

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
        class: '/platform/idea/location/CartesianZone',
        data: {},
      },
    ]);
    const a = makeStuffAtPath(() => new Location(), '/zone/a');
    const b = makeStuffAtPath(() => new Location(), '/zone/b');
    const door = await makeStuffAtPathAsync(() => new Door(), '/door1');
    door.setShortDescription('oak door');

    await a.applyExits({
      // A doored connection is authored once with `bidirectional: true` — the
      // door is one physical boundary spanning both rooms.
      north: { destination: '/zone/b', door: '/door1', bidirectional: true },
    });

    const exitN = a.getExit('north');
    const exitS = b.getExit('south');
    expect(exitN?.getBoundary()).toBe(door);
    expect(exitS?.getBoundary()).toBe(door);
    expect(door.getSides()).toEqual([exitN, exitS]);
  });

  it('⭐ each side authoring the same door: attaches to the ONE singleton', async () => {
    installInMemoryStore([
      { path: '/zone', class: '/platform/idea/location/CartesianZone', data: {} },
    ]);
    const a = makeStuffAtPath(() => new Location(), '/zone/a');
    const b = makeStuffAtPath(() => new Location(), '/zone/b');
    const door = await makeStuffAtPathAsync(() => new Door(), '/door1');

    await a.applyExits({ north: { destination: '/zone/b', door: '/door1' } });
    await b.applyExits({ south: { destination: '/zone/a', door: '/door1' } });

    const exitN = a.getExit('north')!;
    const exitS = b.getExit('south')!;
    expect(exitN.getBoundary()).toBe(door);
    expect(exitS.getBoundary()).toBe(door);
    expect(door.otherSide(exitN)).toBe(exitS);
    expect(exitN.isBlocked()).toBe(false);
    expect(exitS.isBlocked()).toBe(false);
  });

  it('⭐ D4: a door on one side only walls the doorless side and tells the author', async () => {
    installInMemoryStore([
      { path: '/zone', class: '/platform/idea/location/CartesianZone', data: {} },
    ]);
    const record = vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
    const a = makeStuffAtPath(() => new Location(), '/zone/a');
    const b = makeStuffAtPath(() => new Location(), '/zone/b');
    await makeStuffAtPathAsync(() => new Door(), '/door1');

    await a.applyExits({ north: { destination: '/zone/b', door: '/door1' } });
    await b.applyExits({ south: { destination: '/zone/a' } });

    expect(a.getExit('north')!.isBlocked()).toBe(false);
    expect(b.getExit('south')!.isBlocked()).toBe(true);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/zone/b', severity: 'error' }),
    );
  });

  it('per-direction idempotency: matching existing exit is a no-op', async () => {
    installInMemoryStore([
      {
        path: '/zone',
        class: '/platform/idea/location/CartesianZone',
        data: {},
      },
    ]);
    const a = makeStuffAtPath(() => new Location(), '/zone/a');
    makeStuffAtPath(() => new Location(), '/zone/b');
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
        class: '/platform/idea/location/CartesianZone',
        data: {},
      },
    ]);
    const a = makeStuffAtPath(() => new Location(), '/zone/a');
    makeStuffAtPath(() => new Location(), '/zone/b');
    makeStuffAtPath(() => new Location(), '/zone/c');
    await a.applyExits({ north: { destination: '/zone/b' } });
    await expect(
      a.applyExits({ north: { destination: '/zone/c' } })
    ).rejects.toThrow(/already wired/);
  });

  it('hydrate via TemplateApplier dispatches applyExits (Phase 2 instruction field)', async () => {
    installInMemoryStore([
      {
        path: '/zone',
        class: '/platform/idea/location/CartesianZone',
        data: {},
      },
    ]);
    const a = makeStuffAtPath(() => new Location(), '/zone/a');
    const b = makeStuffAtPath(() => new Location(), '/zone/b');

    const hydrator = makeStuff(() => new TemplateApplier());
    await hydrator.apply(a, { exits: { north: { destination: '/zone/b' } } }, { mode: 'mint' });

    expect(a.getExit('north')?.getDestination()).toBe(b);
  });
});
