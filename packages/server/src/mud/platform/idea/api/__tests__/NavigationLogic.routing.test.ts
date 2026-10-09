/**
 * The router, over a synthetic index.
 *
 * ⭐ The cases that earn their place are the ones where a plausible
 * implementation is wrong in a way no caller can detect: a budget
 * exhaustion reported as *no way*, a non-deterministic choice between
 * equal roads, a mode break reported as *there is no way to the
 * island* when the truth is *the way stops at the quay*. Those are
 * all answers a caller would believe.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { NavigationApi } from '../../../../api/navigation';
import { ParcelApi } from '../../../../api/parcel';
import LocationGraphRegistry from '../../LocationGraphRegistry';
import { PlaceNode } from '../../../../lib/location/PlaceNode';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import {
  makeStuffAtPath,
  seedKernelContentStore,
} from '../../../../lib/security/__tests__/test-setup';

const REGISTRY = '/platform/idea/LocationGraphRegistry';
const ZONE = '/test/route/zone';
const P = (leaf: string): string => `${ZONE}/${leaf}`;

/** One authored place row. */
interface Row {
  leaf: string;
  exits?: Record<string, Record<string, unknown>>;
}

let graph: Array<Record<string, unknown>>;

function install(rows: readonly Row[]): void {
  seedKernelContentStore([
    { path: ZONE, class: '/platform/idea/location/CartesianZone', data: {} },
    ...rows.map((r) => ({
      path: P(r.leaf),
      class: '/platform/location/SingletonCartesianLocation',
      data: { ...(r.exits ? { exits: r.exits } : {}) },
    })),
  ]);
}

/** The `location_graph` collection, in memory. */
function stubGraphStore(): void {
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
  let next = 1;
  const backend: Backend = {
    isConnected: () => true,
    save: async (col, doc) => {
      if (col !== 'location_graph') return real.save(col, doc);
      const id = (doc._id as string) ?? `g${next++}`;
      const row = { ...doc, _id: id };
      const i = graph.findIndex((d) => d._id === id);
      if (i >= 0) graph[i] = row;
      else graph.push(row);
      return id;
    },
    find: async (col, q, o) => {
      if (col !== 'location_graph') return real.find(col, q, o);
      const keys = Object.keys(q);
      return graph.filter((d) =>
        keys.every((k) => {
          if (!k.includes('.')) return d[k] === q[k];
          const [head, ...rest] = k.split('.');
          const arr = d[head!];
          if (!Array.isArray(arr)) return false;
          return arr.some(
            (e) => (e as Record<string, unknown>)[rest.join('.')] === q[k],
          );
        }),
      );
    },
    findById: async (col, id) => real.findById(col, id),
    delete: async (col, id) => {
      if (col !== 'location_graph') return real.delete(col, id);
      const i = graph.findIndex((d) => d._id === id);
      if (i >= 0) graph.splice(i, 1);
    },
  };
  vi.spyOn(PersistenceManager, 'get').mockReturnValue(
    backend as unknown as PersistenceManager,
  );
  vi.spyOn(ParcelApi, 'coveringParcelOfSync').mockReturnValue(null);
}

async function stand(): Promise<void> {
  makeStuffAtPath(() => new LocationGraphRegistry(), REGISTRY);
  await NavigationApi.rebuildGraph();
}

const ON_FOOT = { mode: 'walk', medium: 'ground' };
const WAGON = { mode: 'wheeled', medium: 'ground', wheeled: true };
const BARGE = { mode: 'sailed', medium: 'water' };
const WORLD = {};
const PLENTY = 500;

