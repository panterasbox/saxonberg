/**
 * Chamber — a space inside a thing with its own air (assembly W7, D15;
 * the fridge-design-pack's `Chamber` spec).
 *
 * The three things the spec asks of it:
 *  - it REGISTERS as a Container with its own air (size and carrying W9:
 *    an enclosing relation is containment — no Placing layer);
 *  - `occupants()` — the Atmospheric seam — is its contents: what is put
 *    `in` it (`move(x, loft, Placements.IN)` is region zero's own word);
 *  - ⭐ the acceptance: a Thermal good placed `in` a chamber authored at
 *    281 K restamps to 281 K, while one `on` a `Fitting` in the same room
 *    reads the room's.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Chamber from '../Chamber';
import Fitting from '../Fitting';
import Good from '../../../lib/stuff/Good';
import Place from '../../../lib/stuff/Place';
import Material from '../../../lib/material/Material';
import { ThermalMixin } from '../../../lib/thermal/Thermal';
import { Quantity } from '../../../lib/quantity';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { Template } from '../../../lib/stuff/Template';
import { WorldClockApi } from '../../../api/worldclock';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { BiomeApi } from '../../../api/biome';
import '../../idea/WorldClockRegistry';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { Placement, Placements } from '../../../lib/spatial/Placement';

class Cheese extends ThermalMixin(Good) {
  static _mixinName = 'ChamberTestCheese';
}
class TestRoom extends Place {}

/** Exposes the protected seam so the test can read it directly. */
class ProbeChamber extends Chamber {
  public probeOccupants(): readonly Stuff[] {
    return this.occupants();
  }
}

/**
 * The three shipped `Placement` members, stood up the way the put
 * controller's suite does it — `in` must ENCLOSE, or `getEnclosingScope`
 * degrades to the container and every assertion below is vacuous.
 */
async function warmPlacements(): Promise<void> {
  // The kernel's ways of sitting are resident — the test bootstrap stands
  // in for every place's onCreate (documents D7).
}

let matCounter = 0;
function cheese(stampedK: number): Cheese {
  matCounter += 1;
  const mat = makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`chamber-cheese-${matCounter}`);
    m.setSpecificHeat(Quantity.of(3000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.4, 'W/(m·K)'));
    return m;
  }, `/stuff/idea/material/_chamber/cheese-${matCounter}`) as unknown as Material;
  return makeStuff(() => {
    const c = new Cheese();
    c.setMass(Quantity.of(0.5, 'kg'));
    c.setMaterial(mat);
    c.setStampedTemperatureK(stampedK);
    c.setLastAmbientK(stampedK);
    return c;
  });
}

let pathCounter = 0;
function chamber(temperatureK: number | null): ProbeChamber {
  pathCounter += 1;
  return makeStuffAtPath(() => {
    const c = new ProbeChamber();
    if (temperatureK !== null) {
      c.setTemperature(Quantity.of(temperatureK, 'K'));
    }
    return c;
  }, `/test/chamber/loft-${pathCounter}`);
}

describe('Chamber', () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100_000);
    BiomeApi.invalidateRootBiomeCache();
    await warmPlacements();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
  });

  it('registers — a Container with its own air, and no Placing layer (W9)', () => {
    expect(() => chamber(null)).not.toThrow();
    const c = chamber(null);
    expect(MixinApi.isPlacing(c)).toBe(false);
    expect(MixinApi.isAtmospheric(c)).toBe(true);
    expect(MixinApi.isContainable(c)).toBe(true);
    expect(MixinApi.isContainer(c)).toBe(true);
    expect(MixinApi.isExitable(c)).toBe(false);
    expect(c.hasInterior()).toBe(true);
    expect(c.isFixedInPlace()).toBe(true);
  });

  it('occupants() is what is IN it — its contents — and nothing else in the room', () => {
    const room = makeStuff(() => new TestRoom());
    const loft = chamber(281);
    ContainmentApi.move(loft, room);
    const inside = cheese(281);
    const beside = cheese(295);
    ContainmentApi.move(beside, room);
    ContainmentApi.move(inside, loft, Placements.IN);

    expect(loft.probeOccupants()).toEqual([inside]);
    // ⭐ IN the chamber is the chamber's contents (W9).
    expect(inside.getContainer()).toBe(loft);
    expect(inside.getPlacement()).toBeNull();
    expect(inside.getEnclosingScope()).toBe(loft);
    expect(beside.getEnclosingScope()).toBe(room);
  });

  it("⭐ a good IN a 281 K chamber restamps to 281; one ON a fitting reads the room's", async () => {
    const room = makeStuff(() => {
      const r = new TestRoom();
      r.setTemperature(Quantity.of(295, 'K'));
      return r;
    });
    const loft = chamber(281);
    const shelf = makeStuffAtPath(() => new Fitting(), '/test/chamber/shelf');
    ContainmentApi.move(loft, room);
    ContainmentApi.move(shelf, room);

    const cold = cheese(300);
    const warm = cheese(300);
    ContainmentApi.move(cold, loft, Placements.IN);
    ContainmentApi.move(warm, shelf, Placements.ON);
    await cold.restamp();
    await warm.restamp();

    expect(cold.lastAmbientK).toBeCloseTo(281, 0);
    expect(warm.lastAmbientK).toBeCloseTo(295, 0);
    expect((await BiomeApi.resolveTemperatureFor(loft)).rawValue()).toBeCloseTo(
      281,
      0,
    );
  });

  it('a chamber that authors no air reads its room (the chain walk, outward)', async () => {
    const room = makeStuff(() => {
      const r = new TestRoom();
      r.setTemperature(Quantity.of(290, 'K'));
      return r;
    });
    const loft = chamber(null);
    ContainmentApi.move(loft, room);
    const c = cheese(300);
    ContainmentApi.move(c, loft, Placements.IN);
    await c.restamp();
    expect(c.lastAmbientK).toBeCloseTo(290, 0);
  });

  it("⭐ the seam is live: a chamber's temperature change re-stamps what is IN it", async () => {
    const room = makeStuff(() => {
      const r = new TestRoom();
      r.setTemperature(Quantity.of(295, 'K'));
      return r;
    });
    const loft = chamber(281);
    ContainmentApi.move(loft, room);
    const c = cheese(281);
    ContainmentApi.move(c, loft, Placements.IN);
    await c.restamp();
    expect(c.lastAmbientK).toBeCloseTo(281, 0);

    // `setTemperature` fans a restamp out over `occupants()` — a
    // Container's contents, which is where the cheese is (W9).
    // ⚠ No explicit restamp after the change: only the fan-out can move
    // the cached ambient (it is fire-and-forget, so let it settle).
    loft.setTemperature(Quantity.of(275, 'K'));
    await new Promise((r) => setTimeout(r, 0));
    expect(c.lastAmbientK).toBeCloseTo(275, 0);
  });
});
