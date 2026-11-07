/**
 * The soil's water budget (water-supply D15/D16).
 *
 *  - ⭐ An inlet integrates its gate's OPENING over the gap — a turnout open
 *    six hours lets in six hours of water — and the method decides how much
 *    the soil keeps; what it cannot hold STANDS on it.
 *  - Irrigation water leaves its salt; standing water that drains away
 *    LEACHES it.
 *  - An unresolved gate holds the stamp: unresolved never reads as dry.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { ReservedMixin, Reserve } from '../../reserve';
import { SoilMixin, SOIL_MOISTURE_RESERVE_KEY, SOIL_RESERVE_THEME } from '../Soil';
import { SealableMixin } from '../../spatial/Sealable';
import { ThrottleableMixin } from '../../spatial/Throttleable';
import { StuffApi } from '../../../api/stuff';
import type { Stuff } from '../../stuff/Stuff';
import type { Soil } from '../Soil';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';
import '../../../platform/idea/WorldClockRegistry';

class Ground extends SoilMixin(ReservedMixin(Idea)) {}
class Turnout extends ThrottleableMixin(SealableMixin(Idea)) {}

const H = 3600;
let now = 100 * 86_400;

function ground(water = 50, capacity = 2000): Ground {
  return makeStuff(() => {
    const g = new Ground();
    g.setReserve(
      new Reserve(SOIL_MOISTURE_RESERVE_KEY, Quantity.of(capacity, 'L'), Quantity.of(water, 'L'), SOIL_RESERVE_THEME, null),
    );
    return g;
  });
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

describe('⭐ an inlet lets in what its gate was open for', () => {
  it('six hours of a turnout at 0.1 L/s, by furrow, keeps 65 %', async () => {
    const g = ground(50);
    const gate = makeStuff(() => new Turnout());
    vi.spyOn(StuffApi, 'singleton').mockResolvedValue(gate as never);
    g.setInlets([{ gate: '/test/thing/turnout', method: 'furrow', capacityLps: 0.1 }]);
    await g.settleInlets(now); // stamps
    now += H;
    gate.setOpening(1);
    now += 6 * H;
    gate.setOpening(0);
    now += H;
    await g.settleInlets(now);
    const water = g.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.current.rawValue();
    expect(water).toBeCloseTo(50 + 6 * H * 0.1 * 0.65, 0);
  });

  it('what the soil cannot hold stands on it', async () => {
    const g = ground(1990);
    const gate = makeStuff(() => new Turnout());
    vi.spyOn(StuffApi, 'singleton').mockResolvedValue(gate as never);
    g.setInlets([{ gate: '/test/thing/turnout', method: 'flood', capacityLps: 1 }]);
    await g.settleInlets(now);
    gate.setOpening(1);
    now += H;
    await g.settleInlets(now);
    expect(g.getPondedL()).toBeGreaterThan(1000);
  });

  it('⚠ an unresolved gate holds the stamp — the backlog waits, never reads dry', async () => {
    const g = ground(50);
    vi.spyOn(StuffApi, 'singleton').mockRejectedValue(new Error('not loaded'));
    g.setInlets([{ gate: '/test/thing/turnout', method: 'furrow', capacityLps: 0.1 }]);
    await g.settleInlets(now);
    now += H;
    await g.settleInlets(now);
    expect((g as unknown as { inletClockStamp: number }).inletClockStamp).toBe(now - H);
  });
});

describe('⭐ a ground made of parts waters its parts', () => {
  it('a tract’s turnout wets its fields, not the tract, and the salt reads sane', async () => {
    class Divided extends Ground {
      public parts: Ground[] = [];
      public override soilParts(): readonly (Stuff & Soil)[] {
        return this.parts as unknown as readonly (Stuff & Soil)[];
      }
    }
    const field = ground(50, 2000);
    vi.spyOn(field, 'soilCatchmentAreaM2').mockReturnValue(100);
    const tract = makeStuff(() => new Divided());
    tract.parts = [field];
    vi.spyOn(tract, 'soilCatchmentAreaM2').mockReturnValue(100);
    const gate = makeStuff(() => new Turnout());
    vi.spyOn(StuffApi, 'singleton').mockResolvedValue(gate as never);
    tract.setInlets([{ gate: '/test/thing/turnout', method: 'furrow', capacityLps: 0.1, salinityPpt: 0.3 }]);
    await tract.settleInlets(now);
    gate.setOpening(1);
    now += H;
    await tract.settleInlets(now);
    const water = field.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.current.rawValue();
    expect(water).toBeGreaterThan(50);
    expect(tract.getPondedL()).toBe(0);
    expect(field.soilSalinityDsm()).toBeLessThan(10);
    // …and the tract reads its field: the salt, and what stands on it.
    expect(tract.soilSalinityDsm()).toBeCloseTo(field.soilSalinityDsm(), 6);
    field.pond(500);
    expect(tract.getPondedL()).toBe(500);
  });
});

describe('⭐ salt comes in with the water and leaves with the drainage', () => {
  it('irrigation water leaves its salt; the salinity rises', async () => {
    const g = ground(500);
    const gate = makeStuff(() => new Turnout());
    vi.spyOn(StuffApi, 'singleton').mockResolvedValue(gate as never);
    g.setInlets([{ gate: '/test/thing/turnout', method: 'basin', capacityLps: 0.2, salinityPpt: 2 }]);
    await g.settleInlets(now);
    gate.setOpening(1);
    now += 2 * H;
    await g.settleInlets(now);
    expect(g.soilSalinityDsm()).toBeGreaterThan(0.5);
  });

  it('standing water that drains away leaches the salt', () => {
    // The soil walk reads the real clock (it wants the registry).
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
    let real = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => real);
    const g = ground(2000);
    g.addSoilSalt(4);
    const before = g.soilSalinityDsm();
    g.pond(3000);
    g.reconcileSoil(); // stamps
    real += ((3 * 86_400) / WorldClockApi.getScale()) * 1000;
    g.reconcileSoil();
    expect(g.soilSalinityDsm()).toBeLessThan(before);
    WorldClockApi._resetForTesting();
  });
});

describe('⭐ an overhead inlet loses water in the air (step 27)', () => {
  it('a calm cool dawn lands nearly all of it; a hot windy noon measurably less', () => {
    const g = ground();
    const dawn = g.overheadLandedShare(1, 281, 0.3);
    const noon = g.overheadLandedShare(8, 300, 0);
    expect(dawn).toBeGreaterThan(0.95);
    expect(noon).toBeLessThan(0.65);
    expect(noon).toBeLessThan(dawn);
  });

  it('cloud keeps the sun off the spray — less evaporation under an overcast', () => {
    const g = ground();
    expect(g.overheadLandedShare(0, 300, 1)).toBeGreaterThan(g.overheadLandedShare(0, 300, 0));
  });

  it('an overhead inlet credits the soil through the weather', async () => {
    const g = ground(50);
    const gate = makeStuff(() => new Turnout());
    vi.spyOn(StuffApi, 'singleton').mockResolvedValue(gate as never);
    g.setInlets([{ gate: '/test/thing/turnout', method: 'overhead', capacityLps: 0.1 }]);
    await g.settleInlets(now);
    gate.setOpening(1);
    now += H;
    gate.setOpening(0);
    await g.settleInlets(now);
    const water = g.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.current.rawValue();
    expect(water).toBeGreaterThan(50);
    expect(water).toBeLessThanOrEqual(50 + H * 0.1 * 0.85 + 1e-6);
  });
});
