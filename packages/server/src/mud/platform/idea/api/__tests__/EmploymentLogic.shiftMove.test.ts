/**
 * The roster tick's **presence** half — where a shift puts a body, and
 * when the proprietor covers.
 *
 * ⭐⭐ This used to be two brains polling every 30 seconds to notice an
 * HOURLY flip (`shifts`, `covers` — 22 timer fires a minute across eleven
 * rows to catch up with something that changes at most once a game hour).
 * Presence is a CONSEQUENCE of employment state, so it belongs to the
 * thing that owns the state: the flip itself is the event, and a poll in
 * front of it was only ever latency.
 *
 * ⚠ Cover is reconciled at the END of `tickBusiness`, which means it is
 * reconciled by `ensureOperatorAt` too — so the proprietor steps behind an
 * empty bar **when somebody orders**, not up to a game-hour later. That is
 * what the old brain's presence-gating was approximating.
 *
 * The clock harness is `EmploymentLogic.tick.test.ts`'s.
 */
/**
 * ⚠ Paths are synthetic (`/test/**`). A kernel test proves the KERNEL, so it
 * must not name shipped content — a test of real rows lives beside them
 * (`src/mud/world/**`). `lint:test-content` enforces it, and caught these
 * four on their first run.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmploymentApi } from '../../../../api/employment';
import { BankingApi } from '../../../../api/banking';
import { WorldClockApi } from '../../../../api/worldclock';
import { Quantity } from '../../../../lib/quantity';
import BusinessEntity from '../../Business';
import Offstage from '../../../location/Offstage';
import { EmployedMixin } from '../../../../lib/employment/Employed';
import { MobileMixin } from '../../../../lib/spatial/Mobile';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { Idea } from '../../../../lib/stuff/Idea';
import Thing from '../../../../lib/stuff/Thing';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';

const BUSINESS = '/test/idea/house';
const MARA = '/test/agent/rostered';
const DAVE = '/test/agent/proprietor';
const BAR = '/test/location/floor';
const CELLAR = '/test/location/back';
const OFFSTAGE = '/test/location/offstage';

class Worker extends EmployedMixin(MobileMixin(ContainableMixin(Idea))) {
  static _mixinName = 'Worker';
}
/**
 * ⚠ A counter: MATTER that holds things. `Thing` is the branch, which is
 * what `moveForShift` discriminates on — a place to stand is never Matter.
 */
class Fixture extends ContainerMixin(ContainableMixin(Thing)) {}

class Room extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = 'Room';
}

function atClock(weekday: number, hour: number): number {
  const q = Quantity.of(weekday * 86_400 + hour * 3_600, 's');
  vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(q);
  return q.rawValue();
}

interface World {
  business: BusinessEntity;
  rooms: Map<string, Stuff>;
}

function seed(
  opts: { offstage?: string; station?: string; proprietor?: boolean } = {},
): World {
  const b = makeStuffAtPath(() => new BusinessEntity(), BUSINESS);
  b.banksAt = BankingApi.defaultCustodianBank();
  b.positions = [
    {
      key: 'bartender',
      label: 'tending bar',
      wageRate: 12,
      fulfills: ['bartending'],
    },
  ];
  b.rosterSlots = [
    {
      positionKey: 'bartender',
      assignee: MARA,
      schedule: [{ days: [0, 1, 2, 3, 4], hours: [6, 14] }],
      ...(opts.station ? { station: opts.station } : {}),
    },
  ];
  b.operatingLocations = [BAR];
  if (opts.offstage !== undefined) b.offstage = opts.offstage;
  if (opts.proprietor) {
    b.appointingAuthority = { kind: 'entity', path: DAVE };
  }

  // ⚠ Stamped at their paths, not bare: `isFulfilling` asks whether the
  // actor stands in one of the house's `operatingLocations`, which is a
  // comparison against `getTemplatePath()`. An unstamped room reads as
  // "nowhere this house operates", so a covering proprietor standing right
  // behind the bar would serve nobody — silently.
  const rooms = new Map<string, Stuff>();
  for (const path of [BAR, CELLAR]) {
    rooms.set(path, makeStuffAtPath(() => new Room(), path) as unknown as Stuff);
  }
  rooms.set(
    OFFSTAGE,
    makeStuffAtPath(() => new Offstage(), OFFSTAGE) as unknown as Stuff,
  );
  vi.spyOn(StuffApi, 'singletonOrClone').mockImplementation(
    async (path: string) => rooms.get(path)!,
  );
  return { business: b, rooms };
}

