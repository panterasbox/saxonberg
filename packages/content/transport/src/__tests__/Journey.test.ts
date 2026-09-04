/**
 * The Journey — a trip whose **beat is one leg**, over a synthetic
 * five-room corridor.
 *
 * The claims this file exists for, in the order they matter:
 *
 *  1. ⭐⭐ **Exactly one `traverse` per leg, through the shipped movement
 *     path.** There is no second movement implementation, so a journey
 *     cannot silently bypass a mode gate (AC5).
 *  2. The driver's **`hands`** are engaged and `body` / `attention` /
 *     `voice` are free — which is what makes an escort mechanically
 *     necessary and a passenger genuinely idle (AC7).
 *  3. An abort **leaves the vehicle in the node it reached**, and the
 *     three reasons are distinguishable (AC6).
 *  4. **Arrival is a completion**, not an abort.
 *  5. **Combat does not interrupt.** Being shot at does not stop your
 *     wagon; stopping is the driver's own cancel (D4).
 *  6. Duration scales with **load** (AC9's mechanism half).
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { EventApi } from '@saxonberg/server/mud/api/event';
import EventRegistry from '@saxonberg/server/mud/platform/idea/EventRegistry';
import { Stuff as StuffClass } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MobileMixin } from '@saxonberg/server/mud/lib/spatial/Mobile';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { EngagedMixin } from '@saxonberg/server/mud/lib/activity/Engaged';
import { HaulerMixin } from '@saxonberg/server/mud/lib/slot/Hauler';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Engaged } from '@saxonberg/server/mud/lib/activity/Engaged';
import LaneCatalogue from '../idea/LaneCatalogue';
import { Journey } from '../lib/journey/Journey';
import HaulageRig from '../thing/HaulageRig';
import {
  corridor,
  installModes,
  installRooms,
  installRows,
  type Corridor,
} from './transport-fixtures';

/** A driver: engaged, mobile, and able to pull a rig. */
class TestDriver extends HaulerMixin(
  EngagedMixin(ContainerMixin(MobileMixin(ContainableMixin(Idea)))),
) {
  static _mixinName = 'TestDriver';
}

/** A passenger — mobile, but holding no engagement of its own. */
class TestPassenger extends EngagedMixin(MobileMixin(ContainableMixin(Idea))) {
  static _mixinName = 'TestPassenger';
}

const P = (i: number): string => `/test/road/${i}`;
const catalogue = (): LaneCatalogue => makeStuff(() => new LaneCatalogue());

/**
 * One game minute at scale 1, then drain the queues.
 *
 * ⚠ A beat is genuinely async — it resolves an exit, loads a mode and
 * awaits `Mobile.traverse` — so a microtask flush alone is not enough;
 * the macrotask turn is what lets a settled promise chain finish before
 * the next tick is measured.
 */
async function tick(times = 1): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    WorldClockApi._advanceForTesting(60_000);
    for (let f = 0; f < 4; f += 1) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
}

interface Rig {
  road: Corridor;
  driver: TestDriver;
  rig: HaulageRig;
  cat: LaneCatalogue;
}

/**
 * A driver hitched to a rig at the head of a five-room corridor, on a
 * `walk` lane whose every edge costs one game minute.
 */
async function setup(edgeMinutes = 1): Promise<Rig> {
  const road = corridor(5, { edgeMinutes });
  installRooms(road.rooms);
  installRows([{ key: 'road', mode: 'walk', seeds: [P(0)] }]);
  const driver = makeStuff(() => new TestDriver());
  const rig = makeStuff(() => new HaulageRig());
  ContainmentApi.move(driver as never, road.rooms.get(P(0))! as never);
  ContainmentApi.move(rig as never, road.rooms.get(P(0))! as never);
  // Hitched, so the fixture exercises the SHIPPED haulage tow rather
  // than a driver who happens to walk beside a cart.
  driver.hitch(rig as never);
  return { road, driver, rig, cat: catalogue() };
}

