/**
 * OfferEngagement — ⭐⭐ **hold still, and it comes.**
 *
 * The `approach` rung: the offerer's hands are busy for `APPROACH_MS`, and
 * at completion the animal decides on the world as it is THEN. Proves:
 *
 *   - keep still (same room, food still in hand, still willing) → it
 *     takes it from your hand, with a hand-feed's credit;
 *   - step out of the room, or give the food away → it does not come,
 *     and nothing is credited;
 *   - `cancel` → it does not come;
 *   - every way of it not coming reads the same, and never says why.
 *
 * The animal is a fake: what is under test is the BEAT — what the
 * engagement checks and when — not the meal (`Bonded.test`).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfferEngagement } from '../OfferEngagement';
import { APPROACH_MS } from '../Bonded';
import { EngagedMixin } from '../../activity/Engaged';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { Idea } from '../../stuff/Idea';
import Location from '../../stuff/Location';
import type { Stuff } from '../../stuff/Stuff';
import type { Bonded } from '../Bonded';
import { SchedulerApi } from '../../../api/scheduler';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { makeStuff } from '../../security/__tests__/test-setup';
import EventRegistry from '../../../platform/idea/EventRegistry';
import { EventApi } from '../../../api/event';
import { Stuff as StuffBase } from '../../stuff/Stuff';
import { WorldClockApi } from '../../../api/worldclock';

/** The scheduler's host-destruction hook subscribes on start. */
async function makeRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    StuffBase._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

class Keeper extends EngagedMixin(ContainerMixin(ContainableMixin(Idea))) {}
class Scrap extends ContainableMixin(Idea) {}
class Beast extends ContainableMixin(Idea) {
  ate: { food: Stuff; offerer: Stuff | null }[] = [];
  refusal: string | null = null;
  wouldEat(): string | null {
    return this.refusal;
  }
  async eatFood(food: Stuff, offerer: Stuff | null): Promise<boolean> {
    this.ate.push({ food, offerer });
    return true;
  }
}

let toSelf: string[];

function world() {
  const lane = makeStuff(() => new Location());
  const yard = makeStuff(() => new Location());
  const keeper = makeStuff(() => new Keeper());
  const beast = makeStuff(() => new Beast());
  const scrap = makeStuff(() => new Scrap());
  ContainmentApi.move(keeper, lane);
  ContainmentApi.move(beast, lane);
  ContainmentApi.move(scrap, keeper);
  return { lane, yard, keeper, beast, scrap };
}

function offer(w: ReturnType<typeof world>): OfferEngagement {
  const e = new OfferEngagement({
    actor: w.keeper,
    animal: w.beast as unknown as Stuff & Bonded,
    food: w.scrap,
  });
  const r = SchedulerApi.start(e);
  expect(r.ok && r.status === 'started').toBe(true);
  return e;
}

/** Run the beat out on the world clock, then let the meal's promise land. */
async function settle(): Promise<void> {
  WorldClockApi._advanceForTesting(APPROACH_MS + 10);
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(async () => {
  WorldClockApi._resetForTesting();
  WorldClockApi.setScale(1);
  SchedulerApi._clearAllForTesting();
  StuffApi.clearAll();
  EventApi._clearAllForTesting();
  await makeRegistry();
  toSelf = [];
  vi.spyOn(Mml, 'compose').mockImplementation(
    ((strings: TemplateStringsArray) => strings.raw.join('')) as never,
  );
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const chain = {
      topic: () => chain,
      toSelf: (b: unknown) => {
        toSelf.push(String(b));
        return chain;
      },
      toPeers: () => chain,
      send: () => {},
    };
    return chain as never;
  });
});
afterEach(() => {
  SchedulerApi._clearAllForTesting();
  EventApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
});

describe('OfferEngagement', () => {
  it('occupies the hands for APPROACH_MS', () => {
    const w = world();
    offer(w);
    expect(w.keeper.getEngagementBySlot('hands')).toBeDefined();
    expect(w.keeper.getEngagementBySlot('body')).toBeUndefined();
  });

  it('⭐⭐ keep still and it takes it from your hand — a hand-feed, credited to you', async () => {
    const w = world();
    offer(w);
    await settle();
    expect(w.beast.ate).toEqual([{ food: w.scrap, offerer: w.keeper }]);
    expect(toSelf.some((l) => /takes it from your hand/.test(l))).toBe(true);
    expect(w.keeper.getEngagementBySlot('hands')).toBeUndefined();
  });

  it('⚠ step out of the room and it does not come', async () => {
    const w = world();
    offer(w);
    ContainmentApi.move(w.keeper, w.yard);
    await settle();
    expect(w.beast.ate).toHaveLength(0);
    expect(toSelf.at(-1)).toMatch(/does not come/);
  });

  it('⚠ give the food away mid-beat and it does not come', async () => {
    const w = world();
    offer(w);
    ContainmentApi.move(w.scrap, w.lane);
    await settle();
    expect(w.beast.ate).toHaveLength(0);
    expect(toSelf.at(-1)).toMatch(/does not come/);
  });

  it('⚠ it stopped wanting it in the meantime — same sentence, no reason', async () => {
    const w = world();
    offer(w);
    w.beast.refusal = 'not-hungry';
    await settle();
    expect(w.beast.ate).toHaveLength(0);
    expect(toSelf.at(-1)).toMatch(/does not come/);
    expect(toSelf.at(-1)).not.toMatch(/hungry|moved|room/i);
  });

  it('`cancel` and it does not come', () => {
    const w = world();
    const e = offer(w);
    SchedulerApi.cancel(e, 'cancelled');
    expect(w.beast.ate).toHaveLength(0);
    expect(toSelf.at(-1)).toMatch(/does not come/);
  });
});
