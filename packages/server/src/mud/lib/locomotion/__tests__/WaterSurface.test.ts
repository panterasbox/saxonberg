/**
 * ⭐⭐ Cold water and the water's surface as a pool's floor
 * (storage-and-ice W5, D10–D12).
 *
 *  1. **The body reads the water**: in a near-freezing pool the core falls
 *     several times faster than in air of the same temperature; a summer
 *     swim chills nobody.
 *  2. **Support, not location**: a pool's floor is the water's surface; it
 *     bears nobody while open, refuses `sit`/`stand on the ground` in its
 *     own words, and whoever it is not holding up is IN the water.
 *  3. **Giving way** drops a body off the floor's slot into the water: the
 *     swim mode engaged, soaked.
 *  4. **Leaving**: a body in the water leaves by swimming.
 *  5. **The animal**: a beast will not step onto a floor that does not
 *     bear it.
 *  6. Ordinary ground is unchanged: it bears anything and standing is the
 *     free posture.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Creature } from '../../creature/Creature';
import { Actor } from '../../creature/Actor';
import Pool from '../../../platform/location/Pool';
import WaterSurface from '../../../platform/thing/WaterSurface';
import Floor from '../../../platform/thing/Floor';
import Good from '../../../platform/thing/Good';
import { Beast } from '../../../platform/agent/Beast';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { LocomotionApi } from '../../../api/locomotion';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { Quantity } from '../../quantity';
import { TemplatePaths } from '../../paths';
import type { Stuff } from '../../stuff/Stuff';
import type Exit from '../../boundary/Exit';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const SCALE = 12;
let real = 0;

type RegBody = Creature & {
  setEffectiveAmbientK(k: number): void;
  exchangeWithWater(waterK: number, dtS: number): number;
};

const core = (c: Creature): number => c.getVitalSign('coreTemperature').rawValue();

function advance(c: Creature, gameSec: number, chunkSec = 300): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    real += (s / SCALE) * 1000;
    c.getVitalSign('coreTemperature');
    remaining -= s;
  }
}

function body(kg = 70): RegBody {
  return makeStuff(() => {
    const c = new Creature() as RegBody;
    c.setMass(Quantity.of(kg, 'kg'));
    return c;
  }) as RegBody;
}

/** An acting body (Mobile, Slottable) for the support tests. */
class Walker extends Actor {}
function walker(kg = 70): Walker {
  return makeStuff(() => {
    const a = new Walker();
    a.setMass(Quantity.of(kg, 'kg'));
    return a;
  });
}

async function pool(): Promise<{ pool: Pool; floor: WaterSurface }> {
  const p = makeStuff(() => new Pool());
  await p.ensureFloor();
  return { pool: p, floor: p.getFloor() as unknown as WaterSurface };
}

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  real = 100_000;
  WorldClockApi._setNowProviderForTesting(() => real);
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    if (path === TemplatePaths.waterSurface) return makeStuff(() => new WaterSurface());
    if (path === TemplatePaths.defaultFloor) return makeStuff(() => new Floor());
    throw new Error(`unexpected clone ${path}`);
  }) as unknown as typeof StuffApi.clone);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('the body reads the water (D10a)', () => {
  it('⭐ near-freezing water cools a body several times faster than air of the same temperature', () => {
    const inAir = body();
    const inWater = body();
    core(inAir);
    core(inWater);
    inAir.setEffectiveAmbientK(274);
    inWater.setEffectiveAmbientK(inWater.exchangeWithWater(274, 0));
    advance(inAir, 1800);
    advance(inWater, 1800);
    const airDrop = 310 - core(inAir);
    const waterDrop = 310 - core(inWater);
    expect(waterDrop).toBeGreaterThan(0.1);
    // Measured 2.4× over half an hour (the body's regulation buffers both);
    // "several times" — and a summer swim (below) costs nothing at all.
    expect(waterDrop).toBeGreaterThan(2 * Math.max(airDrop, 0.01));
  });

  it('a summer swim chills nobody', () => {
    const swimmer = body();
    core(swimmer);
    swimmer.setEffectiveAmbientK(swimmer.exchangeWithWater(292, 0));
    advance(swimmer, 1800);
    expect(core(swimmer)).toBeCloseTo(310, 0);
    expect(swimmer.exchangeWithWater(300, 0)).toBe(300);
  });
});

