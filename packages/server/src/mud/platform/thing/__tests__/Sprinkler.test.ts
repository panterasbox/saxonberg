/**
 * ⭐⭐ The sprinkler — rain in a circle (water supply, the review).
 *
 *  - Its flow and its throw are the tap's HEAD: an orifice, `Cd·A·√(2gh)`.
 *  - It draws on the tap's supply, and lets its water fall over the circle
 *    it throws: the beds beside it by the sky each catches, the ground the
 *    rest — never a pot, which catches no rain.
 *  - Two grounds asking one sprinkler count its water once.
 *  - The hose couples a tap and a sprinkler with `tie`.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Sprinkler from '../Sprinkler';
import WaterHose from '../WaterHose';
import WaterFixture from '../WaterFixture';
import { Idea } from '../../../lib/stuff/Idea';
import { ReservedMixin, Reserve } from '../../../lib/reserve/Reserved';
import { SoilMixin, SOIL_MOISTURE_RESERVE_KEY, SOIL_RESERVE_THEME } from '../../../lib/husbandry/Soil';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../../lib/quantity';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Throttleable } from '../../../lib/spatial/Throttleable';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import '../../idea/WorldClockRegistry';

const H = 3600;
let now = 100 * 86_400;

/** A garden: a place that is ground, 100 m² of sky. */
class Garden extends SoilMixin(ReservedMixin(ContainerMixin(Idea))) {
  public override soilCatchmentAreaM2(): number {
    return 100;
  }
}
/** A bed standing in it: ground that catches 4 m² of sky. */
class Bed extends SoilMixin(ReservedMixin(ContainableMixin(Idea))) {
  public override soilCatchmentAreaM2(): number {
    return 4;
  }
}
/** A pot standing in it: catches no sky at all. */
class Pot extends SoilMixin(ReservedMixin(ContainableMixin(Idea))) {}

function moist<T extends Stuff & { setReserve(r: Reserve): void }>(make: () => T, water = 0, capacity = 5000): T {
  return makeStuff(() => {
    const g = make();
    g.setReserve(
      new Reserve(SOIL_MOISTURE_RESERVE_KEY, Quantity.of(capacity, 'L'), Quantity.of(water, 'L'), SOIL_RESERVE_THEME, null),
    );
    return g;
  });
}
const water = (s: Stuff & { getReserve(k: string): Reserve | undefined }): number =>
  s.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.current.rawValue();

/** A tap on a main with `headM` of head, its draws counted. */
function tapAt(headM: number): { tap: WaterFixture; drawn: () => number } {
  const tap = makeStuff(() => new WaterFixture());
  let drawn = 0;
  vi.spyOn(tap, 'settleBulk').mockResolvedValue(undefined);
  vi.spyOn(tap, 'pressureNow').mockReturnValue({ headM, share: 1, availableL: Infinity });
  vi.spyOn(tap, 'debitBulk').mockImplementation((_a, l) => {
    drawn += l;
  });
  return { tap, drawn: () => drawn };
}

/** Every open second lands — no weather in a test. */
function calm(g: Garden): void {
  vi.spyOn(g, 'landedOpenSeconds').mockImplementation(async (spray: Stuff & Throttleable, a: number, b: number) =>
    spray.openingTrajectory(a, b).integrate((v) => v, 4),
  );
}

async function rigged(headM = 20): Promise<{ garden: Garden; sprinkler: Sprinkler; drawn: () => number }> {
  const garden = moist(() => new Garden());
  calm(garden);
  const sprinkler = makeStuff(() => new Sprinkler());
  ContainmentApi.move(sprinkler as never, garden as never);
  const hose = makeStuff(() => new WaterHose());
  const { tap, drawn } = tapAt(headM);
  await hose.tieTo(garden as unknown as Stuff, tap, null);
  await hose.tieTo(garden as unknown as Stuff, sprinkler, null);
  return { garden, sprinkler, drawn };
}

beforeEach(() => {
  StuffApi.clearAll();
  now = 100 * 86_400;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(now, 's'));
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐ flow and throw are the head', () => {
  it('a six-millimetre rose on 20 m of main throws ~0.35 L/s eight metres round; on a 3 m tank, a dribble', () => {
    const s = makeStuff(() => new Sprinkler());
    expect(s.flowLps(20)).toBeCloseTo(1000 * 0.62 * Math.PI * 0.003 ** 2 * Math.sqrt(2 * 9.81 * 20), 6);
    expect(s.throwM(20)).toBe(8);
    expect(s.throwM(3)).toBe(1.5);
    expect(s.flowLps(3)).toBeLessThan(s.flowLps(20) / 2);
    expect(s.flowLps(0)).toBe(0);
  });
});