/** Let the fire-and-forget moves inside the tick settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

describe('the shift move', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => vi.restoreAllMocks());

  it('⭐ off→on puts the assignee at the house’s first operating location', async () => {
    const { rooms } = seed({ offstage: OFFSTAGE });
    const mara = makeStuffAtPath(() => new Worker(), MARA);
    ContainmentApi.move(mara as never, rooms.get(OFFSTAGE) as never);

    atClock(2, 10); // Wednesday 10:00 — on shift
    EmploymentApi.tickRoster();
    await settle();

    expect(mara.getContainer()?.stuffId).toBe(rooms.get(BAR)!.stuffId);
  });

  it('⭐ a seat with a `station` overrides it — a shift is SOMEWHERE, and the seat says where', async () => {
    const { rooms } = seed({ offstage: OFFSTAGE, station: CELLAR });
    const mara = makeStuffAtPath(() => new Worker(), MARA);
    ContainmentApi.move(mara as never, rooms.get(OFFSTAGE) as never);

    atClock(2, 10);
    EmploymentApi.tickRoster();
    await settle();

    expect(mara.getContainer()?.stuffId).toBe(rooms.get(CELLAR)!.stuffId);
  });

  it('on→off parks them in the house’s offstage', async () => {
    const { rooms } = seed({ offstage: OFFSTAGE });
    const mara = makeStuffAtPath(() => new Worker(), MARA);
    ContainmentApi.move(mara as never, rooms.get(BAR) as never);

    atClock(2, 10); // on
    EmploymentApi.tickRoster();
    await settle();
    expect(mara.getContainer()?.stuffId).toBe(rooms.get(BAR)!.stuffId);

    atClock(2, 20); // off
    EmploymentApi.tickRoster();
    await settle();
    expect(mara.getContainer()?.stuffId).toBe(rooms.get(OFFSTAGE)!.stuffId);
  });

  it('⚠ a house that authors no `offstage` moves nobody off — as every house without the old brain did', async () => {
    const { rooms } = seed({});
    const mara = makeStuffAtPath(() => new Worker(), MARA);
    ContainmentApi.move(mara as never, rooms.get(BAR) as never);

    atClock(2, 10);
    EmploymentApi.tickRoster();
    await settle();
    atClock(2, 20);
    EmploymentApi.tickRoster();
    await settle();

    // Still standing where the world put her. No invented room, no throw.
    expect(mara.getContainer()?.stuffId).toBe(rooms.get(BAR)!.stuffId);
  });
});

describe('cover, on demand', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => vi.restoreAllMocks());

  it('⭐⭐ nobody rostered is tending, so the proprietor covers — and stands where the work is', async () => {
    const { rooms } = seed({ offstage: OFFSTAGE, proprietor: true });
    makeStuffAtPath(() => new Worker(), MARA);
    const dave = makeStuffAtPath(() => new Worker(), DAVE);
    ContainmentApi.move(dave as never, rooms.get(CELLAR) as never);

    atClock(2, 20); // Wednesday 20:00 — Mara is off
    EmploymentApi.tickRoster();
    await settle();

    expect(dave.getEmployment(BUSINESS)?.status).toBe('on-shift');
    // ⚠ The old brain asked "is another maker in MY room", which made cover
    // a question about where the proprietor happened to be standing. He was
    // in the cellar; the bar was unattended; he comes out.
    expect(dave.getContainer()?.stuffId).toBe(rooms.get(BAR)!.stuffId);
    // ⭐ And the order matters: `isFulfilling` reads the room, so the cover
    // only actually serves anybody once the move has landed.
    expect(dave.isFulfilling('bartending')).toBe(true);
  });

  it('a rostered bartender comes on shift and the cover ends', async () => {
    const { rooms } = seed({ offstage: OFFSTAGE, proprietor: true });
    const mara = makeStuffAtPath(() => new Worker(), MARA);
    const dave = makeStuffAtPath(() => new Worker(), DAVE);
    ContainmentApi.move(mara as never, rooms.get(OFFSTAGE) as never);
    ContainmentApi.move(dave as never, rooms.get(BAR) as never);

    atClock(2, 20);
    EmploymentApi.tickRoster();
    await settle();
    expect(dave.getEmployment(BUSINESS)?.status).toBe('on-shift');

    atClock(2, 10); // Mara's window
    EmploymentApi.tickRoster();
    await settle();

    expect(mara.getEmployment(BUSINESS)?.status).toBe('on-shift');
    expect(dave.getEmployment(BUSINESS)?.status).not.toBe('on-shift');
  });

  it('⚠ a house with no fulfilling seat is never covered — there is nothing to cover', async () => {
    const { business, rooms } = seed({ offstage: OFFSTAGE, proprietor: true });
    business.positions = [
      { key: 'keeper', label: 'keeping the bar', wageRate: 0, purchases: true },
    ];
    business.rosterSlots = [
      {
        positionKey: 'keeper',
        assignee: MARA,
        schedule: [{ days: [0, 1, 2, 3, 4], hours: [6, 14] }],
      },
    ];
    makeStuffAtPath(() => new Worker(), MARA);
    const dave = makeStuffAtPath(() => new Worker(), DAVE);
    ContainmentApi.move(dave as never, rooms.get(CELLAR) as never);

    atClock(2, 20);
    EmploymentApi.tickRoster();
    await settle();

    expect(dave.getEmployment(BUSINESS)).toBeUndefined();
    expect(dave.getContainer()?.stuffId).toBe(rooms.get(CELLAR)!.stuffId);
  });
});

/**
 * ⭐⭐⭐ The regression that broke the realm's MAIN SHOP — pinned, through
 * the real roster tick.
 *
 * `operatingLocations[0]` for the general store is its **COUNTER**, and
 * deliberately so: a house that listed only the room was unfindable as a
 * supplier, so the fixture is first. The old `moveForShift` took whatever
 * was first, `singletonOrClone`d it, and teleported the assignee into it
 * — a `Stock` being a `Container`. Two consequences, both found by the
 * reachability sweep's drive and neither visible to any unit test:
 *
 *  1. a SECOND counter was minted at that template path, so every
 *     `findByTemplatePath` of it threw `expected singleton, found N` —
 *     and `BuyController` does exactly that on every purchase. `buy
 *     torch` answered *"Something went wrong in BuyController"* at the
 *     realm's main shop on a fresh boot, for every good on the shelf.
 *  2. the shopkeeper stood inside the till.
 *
 * ⚠ The drive found the count at THREE: this, plus two consignment
 * brains with the same `?? singletonOrClone(shelfPath)` fallback, all
 * three aimed at one counter.
 */
