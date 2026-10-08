/**
 * The projection: what becomes a node, what does not, and the rebuild's
 * generation sweep.
 *
 * ⭐ The derivation is the thing to pin. *One row is one place*, so a
 * place is a Location that composes `SingletonMixin`; every other
 * location row is a KIND, minted many times through a warren or a
 * programme, and is deliberately absent. The elastic half of the world
 * is perceived live and never stored.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { NavigationApi } from '../../../api/navigation';
import { ParcelApi } from '../../../api/parcel';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import LocationGraphRegistry from '../LocationGraphRegistry';
import {
  makeStuffAtPath,
  seedKernelContentStore,
} from '../../../lib/security/__tests__/test-setup';
import { Stuff } from '../../../lib/stuff/Stuff';

const REGISTRY = '/platform/idea/LocationGraphRegistry';
const ZONE = '/test/graph/zone';
const HALL = '/test/graph/zone/hall';
const YARD = '/test/graph/zone/yard';
const KIND = '/test/graph/zone/dormroom';
const STAIR_KIND = '/test/graph/exits/stair';
const FORD_KIND = '/test/graph/exits/ford';
const BANK = '/test/graph/zone/bank';

/** The in-memory `location_graph` store. */
let graph: Array<Record<string, unknown>>;

function nodeRows(): Array<Record<string, unknown>> {
  return graph;
}