describe('⭐⭐ rain in a circle', () => {
  it('an hour open waters the bed beside it by its sky and the ground the rest — and draws on the tap', async () => {
    const { garden, sprinkler, drawn } = await rigged(20);
    const bed = moist(() => new Bed());
    const pot = moist(() => new Pot());
    ContainmentApi.move(bed as never, garden as never);
    ContainmentApi.move(pot as never, garden as never);
    await sprinkler.settleIrrigation(now); // stamps
    sprinkler.setOpening(1);
    now += H;
    await sprinkler.settleIrrigation(now);
    const thrown = H * sprinkler.flowLps(20);
    expect(drawn()).toBeCloseTo(thrown, 3);
    // The throw (8 m round, 201 m²) is wider than the garden: it covers 100 m².
    const depth = thrown / 100;
    expect(water(bed)).toBeCloseTo(depth * 4, 3);
    expect(water(pot)).toBe(0); // a pot catches no rain, and no sprinkler
    expect(water(garden)).toBeCloseTo((thrown - depth * 4) * 0.85, 3);
  });

  it('a shut valve, or no hose, lets nothing fall', async () => {
    const { garden, sprinkler } = await rigged(20);
    await sprinkler.settleIrrigation(now);
    now += H;
    await sprinkler.settleIrrigation(now);
    expect(water(garden)).toBe(0);
    const loose = makeStuff(() => new Sprinkler());
    ContainmentApi.move(loose as never, garden as never);
    loose.setOpening(1);
    await loose.settleIrrigation(now);
    now += H;
    await loose.settleIrrigation(now);
    expect(water(garden)).toBe(0);
  });

  it('⭐ the ground and a bed both asking count its water ONCE', async () => {
    const { garden, sprinkler, drawn } = await rigged(20);
    const bed = moist(() => new Bed());
    ContainmentApi.move(bed as never, garden as never);
    await garden.settleInlets(now);
    sprinkler.setOpening(1);
    now += H;
    await Promise.all([garden.settleInlets(now), bed.settleInlets(now)]);
    expect(drawn()).toBeCloseTo(H * sprinkler.flowLps(20), 3);
  });
});

describe('⭐ the tap asks too', () => {
  it('a settle at the tap brings the sprinkler on its hose current — the tank never reads as if it had not run', async () => {
    const tap = makeStuff(() => new WaterFixture());
    vi.spyOn(tap, 'ensureSupply').mockImplementation(async function (this: WaterFixture) {
      await (this as unknown as { settleHoses(): Promise<void> }).settleHoses();
    });
    const sprinkler = makeStuff(() => new Sprinkler());
    const settle = vi.spyOn(sprinkler, 'settleIrrigation').mockResolvedValue(undefined);
    const hose = makeStuff(() => new WaterHose());
    const by = makeStuff(() => new Idea());
    await hose.tieTo(by, tap, null);
    await hose.tieTo(by, sprinkler, null);
    await tap.ensureSupply();
    expect(settle).toHaveBeenCalledWith(now);
    await hose.untieBy(by);
    settle.mockClear();
    await tap.ensureSupply();
    expect(settle).not.toHaveBeenCalled();
  });
});

describe('⭐ the hose couples a tap and a sprinkler', () => {
  it('screws onto each, then lies down where you stand; unscrewed, it lets both go', async () => {
    const garden = moist(() => new Garden());
    const hand = makeStuff(() => new (ContainerMixin(ContainableMixin(Idea)))());
    ContainmentApi.move(hand as never, garden as never);
    const hose = makeStuff(() => new WaterHose());
    ContainmentApi.move(hose as never, hand as never);
    const { tap } = tapAt(20);
    const sprinkler = makeStuff(() => new Sprinkler());
    expect((await hose.tieTo(hand as unknown as Stuff, tap, null)).ok).toBe(true);
    expect(hose.getContainer()).toBe(hand);
    expect((await hose.tieTo(hand as unknown as Stuff, sprinkler, null)).ok).toBe(true);
    expect(sprinkler.feed()).toBe(tap);
    expect(hose.getContainer()).toBe(garden); // laid down
    expect((await hose.untieBy(hand as unknown as Stuff)).ok).toBe(true);
    expect(sprinkler.feed()).toBeNull();
  });

  it('refuses a natural source and anything that is not a tap or a sprinkler', async () => {
    const hose = makeStuff(() => new WaterHose());
    const pond = makeStuff(() => new WaterFixture());
    pond.setNatural(true);
    const by = makeStuff(() => new Idea());
    const out = await hose.tieTo(by, pond, null);
    expect(out.ok).toBe(false);
    expect((await hose.tieTo(by, makeStuff(() => new Idea()), null)).ok).toBe(false);
  });
});