describe('the water surface is a pool\'s floor (D12)', () => {
  it('⭐ a pool mints the water surface as its floor; it bears nobody and says so', async () => {
    const { floor } = await pool();
    expect(floor).toBeInstanceOf(WaterSurface);
    expect(floor.supportIsSlotted()).toBe(true);
    expect(floor.bears(70)).toBe(false);
    const b = body();
    expect(floor.canOccupy(b as never, 'ground:1')).toBe(false);
    expect(floor.canOccupyReason(b as never, 'ground:1')).toBe('There is nothing here to stand on but water.');
    expect(floor.openWaterAreaM2()).toBeGreaterThan(0);
  });

  it('⭐ whoever the floor is not holding up is IN the water, at the water\'s temperature', async () => {
    const { pool: p, floor } = await pool();
    const b = walker();
    ContainmentApi.move(b as unknown as Stuff & never, p as unknown as Stuff & never);
    // A pool citing no water reads its own air; a cited reach's draw wins.
    expect(p.mediumFor(b as unknown as Stuff)).toMatchObject({
      tag: 'water',
      immersed: true,
      atSurface: true,
      temperatureK: p.waterTemperatureK(),
    });
    // Held up (a frozen surface bears you): not in the water.
    vi.spyOn(floor, 'bears').mockReturnValue(true);
    floor.occupy(b as never, 'ground:1');
    expect(floor.supports(b as unknown as Stuff)).toBe(true);
    expect(p.mediumFor(b as unknown as Stuff).immersed).toBe(false);
  });

  it('⭐ giving way drops a body off the slot into the water — swimming, soaked', async () => {
    await LocomotionApi.loadMode('swim').catch(() => null);
    const { pool: p, floor } = await pool();
    const b = walker();
    ContainmentApi.move(b as unknown as Stuff & never, p as unknown as Stuff & never);
    const bearing = vi.spyOn(floor, 'bears').mockReturnValue(true);
    floor.occupy(b as never, 'ground:1');
    bearing.mockReturnValue(false);
    floor.reconcileSupport();
    expect(floor.supports(b as unknown as Stuff)).toBe(false);
    expect(b.getWetness()).toBeGreaterThan(0.9);
    expect(p.mediumFor(b as unknown as Stuff).immersed).toBe(true);
  });

  it('⭐ the SURFACE decides bare `swim` — its refusals returned in its words', async () => {
    await LocomotionApi.loadMode('swim').catch(() => null);
    const { pool: p, floor } = await pool();
    const b = walker();
    ContainmentApi.move(b as unknown as Stuff & never, p as unknown as Stuff & never);
    expect(floor.goIn(b as unknown as Stuff)).toMatchObject({ ok: false, reason: 'already-in-water' });
    const bearing = vi.spyOn(floor, 'bears').mockReturnValue(true);
    floor.occupy(b as never, 'ground:1');
    bearing.mockReturnValue(false);
    expect(floor.goIn(b as unknown as Stuff)).toEqual({ ok: true });
    expect(floor.supports(b as unknown as Stuff)).toBe(false);
  });

  it('⭐ a body in the water may leave only by swimming; one held up walks off', async () => {
    const { pool: p, floor } = await pool();
    const b = walker();
    ContainmentApi.move(b as unknown as Stuff & never, p as unknown as Stuff & never);
    const via = {} as Exit;
    expect(p.canExit(b as never, via)).toEqual({ ok: false, reason: 'You are in the water; swim for it.' });
    vi.spyOn(floor, 'bears').mockReturnValue(true);
    floor.occupy(b as never, 'ground:1');
    expect(p.canExit(b as never, via)).toEqual({ ok: true });
  });

  it('ordinary ground is unchanged: it bears anything and standing is the free posture', () => {
    const ground = makeStuff(() => new Floor());
    expect(ground.bears(10_000)).toBe(true);
    expect(ground.supportIsSlotted()).toBe(false);
    expect(ground.openWaterAreaM2()).toBe(0);
    expect(ground.giveWay(body() as unknown as Stuff)).toBe(false);
  });
});

describe('the animal will not go out on it (Beast.beforeTraverse)', () => {
  it('⭐ a beast refuses an exit whose destination floor does not bear it', async () => {
    const { pool: p } = await pool();
    const horse = makeStuff(() => new Beast());
    const via = { getDestination: () => p } as unknown as Exit;
    const said = horse.beforeTraverse(via);
    expect(said.ok).toBe(false);
    expect(said.gate).toBe('blocked');
    const solid = { getDestination: () => ({ getFloor: () => makeStuff(() => new Floor()) }) } as unknown as Exit;
    expect(horse.beforeTraverse(solid).ok).toBe(true);
  });
});

describe('⭐ what sinks — a water you can stand in keeps it (the column\'s bed is the water pack\'s)', () => {
  class Lump extends Good {}

  function lump(densityKgM3: number): Lump {
    const l = makeStuff(() => new Lump());
    l.setMass(Quantity.of(5, 'kg'));
    vi.spyOn(l, 'getMaterial').mockReturnValue({ getDensity: () => Quantity.of(densityKgM3, 'kg/m³') } as never);
    return l;
  }
  const settle = async (): Promise<void> => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  };

  it('iron sinks and cork does not; a pool with nowhere below keeps both', async () => {
    const { pool: p } = await pool();
    const iron = lump(7800);
    const cork = lump(240);
    expect(p.sinks(iron as unknown as Stuff)).toBe(true);
    expect(p.sinks(cork as unknown as Stuff)).toBe(false);
    ContainmentApi.move(iron as never, p as never);
    await settle();
    expect(iron.getContainer()).toBe(p);
    expect(await p.sink(iron as unknown as Stuff)).toBe(false);
  });
});