beforeEach(() => {
  StuffApi.clearAll();
  graph = [];
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('a plain way there', () => {
  beforeEach(() => {
    install([
      { leaf: 'a', exits: { north: { destination: P('b') } } },
      { leaf: 'b', exits: { north: { destination: P('c') } } },
      { leaf: 'c' },
    ]);
    stubGraphStore();
  });

  it('names the legs, their directions, and the places in order', async () => {
    await stand();
    const out = await NavigationApi.routeBetween(
      P('a'),
      P('c'),
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const plan = out.plans[0]!;
    expect(plan.nodes).toEqual([P('a'), P('b'), P('c')]);
    expect(plan.legs.map((l) => l.dir)).toEqual(['north', 'north']);
    expect(plan.cost.legs).toBe(2);
    expect(plan.source).toBe('world');
  });

  it('⭐ plans a trip to WHERE YOU ALREADY ARE as an empty plan, not a refusal', async () => {
    await stand();
    const out = await NavigationApi.routeBetween(
      P('a'),
      P('a'),
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.plans[0]!.legs).toEqual([]);
    expect(out.plans[0]!.cost.legs).toBe(0);
  });

  it('refuses an origin or destination it has never heard of, distinctly', async () => {
    await stand();
    const a = await NavigationApi.routeBetween(
      '/test/route/nowhere',
      P('c'),
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    const b = await NavigationApi.routeBetween(
      P('a'),
      '/test/route/nowhere',
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    expect(a.ok === false && a.reason).toBe('unknown-origin');
    expect(b.ok === false && b.reason).toBe('unknown-destination');
  });

  it('⚠ answers `graph-cold` before the registry stands — a real answer', async () => {
    // The registry is cloned from the pack manifest, and plenty runs
    // first. A brain that got a throw here would take the beat down.
    const out = await NavigationApi.routeBetween(
      P('a'),
      P('c'),
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    expect(out.ok === false && out.reason).toBe('graph-cold');
  });
});

describe('⭐⭐ a budget exhausted is NOT a no-way', () => {
  beforeEach(() => {
    // A long chain, and a destination off the far end.
    const rows: Row[] = [];
    for (let i = 0; i < 12; i++) {
      rows.push({
        leaf: `n${i}`,
        exits: { north: { destination: P(`n${i + 1}`) } },
      });
    }
    rows.push({ leaf: 'n12' });
    rows.push({ leaf: 'island' }); // genuinely unreachable
    install(rows);
    stubGraphStore();
  });

  it("says 'budget' and reports what it spent", async () => {
    await stand();
    const out = await NavigationApi.routeBetween(
      P('n0'),
      P('n12'),
      ON_FOOT,
      WORLD,
      3,
    );
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('budget');
    expect(out.expanded).toBeGreaterThan(0);
  });

  it("says 'no-way' for a place nothing leads to, with budget to spare", async () => {
    await stand();
    const out = await NavigationApi.routeBetween(
      P('n0'),
      P('island'),
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    expect(out.ok === false && out.reason).toBe('no-way');
  });

  it('⭐ and the same pair answers differently as the budget changes', async () => {
    // The point of the distinction, in one assertion: nothing about
    // the WORLD differs between these two calls.
    await stand();
    const mean = await NavigationApi.routeBetween(
      P('n0'),
      P('n12'),
      ON_FOOT,
      WORLD,
      3,
    );
    const generous = await NavigationApi.routeBetween(
      P('n0'),
      P('n12'),
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    expect(mean.ok).toBe(false);
    expect(generous.ok).toBe(true);
  });
});

describe('⭐⭐ the mode break names where the way stops', () => {
  beforeEach(() => {
    install([
      {
        leaf: 'town',
        exits: { north: { destination: P('quay'), media: ['ground'] } },
      },
      {
        leaf: 'quay',
        exits: { north: { destination: P('island'), media: ['water'] } },
      },
      { leaf: 'island' },
    ]);
    stubGraphStore();
  });

  it('tells a walker the way stops at the quay, and what north needs', async () => {
    await stand();
    const out = await NavigationApi.routeBetween(
      P('town'),
      P('island'),
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('no-way');
    expect(out.breakAt?.node).toBe(P('quay'));
    expect(out.breakAt?.dir).toBe('north');
    expect(out.breakAt?.needs).toEqual(['water']);
  });

  it('⚠ a genuine no-way carries NO breakAt — the two must be tellable apart', async () => {
    await stand();
    const out = await NavigationApi.routeBetween(
      P('island'),
      P('town'),
      BARGE,
      WORLD,
      PLENTY,
    );
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.breakAt).toBeUndefined();
  });
});

describe('the profile decides which ways exist', () => {
  beforeEach(() => {
    install([
      {
        leaf: 'yard',
        exits: {
          up: {
            destination: P('loft'),
            media: ['ground'],
            wheelPassable: false,
          },
          north: { destination: P('road'), media: ['ground'] },
        },
      },
      { leaf: 'loft' },
      { leaf: 'road' },
    ]);
    stubGraphStore();
  });

  it('⭐ a wagon cannot go up the stair a walker can', async () => {
    await stand();
    const onFoot = await NavigationApi.routeBetween(
      P('yard'),
      P('loft'),
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    const wheeled = await NavigationApi.routeBetween(
      P('yard'),
      P('loft'),
      WAGON,
      WORLD,
      PLENTY,
    );
    expect(onFoot.ok).toBe(true);
    expect(wheeled.ok).toBe(false);
  });

  it('a wagon takes the road, which admits wheels', async () => {
    await stand();
    const out = await NavigationApi.routeBetween(
      P('yard'),
      P('road'),
      WAGON,
      WORLD,
      PLENTY,
    );
    expect(out.ok).toBe(true);
  });
});

describe('⭐⭐ incomparable ways both come back, and the engine does not pick', () => {
  beforeEach(() => {
    // The diamond: a short way over a FORD, and a long sure one.
    install([
      {
        leaf: 'start',
        exits: {
          north: {
            destination: P('end'),
            edgeMinutes: 5,
            conditional: true,
          },
          east: { destination: P('bend'), edgeMinutes: 20 },
        },
      },
      { leaf: 'bend', exits: { north: { destination: P('end'), edgeMinutes: 20 } } },
      { leaf: 'end' },
    ]);
    stubGraphStore();
  });

  it('answers both the fast uncertain way and the slow sure one', async () => {
    await stand();
    const out = await NavigationApi.routeBetween(
      P('start'),
      P('end'),
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.plans.length).toBe(2);
    const byRisk = [...out.plans].sort(
      (a, b) => a.cost.conditional - b.cost.conditional,
    );
    // The sure way: no conditional legs, more minutes.
    expect(byRisk[0]!.cost.conditional).toBe(0);
    expect(byRisk[0]!.cost.minutes).toBe(40);
    // The fast way: one conditional leg, fewer minutes.
    expect(byRisk[1]!.cost.conditional).toBe(1);
    expect(byRisk[1]!.cost.minutes).toBe(5);
  });

  it('states the caveat on the conditional way in words', async () => {
    await stand();
    const out = await NavigationApi.routeBetween(
      P('start'),
      P('end'),
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    if (!out.ok) throw new Error('expected a plan');
    const risky = out.plans.find((p) => p.cost.conditional === 1)!;
    expect(risky.assumptions.some((a) => a.kind === 'conditional')).toBe(true);
    expect(
      risky.assumptions.find((a) => a.kind === 'conditional')!.text,
    ).toMatch(/not always passable/);
  });

  it('⭐ is DETERMINISTIC — the same question twice, the same plans', async () => {
    // "The router picked a different road today" is a bug report
    // nobody can act on.
    await stand();
    const once = await NavigationApi.routeBetween(
      P('start'),
      P('end'),
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    const twice = await NavigationApi.routeBetween(
      P('start'),
      P('end'),
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
  });
});

describe('cost in every currency, so the renderer can pick (D4a)', () => {
  beforeEach(() => {
    install([
      {
        leaf: 'a',
        exits: { north: { destination: P('b'), edgeMinutes: 7 } },
      },
      // ⚠ No `edgeMinutes` — an UNMEASURED leg.
      { leaf: 'b', exits: { north: { destination: P('c') } } },
      { leaf: 'c' },
    ]);
    stubGraphStore();
  });

  it('⚠ reports `unmeasured` beside `minutes`, so 7 is not read as the total', async () => {
    await stand();
    const out = await NavigationApi.routeBetween(
      P('a'),
      P('c'),
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    if (!out.ok) throw new Error('expected a plan');
    const plan = out.plans[0]!;
    expect(plan.cost.legs).toBe(2);
    expect(plan.cost.minutes).toBe(7);
    expect(plan.cost.unmeasured).toBe(1);
    // And it says so in words, because a floor presented as a total is
    // a lie the reader cannot see.
    expect(plan.assumptions.some((a) => a.kind === 'unmeasured')).toBe(true);
  });
});

describe('reachFrom — the lane compile read', () => {
  beforeEach(() => {
    install([
      {
        leaf: 'seed',
        exits: {
          north: { destination: P('road'), media: ['ground'] },
          east: { destination: P('water'), media: ['water'] },
        },
      },
      { leaf: 'road' },
      { leaf: 'water' },
    ]);
    stubGraphStore();
  });

  it("⭐ a mode's reach is that mode's induced subgraph, not the whole world", async () => {
    await stand();
    const foot = await NavigationApi.reachFrom(
      [P('seed')],
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    expect(foot.reached.sort()).toEqual([P('road'), P('seed')].sort());
    const boat = await NavigationApi.reachFrom(
      [P('seed')],
      BARGE,
      WORLD,
      PLENTY,
    );
    // ⚠ The seed itself is reached; a barge sitting in a dry yard is
    // where it is, it simply cannot leave by the road.
    expect(boat.reached.sort()).toEqual([P('seed'), P('water')].sort());
  });

  it('reports exhaustion, so a caller knows the set is a FLOOR', async () => {
    await stand();
    const out = await NavigationApi.reachFrom(
      [P('seed')],
      ON_FOOT,
      WORLD,
      1,
    );
    expect(out.exhausted).toBe(true);
  });
});

describe('costMatrix — the matrix, and no order', () => {
  beforeEach(() => {
    install([
      { leaf: 'a', exits: { north: { destination: P('b'), edgeMinutes: 3 } } },
      { leaf: 'b', exits: { north: { destination: P('c'), edgeMinutes: 4 } } },
      { leaf: 'c' },
    ]);
    stubGraphStore();
  });

  it('answers every ordered pair, with no pair to itself', async () => {
    await stand();
    const { pairs } = await NavigationApi.costMatrix(
      [P('a'), P('b'), P('c')],
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    expect(pairs).toHaveLength(6);
    expect(pairs.every((p) => p.from !== p.to)).toBe(true);
    const ac = pairs.find((p) => p.from === P('a') && p.to === P('c'))!;
    expect(ac.minutes).toBe(7);
    expect(ac.legs).toBe(2);
  });

  it('⚠ answers `null` for a pair with no way, rather than omitting it', async () => {
    // An absent row reads as *I did not ask*; `null` reads as *there
    // is no way*, and a tour builder needs to tell those apart.
    await stand();
    const { pairs } = await NavigationApi.costMatrix(
      [P('a'), P('c')],
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    const ca = pairs.find((p) => p.from === P('c') && p.to === P('a'))!;
    expect(ca.minutes).toBeNull();
    expect(ca.legs).toBeNull();
  });

  it('⭐ is ordered deterministically, so the matrix is the same every run', async () => {
    await stand();
    const a = await NavigationApi.costMatrix(
      [P('c'), P('a'), P('b')],
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    const b = await NavigationApi.costMatrix(
      [P('a'), P('b'), P('c')],
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    expect(a.pairs).toEqual(b.pairs);
  });
});

describe('the extent scope is the AUTHOR\'s to choose', () => {
  beforeEach(() => {
    seedKernelContentStore([
      { path: ZONE, class: '/platform/idea/location/CartesianZone', data: {} },
      {
        path: `${ZONE}/quarter/a`,
        class: '/platform/location/SingletonCartesianLocation',
        data: { exits: { north: { destination: `${ZONE}/far/b` } } },
      },
      {
        path: `${ZONE}/far/b`,
        class: '/platform/location/SingletonCartesianLocation',
        data: {},
      },
    ]);
    stubGraphStore();
  });

  it('⭐ a search scoped to an extent cannot leave it', async () => {
    // An NPC that only knows its own quarter is the AUTHOR saying so.
    // The engine never assumes it: what an NPC knows is 100% the
    // author's to declare.
    await stand();
    const scoped = await NavigationApi.routeBetween(
      `${ZONE}/quarter/a`,
      `${ZONE}/far/b`,
      ON_FOOT,
      { extent: `${ZONE}/quarter` },
      PLENTY,
    );
    expect(scoped.ok === false && scoped.reason).toBe('unknown-destination');

    const unscoped = await NavigationApi.routeBetween(
      `${ZONE}/quarter/a`,
      `${ZONE}/far/b`,
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    expect(unscoped.ok).toBe(true);
  });
});

describe('⛔ a BLOCKED authored way is not a way at all', () => {
  beforeEach(() => {
    install([
      {
        leaf: 'a',
        exits: {
          north: { destination: P('b'), blocked: true },
          east: { destination: P('c') },
        },
      },
      { leaf: 'b' },
      { leaf: 'c' },
    ]);
    stubGraphStore();
  });

  it('is absent from the search, not refused by it', async () => {
    await stand();
    const out = await NavigationApi.routeBetween(
      P('a'),
      P('b'),
      ON_FOOT,
      WORLD,
      PLENTY,
    );
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('no-way');
    // ⚠ And NOT a mode break: there is nothing there to need a medium.
    expect(out.breakAt).toBeUndefined();
  });
});
