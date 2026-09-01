/**
 * PlatPlan — the layout value-object (residences D13): slot↔node
 * mapping, plan-order slot allocation under the operator cap, routes
 * back to the entrance, and honest reachability for unbuilt reaches.
 * Synthetic data throughout.
 */

import { describe, it, expect } from 'vitest';
import { PlatPlan } from '../PlatPlan';

const BRANCHED = {
  shape: 'branched',
  roads: [
    {
      key: 'lane',
      segments: 3,
      frontagesPerSegment: 4,
      authored: { 1: '/obj/_test/lane' },
    },
    {
      key: 'court',
      segments: 1,
      frontagesPerSegment: 4,
      branchesFrom: { road: 'lane', segment: 2 },
    },
  ],
};

describe('linear (the dorm floor math)', () => {
  const plan = PlatPlan.parse({ shape: 'linear', frontagesPerNode: 3 });

  it('maps f<floor>-r<pos> to its floor node', () => {
    expect(plan.nodeOfSlot('f1-r1')).toBe('main:1');
    expect(plan.nodeOfSlot('f4-r3')).toBe('main:4');
    expect(plan.nodeOfSlot('f1-r4')).toBeNull(); // past the frontage count
    expect(plan.nodeOfSlot('lot-1')).toBeNull();
  });

  it('allocates gap-first, floor by floor, refusing at cap', () => {
    expect(plan.nextFreeSlot(new Set(), 100)).toBe('f1-r1');
    expect(plan.nextFreeSlot(new Set(['f1-r1', 'f1-r3']), 100)).toBe('f1-r2');
    expect(plan.nextFreeSlot(new Set(['f1-r1', 'f1-r2', 'f1-r3']), 100)).toBe('f2-r1');
    expect(plan.nextFreeSlot(new Set(['f1-r1', 'f1-r2', 'f1-r3']), 3)).toBeNull();
  });

  it('the frontages override substitutes the runtime dial', () => {
    const dialed = PlatPlan.parse(
      { shape: 'linear', frontagesPerNode: 3 },
      { frontagesOverride: 2 },
    );
    expect(dialed.nodeOfSlot('f1-r3')).toBeNull();
    expect(dialed.nextFreeSlot(new Set(['f1-r1', 'f1-r2']), 100)).toBe('f2-r1');
  });

  it('routes run entrance-out; reachability sees at-or-beyond', () => {
    expect(plan.routeOf('main:3')).toEqual(['main:1', 'main:2', 'main:3']);
    const provisioned = new Set(['main:3']);
    expect(plan.reachableGiven(provisioned, 'main:2')).toBe(true);
    expect(plan.reachableGiven(provisioned, 'main:4')).toBe(false);
  });
});

describe('branched (roads, a court, an authored lane)', () => {
  const plan = PlatPlan.parse(BRANCHED);

  it('numbers lots road-by-road, segment by segment', () => {
    expect(plan.nodeOfSlot('lot-1')).toBe('lane:1');
    expect(plan.nodeOfSlot('lot-5')).toBe('lane:2');
    expect(plan.nodeOfSlot('lot-12')).toBe('lane:3');
    expect(plan.nodeOfSlot('lot-13')).toBe('court:1');
    expect(plan.nodeOfSlot('lot-17')).toBeNull(); // past the plat
  });

  it('orders slots road-by-segment and honours the cap', () => {
    expect(plan.nextFreeSlot(new Set(), 40)).toBe('lot-1');
    expect(plan.nextFreeSlot(new Set(['lot-1']), 40)).toBe('lot-2');
    expect(plan.nextFreeSlot(new Set(['lot-1']), 1)).toBeNull();
  });

  it('a branch road routes through its parent segment', () => {
    expect(plan.routeOf('court:1')).toEqual(['lane:1', 'lane:2', 'court:1']);
  });

  it('an unsold reach is honestly unreachable until frontage sells', () => {
    const sold = new Set([plan.nodeOfSlot('lot-2')!]); // lane:1
    expect(plan.reachableGiven(sold, 'lane:1')).toBe(true);
    expect(plan.reachableGiven(sold, 'lane:2')).toBe(false);
    // A court sale opens the whole route out to it.
    const courtSold = new Set([plan.nodeOfSlot('lot-13')!]);
    for (const node of ['lane:1', 'lane:2', 'court:1']) {
      expect(plan.reachableGiven(courtSold, node)).toBe(true);
    }
    expect(plan.reachableGiven(courtSold, 'lane:3')).toBe(false);
  });

  it('the authored lane segment is authored; minted reaches are not', () => {
    expect(plan.isAuthored('lane:1')).toBe(true);
    expect(plan.authoredPathOf('lane:1')).toBe('/obj/_test/lane');
    expect(plan.isAuthored('lane:2')).toBe(false);
    expect(plan.predecessorOf('lane:2')).toBe('lane:1');
    expect(plan.predecessorOf('court:1')).toBe('lane:2');
    expect(plan.predecessorOf('lane:1')).toBeNull();
  });
});

