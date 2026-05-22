import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CartesianLocation } from '../CartesianLocation';
import { CartesianZone } from '../CartesianZone';
import { Window } from '../../boundary/Window';
import { PersistentHydrator } from '../../persistence/PersistentHydrator';
import { PersistenceManager, Collections } from '../../../../backend/PersistenceManager';
import { StuffApi } from '../../../api/stuff';

/**
 * Deliverable #13 integration test — the load-bearing test for the
 * structural-field-shape side of the declarative-content slate.
 *
 * Substrate-only Duncan Hall demo: one `CartesianZone` with two
 * `CartesianLocation` rooms (each with `coords` + `exits`) and one
 * `Window` connecting them via `attachedHosts`. Hydrates lazily on
 * first `StuffApi.singleton` access; verifies the entire wiring graph
 * comes out correct end-to-end without TypeScript glue, without
 * content YAML in `bootstrap.ts`, and without any helper class.
 *
 * Per declarative-content-slate § Acceptance criteria, requirements
 * § Acceptance criteria, plan § 4.11.
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

describe('Declarative content lazy hydrate — CartesianZone + rooms + Window', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('cascade from singleton(/test/declarative/roomA) wires the whole graph', async () => {
    installInMemoryStore([
      // The hydrator's own template (no hydratorClass — terminates the recursion).
      {
        path: PersistentHydrator.templatePath,
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
      // The zone.
      {
        path: '/test/declarative/zone',
        class: '/lib/spatial/CartesianZone',
        hydratorClass: PersistentHydrator.templatePath,
        data: { name: 'test zone', cellSize: 25 },
      },
      // Room A — has coords + exits → roomB.
      {
        path: '/test/declarative/zone/roomA',
        class: '/lib/spatial/CartesianLocation',
        hydratorClass: PersistentHydrator.templatePath,
        data: {
          coords: { x: 0, y: 0, z: 0 },
          exits: {
            north: { destination: '/test/declarative/zone/roomB' },
          },
        },
      },
      // Room B — has coords only (the back-exit south arrives via roomA's
      // bidirectional `addBidirectionalExit`).
      {
        path: '/test/declarative/zone/roomB',
        class: '/lib/spatial/CartesianLocation',
        hydratorClass: PersistentHydrator.templatePath,
        data: {
          coords: { x: 0, y: 1, z: 0 },
        },
      },
      // Window — declarative attachedHosts.
      {
        path: '/test/declarative/window',
        class: '/lib/boundary/Window',
        hydratorClass: PersistentHydrator.templatePath,
        data: {
          baseTransmissivity: 0.9,
          attachedHosts: [
            '/test/declarative/zone/roomA',
            '/test/declarative/zone/roomB',
          ],
        },
      },
    ]);

    // ── Step 1. Trigger cascade by resolving roomA.
    const roomA = await StuffApi.singleton<CartesianLocation>(
      '/test/declarative/zone/roomA'
    );

    // roomA is registered.
    expect(roomA).toBeDefined();
    expect(roomA).toBeInstanceOf(CartesianLocation);

    // The zone is registered (lazy-cloned via ZoneApi.resolveZoneForPath
    // during roomA's clone).
    const zone = StuffApi.findByTemplatePath('/test/declarative/zone');
    expect(zone).toBeTruthy();
    expect(zone).toBeInstanceOf(CartesianZone);

    // coords + zone registration.
    expect(roomA.getCoords()).toEqual({ x: 0, y: 0, z: 0 });
    expect(roomA.getZone()).toBe(zone);
    expect((zone as CartesianZone).contains(roomA)).toBe(true);
    expect((zone as CartesianZone).hasRoomAt(0, 0, 0, roomA)).toBe(true);

    // ── Step 2. Lazy-cascade through applyExits.
    // The applyExits applier resolved roomB via singleton when wiring
    // the north exit, which triggered roomB's clone.
    const roomB = StuffApi.findByTemplatePath(
      '/test/declarative/zone/roomB'
    ) as CartesianLocation | null;
    expect(roomB).toBeTruthy();
    expect(roomB!.getCoords()).toEqual({ x: 0, y: 1, z: 0 });

    // Bidirectional exit pair installed.
    const north = roomA.getExit('north');
    expect(north).toBeDefined();
    expect(north!.getDestination()).toBe(roomB);
    const south = roomB!.getExit('south');
    expect(south).toBeDefined();
    expect(south!.getDestination()).toBe(roomA);

    // ── Step 3. Window has NOT been instantiated yet (no setter has
    // resolved its path).
    expect(
      StuffApi.findByTemplatePath('/test/declarative/window')
    ).toBeFalsy();

    // ── Step 4. Explicitly resolve the Window.
    const w = await StuffApi.singleton<Window>('/test/declarative/window');
    expect(w).toBeDefined();
    expect(w).toBeInstanceOf(Window);
    expect(w.getBaseTransmissivity()).toBe(0.9);
    expect(w.getAttachedHosts()).toEqual([
      '/test/declarative/zone/roomA',
      '/test/declarative/zone/roomB',
    ]);
    expect(w.getAnchorA()).not.toBeNull();
    expect(w.getAnchorB()).not.toBeNull();

    // The Window appears in both rooms' fixture boundaries.
    expect(roomA.getFixtureBoundaries()).toContain(w);
    expect(roomB!.getFixtureBoundaries()).toContain(w);

    // ── Step 5. Sanity: second singleton hit returns same instance.
    const roomAAgain = await StuffApi.singleton<CartesianLocation>(
      '/test/declarative/zone/roomA'
    );
    expect(roomAAgain).toBe(roomA);
  });

  it('back-edge idempotency: applyExits on roomB sees south already wired and no-ops', async () => {
    installInMemoryStore([
      {
        path: PersistentHydrator.templatePath,
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
      {
        path: '/back/zone',
        class: '/lib/spatial/CartesianZone',
        hydratorClass: PersistentHydrator.templatePath,
        data: {},
      },
      {
        path: '/back/zone/a',
        class: '/lib/spatial/CartesianLocation',
        hydratorClass: PersistentHydrator.templatePath,
        data: {
          coords: { x: 0, y: 0, z: 0 },
          exits: { north: { destination: '/back/zone/b' } },
        },
      },
      // roomB ALSO declares the back-edge — applyExits should see the
      // existing south (wired by addBidirectionalExit on roomA's apply)
      // and no-op.
      {
        path: '/back/zone/b',
        class: '/lib/spatial/CartesianLocation',
        hydratorClass: PersistentHydrator.templatePath,
        data: {
          coords: { x: 0, y: 1, z: 0 },
          exits: { south: { destination: '/back/zone/a' } },
        },
      },
    ]);

    const a = await StuffApi.singleton<CartesianLocation>('/back/zone/a');
    const b = StuffApi.findByTemplatePath(
      '/back/zone/b'
    ) as CartesianLocation;

    // Both rooms wired, each with a single exit on its declared
    // direction (no duplicates from the redundant declaration).
    expect(a.getExits().size).toBe(1);
    expect(b.getExits().size).toBe(1);
    expect(a.getExit('north')!.getDestination()).toBe(b);
    expect(b.getExit('south')!.getDestination()).toBe(a);
  });
});
