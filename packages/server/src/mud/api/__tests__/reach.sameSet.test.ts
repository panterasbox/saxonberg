/**
 * ⭐⭐⭐ Reach is defined ONCE (controller-liquidity W20; the owner: *"I just
 * don't want two different algos for the same thing"*).
 *
 * `PerceptionApi.reach` is the list; `canReach` / `reachableAmong` test
 * membership in it and MQL's `reachable` pool is a view of it. This file
 * pins that the two cannot diverge: for each staged scene, at each rung,
 * everything MQL's `reachable` resolves is `canReach`-true and everything
 * `canReach`-true that the scene holds is what MQL's `reachable` resolves —
 * but for the room and vessel that HOLD the actor (the list's `around`
 * pool), which MQL names and a hand is in, not on.
 *
 * It also pins the cost: one walk per call — `reachableAmong` over a
 * `get produce`-shaped floor stock walks each holder once, never once per
 * candidate (the 96.5%-CPU lesson).
 */
import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MqlApi } from '../mql';
import { PerceptionApi } from '../perception';
import { ContainmentApi } from '../containment';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import Location from '../../lib/location/Location';
import CartesianZone from '../../platform/idea/location/CartesianZone';
import Door from '../../platform/thing/Door';
import { PerceptionMixin } from '../../lib/perception/Perception';
import { SensorMixin } from '../../lib/message/Sensor';
import { VisibleMixin } from '../../lib/description/Visible';
import { PerceptibleMixin } from '../../lib/description/Perceptible';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { SealableMixin } from '../../lib/spatial/Sealable';
import { AdornmentMixin } from '../../lib/boundary/Adornment';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { Idea } from '../../lib/stuff/Idea';
import { Agent } from '../../lib/stuff/Agent';
import Good from '../../lib/stuff/Good';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../lib/security/__tests__/test-setup';
import type { MqlContext } from '../mql/types';
import type { ReachDepth } from '../command';
import type { Stuff } from '../../lib/stuff/Stuff';

class Person extends CommandGiverMixin(
  PerceptionMixin(SensorMixin(ContainerMixin(ContainableMixin(Agent)))),
) {}
class Vessel extends SealableMixin(
  ContainerMixin(VisibleMixin(PerceptibleMixin(ContainableMixin(Idea)))),
) {}
class Apple extends VisibleMixin(PerceptibleMixin(ContainableMixin(Idea))) {}
class Sconce extends AdornmentMixin(VisibleMixin(PerceptibleMixin(Good))) {}

type Named = Stuff & { setShortDescription(s: string): void; setKeywords(k: string[]): void };
function named<T extends Named>(s: T, word: string): T {
  s.setShortDescription(`a ${word}`);
  s.setKeywords([word]);
  return s;
}
const vessel = (word: string, open: boolean): Vessel => {
  const v = named(makeStuff(() => new Vessel()), word);
  v.setOpen(open);
  return v;
};
const apple = (word = 'apple'): Apple => named(makeStuff(() => new Apple()), word);
const put = (what: Stuff, where: Stuff): void =>
  ContainmentApi.move(what as never, where as never);

const RUNGS: readonly ReachDepth[] = ['top', 'open', 'deep'];

/** MQL's `reachable` pool, whole, for `me` at `rung`. */
function mqlReachable(me: Person, rung: ReachDepth): Set<string> {
  const ctx: MqlContext = { commandGiver: me as never, scope: 'reachable', depth: rung };
  return new Set(MqlApi.resolveMany('reachable', ctx).stuff.map((s) => s.stuffId));
}

/**
 * The agreement: over every thing the scene staged plus everything MQL
 * offered, `canReach` and MQL's `reachable` say the same thing.
 */
function expectAgreement(me: Person, staged: readonly Stuff[]): void {
  for (const rung of RUNGS) {
    // What holds you (`around`) is named by MQL and never laid hands on —
    // the one pool that is not reach, and it is explicit in the list.
    const list = PerceptionApi.reach(me, { depth: rung });
    const touched = new Set(list.filter((r) => r.pool !== 'around').map((r) => r.stuff.stuffId));
    const heldIn = new Set(
      list.filter((r) => r.pool === 'around' && !touched.has(r.stuff.stuffId)).map((r) => r.stuff.stuffId),
    );
    const named = mqlReachable(me, rung);
    const mql = new Set([...named].filter((id) => !heldIn.has(id)));
    for (const id of heldIn) expect(named.has(id)).toBe(true);
    const universe = new Map<string, Stuff>();
    for (const s of staged) universe.set(s.stuffId, s);
    for (const r of list) universe.set(r.stuff.stuffId, r.stuff);
    for (const s of universe.values()) {
      const reach = PerceptionApi.canReach(me, s, { depth: rung });
      expect(
        { thing: s.getPresentation?.() ?? s.stuffId, rung, mql: mql.has(s.stuffId) },
      ).toEqual({ thing: s.getPresentation?.() ?? s.stuffId, rung, mql: reach });
    }
    const among = new Set(
      PerceptionApi.reachableAmong(me, [...universe.values()], { depth: rung }).map((s) => s.stuffId),
    );
    expect([...among].sort()).toEqual([...mql].filter((id) => universe.has(id)).sort());
  }
}