async function start(
  ctx: Rig,
  to = P(4),
): Promise<Journey> {
  const route = (await ctx.cat.planRoute(P(0), to, 'road'))!;
  const journey = new Journey({
    driver: ctx.driver as unknown as Stuff & Engaged,
    vehicle: ctx.rig as unknown as Stuff,
    route,
    mode: 'walk',
    catalogue: ctx.cat,
  });
  const started = SchedulerApi.start(journey);
  expect(started.ok).toBe(true);
  return journey;
}

/**
 * The scheduler subscribes to its engagement's HOST destruction, so the
 * event registry has to exist for `vehicle-disabled` to be reachable at
 * all — the same setup the kernel's own host-destruction suite uses.
 */
/**
 * Record every abort reason the scheduler dispatches.
 *
 * ⚠ On the PROTOTYPE, not the instance: the registry dispatches
 * `cls.prototype.onAbort.call(e)` through its capture-at-start class
 * index, so an instance spy is never consulted. (Found the hard way.)
 */
function watchAborts(): AbortReason[] {
  const seen: AbortReason[] = [];
  const real = Journey.prototype.onAbort;
  vi.spyOn(Journey.prototype, 'onAbort').mockImplementation(function (
    this: Journey,
    reason: AbortReason,
  ) {
    seen.push(reason);
    return real.call(this, reason);
  });
  return seen;
}

