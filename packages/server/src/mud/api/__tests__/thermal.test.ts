/**
 * ThermalApi.depositHeat — the heat-DELIVERY primitive the sync Thermal model
 * lacked. Depositing `Q` joules raises temperature by exactly `ΔT = Q / C`
 * (heat capacity `C = mass × specificHeat`); thermal inertia gates the rise
 * (the same joules barely move a high-`C` host), which is what makes ignition
 * a derivable energy balance. The read stays SYNC. Driven in the idle
 * (no-world-clock) mode so the deposit is the only temperature change.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Thing from '../../lib/stuff/Thing';
import Location from '../../lib/stuff/Location';
import Material from '../../lib/material/Material';
import Forge from '../../obj/Forge';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { ThermalApi } from '../thermal';
import { FireApi } from '../fire';
import { ThermalLogic } from '../../obj/api/ThermalLogic';
import { StuffApi } from '../stuff';
import { ContainmentApi } from '../containment';
import { SecurityError } from '../../lib/security/errors';
import { Reserve } from '../../lib/reserve';
import { Quantity } from '../../lib/quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class ThermalThing extends ThermalMixin(Thing) {
  static _mixinName = 'ThermalThing';
}
class ReachRoom extends Location {}

let matCounter = 0;
function material(specificHeat: number): Material {
  matCounter += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`test-mat-${matCounter}`);
    m.setSpecificHeat(Quantity.of(specificHeat, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.6, 'W/(m·K)'));
    return m;
  }, `/lib/material/_test/thermal-api-${matCounter}`) as unknown as Material;
}

function thing(massKg: number, specificHeat: number, stampedK = 300): ThermalThing {
  const mat = material(specificHeat);
  return makeStuff(() => {
    const t = new ThermalThing();
    t.setMass(Quantity.of(massKg, 'kg'));
    t.setMaterial(mat);
    t.setStampedTemperatureK(stampedK);
    t.setLastAmbientK(295);
    return t;
  });
}

describe('ThermalApi.depositHeat', () => {
  beforeEach(() => installV1QuantityMarshallers());

  it('raises temperature by exactly ΔT = Q / (mass × specificHeat)', () => {
    // C = 1 kg × 1000 J/(kg·K) = 1000 J/K. Deposit 10000 J → ΔT = 10 K.
    const t = thing(1, 1000, 300);
    ThermalApi.depositHeat(t, 10000);
    expect(t.getTemperature().rawValue()).toBeCloseTo(310, 6);
  });

  it('thermal inertia gates the rise — a heavy host barely moves', () => {
    // C = 1000 kg × 1000 = 1e6 J/K. The same 10000 J → ΔT = 0.01 K.
    const heavy = thing(1000, 1000, 300);
    ThermalApi.depositHeat(heavy, 10000);
    expect(heavy.getTemperature().rawValue()).toBeCloseTo(300.01, 4);
  });

  it('a small deposit shoves a tiny, low-C host hot (the match)', () => {
    // C = 0.001 kg × 1000 = 1 J/K. 100 J → ΔT = 100 K.
    const shaving = thing(0.001, 1000, 300);
    ThermalApi.depositHeat(shaving, 100);
    expect(shaving.getTemperature().rawValue()).toBeCloseTo(400, 6);
  });

  it('a negative deposit removes heat (a douse)', () => {
    // C = 1000 J/K. -50000 J → ΔT = -50 K. 300 → 250.
    const t = thing(1, 1000, 300);
    ThermalApi.depositHeat(t, -50000);
    expect(t.getTemperature().rawValue()).toBeCloseTo(250, 6);
  });

  it('floors a large heat removal at absolute zero', () => {
    // C = 1000 J/K. -400000 J → ΔT = -400 K → 300 - 400 clamps to 0.
    const t = thing(1, 1000, 300);
    ThermalApi.depositHeat(t, -400000);
    expect(t.getTemperature().rawValue()).toBe(0);
  });

  it('is a no-op on a host with no heat capacity (massless)', () => {
    const massless = thing(0, 1000, 300);
    ThermalApi.depositHeat(massless, 10000);
    // No C → re-equilibrates to ambient; the deposit changes nothing.
    expect(massless.getTemperature().rawValue()).toBe(300);
  });

  it('is a no-op (no throw) on a non-Thermal target', () => {
    const plain = makeStuff(() => new Thing());
    expect(() => ThermalApi.depositHeat(plain, 10000)).not.toThrow();
  });

  it('gates the logic method against a non-ThermalApi caller', () => {
    // Prime the singleton via the Api, then reach the logic directly.
    ThermalApi.depositHeat(thing(1, 1000), 0);
    const logic = StuffApi.findByTemplatePath<ThermalLogic>('/obj/api/thermal');
    expect(logic).toBeDefined();
    expect(() => logic!.depositHeat(thing(1, 1000), 10000)).toThrow(
      SecurityError,
    );
  });
});

describe('ThermalApi.reachableHeatFor — the inert crafting seam', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  function forge(heldK: number): Forge {
    return makeStuff(() => {
      const f = new Forge();
      f.setBurnTemperatureK(heldK);
      f.setReserve(
        new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null),
      );
      return f;
    });
  }

  it('returns the hottest lit furnace reachable from a position', () => {
    const room = makeStuff(() => new ReachRoom());
    const cool = forge(900);
    const hot = forge(1500);
    const maker = makeStuff(() => new Thing());
    ContainmentApi.move(cool, room);
    ContainmentApi.move(hot, room);
    ContainmentApi.move(maker, room);
    expect(ThermalApi.reachableHeatFor(maker)).toBe(1500);
  });

  it('returns 0 when no lit furnace is in reach', () => {
    const room = makeStuff(() => new ReachRoom());
    const maker = makeStuff(() => new Thing());
    ContainmentApi.move(maker, room);
    expect(ThermalApi.reachableHeatFor(maker)).toBe(0);

    // An unlit forge does not count.
    const f = forge(1500);
    FireApi.douse(f);
    ContainmentApi.move(f, room);
    expect(ThermalApi.reachableHeatFor(maker)).toBe(0);
  });
});