describe('static (authored circulation, minted holdings)', () => {
  const plan = PlatPlan.parse({
    shape: 'static',
    nodes: [
      { key: 'row', path: '/obj/_test/row', slots: ['lot-1', 'lot-2'] },
      { key: 'close', path: '/obj/_test/close', slots: ['lot-3'] },
    ],
  });

  it('maps only the authored slots; allocation walks node order', () => {
    expect(plan.nodeOfSlot('lot-2')).toBe('row:1');
    expect(plan.nodeOfSlot('lot-3')).toBe('close:1');
    expect(plan.nodeOfSlot('lot-4')).toBeNull();
    expect(plan.nextFreeSlot(new Set(['lot-1']), 10)).toBe('lot-2');
    expect(plan.nextFreeSlot(new Set(['lot-1', 'lot-2', 'lot-3']), 10)).toBeNull();
  });

  it('authored streets are always reachable and never minted', () => {
    expect(plan.isAuthored('row:1')).toBe(true);
    expect(plan.reachableGiven(new Set(), 'close:1')).toBe(true);
  });
});

describe('parse validation', () => {
  it('refuses malformed plans at parse', () => {
    expect(() => PlatPlan.parse({ shape: 'static' })).toThrow(/nodes/);
    expect(() => PlatPlan.parse({ shape: 'branched' })).toThrow(/roads/);
    expect(() =>
      PlatPlan.parse({
        shape: 'branched',
        roads: [
          { key: 'a', segments: 1, frontagesPerSegment: 1, branchesFrom: { road: 'zzz', segment: 1 } },
        ],
      }),
    ).toThrow(/branches from/);
    expect(() => PlatPlan.parse({ shape: 'nope' })).toThrow(/unknown shape/);
  });
});

/**
 * ⚠ The branch direction is CARDINAL and AUTHORED, because a grid
 * refuses a non-cardinal exit into its own zone and both reaches of a
 * branch clone the same road row (so they resolve to the same zone).
 * It used to be derived from the road KEY — `court`, which is not a
 * direction — and the first lot sold on a branch road threw as its
 * reach was wired.
 */
describe('the fork direction', () => {
  const plan = PlatPlan.parse(BRANCHED);

  it('runs in line along a road', () => {
    expect(plan.onwardDirectionOf('lane:2')).toBe('west');
    expect(plan.onwardDirectionOf('lane:3')).toBe('west');
  });

  it('⭐ takes the plat\'s authored cardinal at a fork', () => {
    const north = PlatPlan.parse({
      shape: 'branched',
      roads: [
        { key: 'lane', segments: 3, frontagesPerSegment: 4, authored: { 1: '/obj/_test/lane' } },
        { key: 'court', segments: 1, frontagesPerSegment: 4,
          branchesFrom: { road: 'lane', segment: 2, direction: 'north' } },
      ],
    });
    expect(north.onwardDirectionOf('court:1')).toBe('north');
    // Unauthored defaults to north rather than to the road key.
    expect(plan.onwardDirectionOf('court:1')).toBe('north');
  });

  it('a non-cardinal branch direction fails at PARSE, not on the ninth sale', () => {
    expect(() =>
      PlatPlan.parse({
        shape: 'branched',
        roads: [
          { key: 'lane', segments: 3, frontagesPerSegment: 4, authored: { 1: '/obj/_test/lane' } },
          { key: 'court', segments: 1, frontagesPerSegment: 4,
            branchesFrom: { road: 'lane', segment: 2, direction: 'court' } },
        ],
      }),
    ).toThrow(/cardinal/);
  });

  it('only a road HEAD forks — later reaches of a branch still run in line', () => {
    const long = PlatPlan.parse({
      shape: 'branched',
      roads: [
        { key: 'lane', segments: 3, frontagesPerSegment: 4, authored: { 1: '/obj/_test/lane' } },
        { key: 'court', segments: 3, frontagesPerSegment: 4,
          branchesFrom: { road: 'lane', segment: 2, direction: 'south' } },
      ],
    });
    expect(long.onwardDirectionOf('court:1')).toBe('south');
    expect(long.onwardDirectionOf('court:2')).toBe('west');
  });
});