describe('reach is one list — MQL `reachable` ≡ canReach (W20)', () => {
  let zone: CartesianZone;
  let road: Location;
  let yard: Location;
  let me: Person;

  beforeEach(() => {
    seedKernelContentStore();
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    zone = makeStuff(() => new CartesianZone());
    road = makeStuff(() => new Location());
    road.setShortDescription('the road');
    yard = makeStuff(() => new Location());
    yard.setShortDescription('the yard');
    zone.addLocation(road, 0, 0, 0);
    zone.addLocation(yard, 0, 1, 0);
    me = makeStuff(() => new Person());
    put(me, road);
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('an open bag in a carried pack; a shut box carried; a shut chest and an open crate here', () => {
    const pack = vessel('pack', true);
    const bag = vessel('bag', true);
    const a = apple();
    put(pack, me);
    put(bag, pack);
    put(a, bag);
    const box = vessel('box', false);
    const b = apple();
    put(box, me);
    put(b, box);
    const chest = vessel('chest', false);
    const c = apple();
    put(chest, road);
    put(c, chest);
    const crate = vessel('crate', true);
    const inner = vessel('tin', true);
    const d = apple();
    const e = apple();
    put(crate, road);
    put(d, crate);
    put(inner, crate);
    put(e, inner);
    expectAgreement(me, [me, pack, bag, a, box, b, chest, c, crate, inner, d, e, road, yard]);
    // The rungs say what they say, on both sides at once.
    expect(PerceptionApi.canReach(me, a, { depth: 'open' })).toBe(true);
    expect(PerceptionApi.canReach(me, a, { depth: 'top' })).toBe(false);
    expect(PerceptionApi.canReach(me, b)).toBe(false);
    expect(PerceptionApi.canReach(me, b, { depth: 'deep' })).toBe(true);
    expect(PerceptionApi.canReach(me, e)).toBe(false);
  });

  it('in a boat on the river: the boat and the bank are both to hand', () => {
    const boat = vessel('boat', true);
    put(boat, road);
    put(me, boat);
    const onBank = apple();
    const inBoat = apple();
    put(onBank, road);
    put(inBoat, boat);
    expectAgreement(me, [me, boat, onBank, inBoat, road, yard]);
    expect(PerceptionApi.canReach(me, onBank)).toBe(true);
    expect(PerceptionApi.canReach(me, inBoat)).toBe(true);
  });

  it('a passenger in a shut coach: the one beside you is to hand', () => {
    const coach = vessel('coach', true);
    put(coach, road);
    put(me, coach);
    const other = makeStuff(() => new Person());
    put(other, coach);
    const purse = vessel('purse', true);
    const coin = apple('coin');
    put(purse, other);
    put(coin, purse);
    coach.setOpen(false);
    expectAgreement(me, [me, coach, other, purse, coin, road, yard]);
    expect(PerceptionApi.canReach(me, other)).toBe(true);
  });

  it('a fixture on the wall, a door on a way, the way itself', async () => {
    const sconce = named(makeStuff(() => new Sconce()), 'sconce');
    road.addFixture(sconce);
    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('a gate');
    await road.addBidirectionalExit(yard, 'north', { boundary: door });
    const north = road.getExit('north')!;
    const beyond = apple();
    put(beyond, yard);
    expectAgreement(me, [me, sconce, door, north, beyond, road, yard]);
    expect(PerceptionApi.canReach(me, sconce)).toBe(true);
    expect(PerceptionApi.canReach(me, door)).toBe(true);
    expect(PerceptionApi.canReach(me, north)).toBe(true);
    expect(PerceptionApi.canReach(me, beyond)).toBe(false);
  });

  it('the pools are MQL’s exactly: inventory, peers and here are filters of the list', () => {
    const pack = vessel('pack', true);
    put(pack, me);
    const onRoad = apple();
    put(onRoad, road);
    const sconce = named(makeStuff(() => new Sconce()), 'sconce');
    road.addFixture(sconce);
    const pool = (p: string): string[] =>
      PerceptionApi.reach(me)
        .filter((r) => r.pool === p)
        .map((r) => r.stuff.stuffId);
    expect(pool('self')).toEqual([me.stuffId]);
    expect(pool('inventory')).toEqual([pack.stuffId]);
    expect(pool('peers')).toEqual(expect.arrayContaining([onRoad.stuffId, sconce.stuffId]));
    expect(pool('peers')).not.toContain(me.stuffId);
    expect(pool('around')).toEqual([road.stuffId]);
    expect(PerceptionApi.canReach(me, road)).toBe(false);
    // Asking for a pool computes only that pool.
    expect(PerceptionApi.reach(me, { pools: ['inventory'] }).map((r) => r.stuff.stuffId)).toEqual([
      pack.stuffId,
    ]);
  });

  it('one walk per call: a floor stock of produce is walked once, not once per candidate', () => {
    const stock = vessel('stock', true);
    put(stock, road);
    const produce: Apple[] = [];
    for (let i = 0; i < 300; i++) {
      const p = apple('produce');
      put(p, stock);
      produce.push(p);
    }
    // The room's walk is the per-container step under the definition.
    const walk = vi.spyOn(Location.prototype, 'getReachableContents');
    try {
      const among = PerceptionApi.reachableAmong(me, produce);
      expect(among.length).toBe(300);
      expect(walk.mock.calls.length).toBe(1);
      walk.mockClear();
      const ctx: MqlContext = { commandGiver: me as never, scope: 'peers' };
      expect(MqlApi.resolveMany('produce', ctx).stuff.length).toBe(300);
      expect(walk.mock.calls.length).toBe(1);
    } finally {
      walk.mockRestore();
    }
  });
});