describe('⚠⚠ a FIXTURE in operatingLocations is not a place to stand', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => vi.restoreAllMocks());

  it('skips the Thing, takes the room, and mints no second fixture', async () => {
    // ⚠ , not : a kernel test proves the kernel over
    // synthetic fixtures, and  refuses one that names
    // shipped content. It said so on the first run.
    const COUNTER = '/test/shop/counter';
    const { rooms } = seed({ offstage: OFFSTAGE });
    const business = StuffApi.findByTemplatePath(BUSINESS)!;
    // The shipped shape: the fixture FIRST, the room second.
    (business as unknown as { operatingLocations: string[] })
      .operatingLocations = [COUNTER, BAR];
    // A counter is Matter that happens to hold things — which is exactly
    // what made a bare `isContainer` test insufficient.
    const counter = makeStuffAtPath(() => new Fixture(), COUNTER);

    const mara = makeStuffAtPath(() => new Worker(), MARA);
    ContainmentApi.move(mara as never, rooms.get(OFFSTAGE) as never);

    atClock(2, 10); // Wednesday 10:00 — on shift
    EmploymentApi.tickRoster();
    await settle();

    expect(
      mara.getContainer()?.stuffId,
      'the worker stands in the ROOM, never inside the counter',
    ).toBe(rooms.get(BAR)!.stuffId);
    // ⭐ The assertion that would have caught the shipped bug: one
    // counter. `findByTemplatePath` THROWS on two, so this call is itself
    // the check.
    expect(
      StuffApi.findByTemplatePath(COUNTER)?.stuffId,
      'and no second counter was minted at that path',
    ).toBe((counter as unknown as Stuff).stuffId);
  });
});