async function bootstrapEvents(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    StuffClass._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

beforeEach(async () => {
  WorldClockApi._resetForTesting();
  WorldClockApi.setScale(1);
  SchedulerApi._clearAllForTesting();
  StuffApi.clearAll();
  await bootstrapEvents();
  installModes();
});
afterEach(() => {
  SchedulerApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the Journey', () => {
  it('⭐⭐ issues exactly ONE traverse per leg, and no second movement path', async () => {
    const ctx = await setup();
    // Count every call to the SHIPPED movement primitive, and let it run.
    const moved: string[] = [];
    const real = ctx.driver.traverse.bind(ctx.driver);
    vi.spyOn(ctx.driver, 'traverse').mockImplementation(async (exit, mode) => {
      moved.push(`${exit.getDirection()}:${mode}`);
      return real(exit, mode);
    });

    await start(ctx);
    await tick(6);

    // Four legs over five rooms — and every one of them went through
    // `Mobile.traverse`, in the lane's own mode.
    expect(moved).toEqual([
      'east:walk',
      'east:walk',
      'east:walk',
      'east:walk',
    ]);
    expect(ctx.driver.getContainer()).toBe(ctx.road.rooms.get(P(4)));
  });

  it('⭐ holds the HANDS only — body, attention and voice stay free (AC7)', async () => {
    const ctx = await setup(5);
    const journey = await start(ctx);
    expect(ctx.driver.getEngagementBySlot('hands')).toBe(journey);
    expect(ctx.driver.getEngagementBySlot('body')).toBeUndefined();
    expect(ctx.driver.getEngagementBySlot('attention')).toBeUndefined();
    expect(ctx.driver.getEngagementBySlot('voice')).toBeUndefined();
  });

  it('a passenger holds NO engagement at all', async () => {
    const ctx = await setup(5);
    const rider = makeStuff(() => new TestPassenger());
    ContainmentApi.move(rider as never, ctx.rig as never);
    await start(ctx);
    for (const slot of ['hands', 'body', 'attention', 'voice'] as const) {
      expect(rider.getEngagementBySlot(slot)).toBeUndefined();
    }
  });

  it('⚠ combat does NOT interrupt — being shot at does not stop your wagon', async () => {
    const ctx = await setup(5);
    const journey = await start(ctx);
    expect(journey.interruptibleBy.has('combat' as AbortReason)).toBe(false);
    expect(journey.interruptibleBy.size).toBe(0);
    // …and it IS cancelable: stopping is the driver's own act.
    expect(journey.cancelable).toBe(true);
  });

  it('a blocked exit mid-route aborts route-blocked, and leaves the vehicle where it got to (AC6)', async () => {
    const ctx = await setup();
    const aborts = watchAborts();
    await start(ctx);

    await tick(2); // two legs travelled
    expect(ctx.driver.getContainer()).toBe(ctx.road.rooms.get(P(2)));
    ctx.road.exits.get(`${P(2)}→${P(3)}`)!.setBlocked(true);
    await tick(2);

    expect(aborts).toEqual(['route-blocked']);
    // ⭐ Nothing rewound and nothing teleported home.
    expect(ctx.driver.getContainer()).toBe(ctx.road.rooms.get(P(2)));
  });

  it('⭐ a rig that comes off the hitch aborts vehicle-disabled', async () => {
    // The shipped BREAKAWAY gate, in miniature: the cart is no longer on
    // the hitch, so the journey ends naming the vehicle rather than the
    // driver walking on with the cargo standing in the road behind them.
    const ctx = await setup();
    const aborts = watchAborts();
    await start(ctx);
    await tick(1);
    ctx.driver.unhitch();
    await tick(1);
    expect(aborts).toEqual(['vehicle-disabled']);
    // And it stopped where it got to, like every other abort.
    expect(ctx.driver.getContainer()).toBe(ctx.road.rooms.get(P(1)));
  });

  it('a DESTROYED vehicle tears the journey down through the host hook', async () => {
    const ctx = await setup();
    const aborts = watchAborts();
    const journey = await start(ctx);
    await StuffApi.destruct(ctx.rig as unknown as Stuff);
    await tick(1);
    // The framework's own host subscription fires first — the vehicle IS
    // the engagement's host — so the reason is `host-destroyed` rather
    // than ours. Distinguishable in the envelope either way (AC6), and
    // the more precise of the two.
    expect(aborts).toEqual(['host-destroyed']);
    expect(SchedulerApi.getEngagementById(journey.engagementId)).toBeUndefined();
  });

  it('⭐ arrival is a COMPLETION, not an abort', async () => {
    const ctx = await setup();
    const aborts = watchAborts();
    const journey = await start(ctx);
    await tick(6);

    expect(aborts).toEqual([]);
    // The engagement is gone, and the hands are free again.
    expect(ctx.driver.getEngagementBySlot('hands')).toBeUndefined();
    expect(SchedulerApi.getEngagementById(journey.engagementId)).toBeUndefined();
  });

  it('a long edge takes longer — the budget is per EDGE', async () => {
    const ctx = await setup(3); // three game minutes per leg
    await start(ctx, P(2));
    await tick(2);
    // Not there yet: two ticks does not buy a three-minute edge.
    expect(ctx.driver.getContainer()).toBe(ctx.road.rooms.get(P(0)));
    await tick(1);
    expect(ctx.driver.getContainer()).toBe(ctx.road.rooms.get(P(1)));
  });

  it('the readout says where you are and how far is left', async () => {
    const ctx = await setup(2);
    const journey = await start(ctx);
    expect(journey.currentNode()).toBe(P(0));
    expect(journey.legsRemaining()).toBe(4);
    // Four legs at two game minutes each.
    expect(await journey.estimateRemainingGameMinutes()).toBe(8);
    await tick(2);
    expect(journey.currentNode()).toBe(P(1));
    expect(journey.legsRemaining()).toBe(3);
  });

  it('⭐ a LOADED rig is slower than an empty one (AC9)', async () => {
    const empty = await setup(4);
    const emptyJourney = await start(empty);
    const emptyEstimate = await emptyJourney.estimateRemainingGameMinutes();

    // The same road, with the rig loaded. The load fraction is read off
    // the shipped encumbrance surface — nothing new measures a cargo —
    // and this pins the ONE thing the fraction buys: more time on the
    // same edge.
    const loadedJourney = new Journey({
      driver: empty.driver as unknown as Stuff & Engaged,
      vehicle: empty.rig as unknown as Stuff,
      route: emptyJourney.route,
      mode: 'walk',
      catalogue: empty.cat,
    });
    // Force the load fraction to capacity through the one seam that
    // decides it, rather than by building a body plan here.
    vi.spyOn(
      loadedJourney as unknown as { loadFactor: () => number },
      'loadFactor',
    ).mockReturnValue(1.5);
    expect(await loadedJourney.estimateRemainingGameMinutes()).toBeGreaterThan(
      emptyEstimate,
    );
  });
});