beforeEach(() => {
  StuffApi.clearAll();
  graph = [];

  seedKernelContentStore([
    { path: ZONE, class: '/platform/idea/location/CartesianZone', data: {} },
    {
      path: HALL,
      class: '/platform/location/SingletonCartesianLocation',
      data: {
        _address: 'test/hall',
        exits: { north: { destination: YARD, bidirectional: true } },
      },
    },
    {
      path: YARD,
      class: '/platform/location/SingletonCartesianLocation',
      data: {},
    },
    // A KIND: a plain CartesianLocation, minted many times.
    { path: KIND, class: '/platform/location/CartesianLocation', data: {} },
    /*
     * ⭐ Two exit KINDS and a place that names them. The kind rows are
     * what carry `media` / `wheelPassable` / `conditional` in real
     * content — a stair declares its refusal ONCE and every stair
     * installed from it inherits — so a projection that read only the
     * edge spec would stamp an empty media list on every kinded exit
     * in the realm, which reads as *admits everything*.
     */
    {
      path: STAIR_KIND,
      class: '/platform/idea/Exit',
      data: { media: ['ground'], wheelPassable: false },
    },
    {
      path: FORD_KIND,
      class: '/platform/idea/Exit',
      data: { media: ['ground'], wheelPassable: true, conditional: true },
    },
    {
      path: BANK,
      class: '/platform/location/SingletonCartesianLocation',
      data: {
        exits: {
          up: { destination: HALL, kind: STAIR_KIND },
          east: { destination: YARD, kind: FORD_KIND },
          west: { destination: HALL, media: ['water'] },
          // ⛔ An authored block is a way that is NOT THERE.
          down: { destination: YARD, blocked: true },
        },
      },
    },
  ]);

  /**
   * ⚠ The mock has to understand `edges.to` — a DOTTED path into an
   * array of subdocuments. Mongo matches if ANY element matches, and
   * that is exactly what the `{'edges.to': 1}` index exists for (the
   * reverse query: who points at this place). A flat `d[k] === v`
   * comparison silently returns nothing, which reads as "nobody points
   * here" — a passing-looking test for a query that does not work.
   */
  const matches = (doc: Record<string, unknown>, key: string, want: unknown) => {
    if (!key.includes('.')) return doc[key] === want;
    const [head, ...rest] = key.split('.');
    const branch = doc[head!];
    const tail = rest.join('.');
    const probe = (v: unknown): boolean =>
      v !== null && typeof v === 'object'
        ? matches(v as Record<string, unknown>, tail, want)
        : false;
    return Array.isArray(branch) ? branch.some(probe) : probe(branch);
  };
  const find = vi.fn(async (col: string, query: Record<string, unknown>) => {
    if (col !== 'location_graph') return [];
    return graph.filter((d) =>
      Object.entries(query).every(([k, v]) => matches(d, k, v)),
    );
  });
  const save = vi.fn(async (col: string, doc: Record<string, unknown>) => {
    if (col !== 'location_graph') return 'id';
    const i = graph.findIndex((d) => d.identity === doc.identity);
    if (i >= 0) {
      graph[i] = { ...doc, _id: graph[i]!._id };
      return graph[i]!._id as string;
    }
    const _id = String(graph.length + 1);
    graph.push({ ...doc, _id });
    return _id;
  });
  const del = vi.fn(async (col: string, id: string) => {
    if (col !== 'location_graph') return;
    const i = graph.findIndex((d) => d._id === id);
    if (i >= 0) graph.splice(i, 1);
  });

  /*
   * ⭐ The graph's collection is stubbed HERE and every other
   * collection is delegated to the content-store stub
   * `seedKernelContentStore` installed — the projection reads the
   * `content` rows and writes `location_graph`, so a stub that owned
   * only one of them would answer `[]` to the other and the test would
   * pass against an empty world.
   */
  type Backend = {
    isConnected(): boolean;
    save(col: string, doc: Record<string, unknown>): Promise<string>;
    find(
      col: string,
      q: Record<string, unknown>,
      o?: unknown,
    ): Promise<Array<Record<string, unknown>>>;
    findById(col: string, id: string): Promise<unknown>;
    delete(col: string, id: string): Promise<void>;
  };
  const real = PersistenceManager.get() as unknown as Backend;
  const backend: Backend = {
    isConnected: () => true,
    save: async (col, doc) =>
      col === 'location_graph' ? save(col, doc) : real.save(col, doc),
    find: async (col, q, o) =>
      col === 'location_graph' ? find(col, q) : real.find(col, q, o),
    findById: async (col, id) => real.findById(col, id),
    delete: async (col, id) =>
      col === 'location_graph' ? del(col, id) : real.delete(col, id),
  };
  vi.spyOn(PersistenceManager, 'get').mockReturnValue(
    backend as unknown as PersistenceManager,
  );

  vi.spyOn(ParcelApi, 'coveringParcelOfSync').mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Stand the registry up and warm it the way production does — through a
 * graph READ. ⭐ There is no `onCreate`: the warm is lazy, because
 * nothing reads the graph at boot, so an eager walk of every content
 * row would be work for no reader.
 */
async function standRegistry(): Promise<LocationGraphRegistry> {
  const reg = makeStuffAtPath(() => new LocationGraphRegistry(), REGISTRY);
  await NavigationApi.rebuildGraph();
  return reg;
}

describe('what becomes a node', () => {
  it('⭐⭐ a SINGLETON location row is a place', async () => {
    await standRegistry();
    const identities = nodeRows().map((n) => n.identity);
    expect(identities).toContain(HALL);
    expect(identities).toContain(YARD);
  });

  it('⭐⭐ a plain location row is a KIND and is NOT a node', async () => {
    // One row, many instances: the elastic half of the world is
    // perceived live and never stored.
    await standRegistry();
    expect(nodeRows().map((n) => n.identity)).not.toContain(KIND);
  });

  it('a zone row is not a node either', async () => {
    await standRegistry();
    expect(nodeRows().map((n) => n.identity)).not.toContain(ZONE);
  });

  it('projects the authored exits, the zone and the address', async () => {
    await standRegistry();
    const hall = nodeRows().find((n) => n.identity === HALL)!;
    expect(hall.template).toBe(HALL);
    expect(hall.origin).toBe('template');
    expect(hall.zone).toBe(ZONE);
    expect(hall.address).toBe('test/hall');
    const edges = hall.edges as Array<Record<string, unknown>>;
    expect(edges).toHaveLength(1);
    expect(edges[0]!.dir).toBe('north');
    expect(edges[0]!.to).toBe(YARD);
    expect(edges[0]!.bidirectional).toBe(true);
  });

  describe('the edge carries what a lane needs (routing W5)', () => {
    const edgesOfBank = (): Array<Record<string, unknown>> => {
      const bank = nodeRows().find((n) => n.identity === BANK)!;
      return bank.edges as Array<Record<string, unknown>>;
    };
    const byDir = (dir: string): Record<string, unknown> =>
      edgesOfBank().find((e) => e.dir === dir)!;

    it('⭐⭐ reads media and wheelPassable off the exit KIND row', async () => {
      // Before this, the index could COST a wagon's route but not say
      // whether a wagon may take it — which is the whole reason a lane
      // had to be compiled by walking live exits one at a time.
      await standRegistry();
      expect(byDir('up').media).toEqual(['ground']);
      expect(byDir('up').wheelPassable).toBe(false);
    });

    it('lets the edge spec override the kind', async () => {
      await standRegistry();
      expect(byDir('west').media).toEqual(['water']);
    });

    it('⭐⭐ stamps `conditional` from the kind — the way that CLOSES', async () => {
      await standRegistry();
      expect(byDir('east').conditional).toBe(true);
      // ⚠ And only there: an ordinary stair is not a ford.
      expect(byDir('up').conditional).toBeUndefined();
    });

    it('⛔ an authored `blocked: true` spec projects NO EDGE at all', async () => {
      // A blocked edge is a way that is not there, not a way the
      // search has to refuse — leaving it in would make every consumer
      // re-derive the same exclusion.
      //
      // ⚠ Measured at W5: there are ZERO authored `blocked: true`
      // specs in all of content, so this rule ships exercised ONLY by
      // this test. A regression in it would be invisible anywhere else.
      await standRegistry();
      expect(edgesOfBank().map((e) => e.dir).sort()).toEqual([
        'east',
        'up',
        'west',
      ]);
    });

    it('omits all three on a plain edge, which is what absent MEANS', async () => {
      await standRegistry();
      const hall = nodeRows().find((n) => n.identity === HALL)!;
      const north = (hall.edges as Array<Record<string, unknown>>)[0]!;
      // Absent media = the ground pace family; absent wheelPassable =
      // admits wheels; absent conditional = always there. Writing the
      // defaults in would bloat every node for no reader.
      expect(north.media).toBeUndefined();
      expect(north.wheelPassable).toBeUndefined();
      expect(north.conditional).toBeUndefined();
    });
  });

  it('⭐ everything reads PUBLISHED when no parcel covers it', async () => {
    // An untitled path is not a wall: there is no parcel there to be
    // one, and `lint:untitled` already forbids shipping one.
    await standRegistry();
    expect(nodeRows().every((n) => n.published === true)).toBe(true);
  });
});

describe('the rebuild is idempotent by GENERATION', () => {
  it('a second rebuild leaves the same node count, not a doubled one', async () => {
    await standRegistry();
    const first = nodeRows().length;
    expect(first).toBeGreaterThan(0);
    await NavigationApi.rebuildGraph();
    expect(nodeRows()).toHaveLength(first);
  });

  it('⭐⭐ a node the projection no longer produces is SWEPT', async () => {
    await standRegistry();
    // A node left behind by an earlier generation — a row that has been
    // deleted, renamed, or has stopped being a place.
    graph.push({
      _id: 'stale',
      identity: '/test/graph/zone/ghost',
      template: '/test/graph/zone/ghost',
      zone: ZONE,
      address: '',
      coords: null,
      edges: [],
      crossesZone: false,
      published: true,
      origin: 'template',
      travel: null,
      generation: 1,
    });

    await NavigationApi.rebuildGraph();

    // ⭐ Swept by GENERATION, not by truncation — which is why there
    // was never a moment with no graph at all. The traversal gate
    // reads the graph, so a drop-then-repopulate window would be a
    // window in which every door answers wrongly.
    expect(nodeRows().map((n) => n.identity)).not.toContain(
      '/test/graph/zone/ghost',
    );
    expect(nodeRows().map((n) => n.identity)).toContain(HALL);
  });

  it('every surviving node carries the newest generation', async () => {
    await standRegistry();
    const before = nodeRows().map((n) => n.generation as number);
    await new Promise((r) => setTimeout(r, 2));
    await NavigationApi.rebuildGraph();
    const after = nodeRows().map((n) => n.generation as number);
    expect(new Set(after).size).toBe(1);
    expect(after[0]!).toBeGreaterThan(Math.min(...before));
  });
});

describe('the reads, through the Api', () => {
  it('⚠ with NO registry standing, a read answers "nothing yet" not a throw', async () => {
    // The registry is cloned from the pack manifest, and plenty runs
    // before that — the installer's own row writes, every unit test
    // that never boots a world. A read then means *nothing yet*, not
    // *no such place*, which is why the projection hook checks
    // `isGraphWarm()` rather than relying on these to no-op.
    expect(NavigationApi.isGraphWarm()).toBe(false);
    await expect(NavigationApi.node(HALL)).resolves.toBeNull();
    await expect(NavigationApi.nodesInZone(ZONE)).resolves.toEqual([]);
    await expect(NavigationApi.checkGraph()).resolves.toEqual([]);
  });

  it('⭐⭐ the FIRST READ warms the graph — nothing else has to', async () => {
    makeStuffAtPath(() => new LocationGraphRegistry(), REGISTRY);
    expect(NavigationApi.isGraphWarm()).toBe(false);

    const hall = await NavigationApi.node(HALL);

    expect(hall?.identity).toBe(HALL);
    expect(NavigationApi.isGraphWarm()).toBe(true);
  });

  it('⭐ a BURST of first reads builds the graph once', async () => {
    makeStuffAtPath(() => new LocationGraphRegistry(), REGISTRY);
    await Promise.all([
      NavigationApi.node(HALL),
      NavigationApi.node(YARD),
      NavigationApi.nodesInZone(ZONE),
      NavigationApi.interzoneSkeleton(),
    ]);
    // One node per place, not four copies of each. ⚠ Three places:
    // the two exit KINDS added for the edge-field tests are kinds, not
    // places, and must not appear here.
    expect(nodeRows()).toHaveLength(3);
    expect(new Set(nodeRows().map((n) => n.generation)).size).toBe(1);
  });

  it('after the warm, the node and its zone resolve', async () => {
    await standRegistry();
    expect(NavigationApi.isGraphWarm()).toBe(true);
    const hall = await NavigationApi.node(HALL);
    expect(hall?.identity).toBe(HALL);
    const inZone = await NavigationApi.nodesInZone(ZONE);
    expect(inZone.map((n) => n.identity).sort()).toEqual(
      [HALL, YARD, BANK].sort(),
    );
  });

  it('⭐ the REVERSE query names who points at a place', async () => {
    await standRegistry();
    const pointing = await NavigationApi.pointingAt(YARD);
    // ⚠ The bank points at the yard through its FORD edge; its
    // `blocked` one is not in the index at all, which is why there is
    // one entry for the bank and not two.
    expect(pointing.map((n) => n.identity).sort()).toEqual([BANK, HALL].sort());
  });

  it('removing a row un-projects its node', async () => {
    await standRegistry();
    await NavigationApi.removeRow(YARD);
    expect(nodeRows().map((n) => n.identity)).not.toContain(YARD);
  });

  it('the registry refuses eviction and destruct — it is a system singleton', async () => {
    const reg = await standRegistry();
    expect(reg.canEvict({} as never).ok).toBe(false);
    expect(reg.canDestruct().ok).toBe(false);
    void (reg as unknown as Stuff);
  });
});
