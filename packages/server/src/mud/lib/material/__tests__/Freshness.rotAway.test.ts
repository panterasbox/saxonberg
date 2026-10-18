/**
 * Rotten food rots AWAY (cleanliness, review): loose in a room for
 * `freshness.rotAwayAfterS` past going rotten, it is gone — and a midden
 * takes rotten food as refuse whatever it was.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Provision from '../../../platform/thing/Provision';
import Midden from '../../../platform/thing/Midden';
import CartesianLocation from '../../location/CartesianLocation';
import Material from '../Material';
import { WorldClockApi } from '../../../api/worldclock';
import { ScheduleApi } from '../../../api/schedule';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

const DAY = 24 * 3600;
const BASE = 1_000_000;
let now = BASE;
const setNow = (s: number): void => {
  now = BASE + s;
};

let seq = 0;
function meat(): Provision {
  seq += 1;
  const mat = makeStuffAtPath(() => {
    const m = new Material();
    m.setName('rot-test-meat');
    m.setSpecificHeat(Quantity.of(3200, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.5, 'W/(m·K)'));
    m.setSpoilActivationEnergy(Quantity.of(80_000, 'J/mol'));
    m.setWaterActivity(0.98);
    return m;
  }, `/stuff/idea/material/_test/rot-meat-${seq}`) as unknown as Material;
  return makeStuff(() => {
    const p = new Provision();
    p.setMass(Quantity.of(1, 'kg'));
    p.setMaterial(mat);
    p.setStampedTemperatureK(293);
    p.setLastAmbientK(293);
    return p;
  });
}

describe('⭐ rotten food rots away, and a midden takes it', () => {
  let scheduled: Array<() => void> = [];
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    scheduled = [];
    vi.spyOn(ScheduleApi, 'schedule').mockImplementation(((_ms: number, fn: () => void) => {
      scheduled.push(fn);
      return {} as never;
    }) as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
  });

  it('loose in a room, three days past rotten, it is gone', async () => {
    const room = makeStuff(() => new CartesianLocation());
    const food = meat();
    ContainmentApi.move(food as never, room as never);
    food.getMicrobialLoad(); // seed the clock
    food.setMicrobialLoad(0.95);
    setNow(3600);
    expect(food.getFreshnessBand()).toBe('rotten'); // stamps rottenSince
    expect(scheduled).toHaveLength(0);
    setNow(3600 + 3 * DAY + 60);
    food.getFreshnessBand();
    expect(scheduled).toHaveLength(1);
    scheduled[0]!();
    await new Promise((r) => setTimeout(r, 0));
    expect(food.isDestroyed()).toBe(true);
  });

  it('a midden takes rotten food as refuse', async () => {
    const midden = makeStuff(() => new Midden());
    (midden as unknown as { interiorBulk: boolean }).interiorBulk = true;
    midden.setInteriorCapacity(Quantity.of(100, 'L'));
    const food = meat();
    food.getMicrobialLoad();
    food.setMicrobialLoad(0.95);
    setNow(3600);
    const out = await midden.takeRefuse(food);
    expect(out.ok).toBe(true);
    const fresh = meat();
    expect((await midden.takeRefuse(fresh)).ok).toBe(false);
  });
});
