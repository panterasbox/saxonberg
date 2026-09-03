/**
 * Thermal.depositHeat — the heat-DELIVERY primitive the sync Thermal
 * model lacked, now a method ON the mixin (the B2 exemplar of the Api
 * OO sweep: the caller holds the object, so the verb lives on it).
 * Depositing `Q` joules raises temperature by exactly `ΔT = Q / C`
 * (heat capacity `C = mass × specificHeat`); thermal inertia gates the
 * rise (the same joules barely move a high-`C` host), which is what
 * makes ignition a derivable energy balance. The read stays SYNC.
 * Driven in the idle (no-world-clock) mode so the deposit is the only
 * temperature change.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import Thing from '../../stuff/Thing';
import Material from '../../material/Material';
import { ThermalMixin } from '../Thermal';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class ThermalThing extends ThermalMixin(Thing) {
  static _mixinName = 'ThermalThing';
}

let matCounter = 0;
function material(specificHeat: number): Material {
  matCounter += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`test-mat-${matCounter}`);
    m.setSpecificHeat(Quantity.of(specificHeat, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.6, 'W/(m·K)'));
    return m;
  }, `/stuff/idea/material/_test/thermal-mixin-${matCounter}`) as unknown as Material;
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

describe('Thermal.depositHeat', () => {
  beforeEach(() => installV1QuantityMarshallers());

  it('raises temperature by exactly ΔT = Q / (mass × specificHeat)', () => {
    // C = 1 kg × 1000 J/(kg·K) = 1000 J/K. Deposit 10000 J → ΔT = 10 K.
    const t = thing(1, 1000, 300);
    t.depositHeat(10000);
    expect(t.getTemperature().rawValue()).toBeCloseTo(310, 6);
  });

  it('thermal inertia gates the rise — a heavy host barely moves', () => {
    // C = 1000 kg × 1000 = 1e6 J/K. The same 10000 J → ΔT = 0.01 K.
    const heavy = thing(1000, 1000, 300);
    heavy.depositHeat(10000);
    expect(heavy.getTemperature().rawValue()).toBeCloseTo(300.01, 4);
  });

  it('a small deposit shoves a tiny, low-C host hot (the match)', () => {
    // C = 0.001 kg × 1000 = 1 J/K. 100 J → ΔT = 100 K.
    const shaving = thing(0.001, 1000, 300);
    shaving.depositHeat(100);
    expect(shaving.getTemperature().rawValue()).toBeCloseTo(400, 6);
  });

  it('a negative deposit removes heat (a douse)', () => {
    // C = 1000 J/K. -50000 J → ΔT = -50 K. 300 → 250.
    const t = thing(1, 1000, 300);
    t.depositHeat(-50000);
    expect(t.getTemperature().rawValue()).toBeCloseTo(250, 6);
  });

  it('floors a large heat removal at absolute zero', () => {
    // C = 1000 J/K. -400000 J → ΔT = -400 K → 300 - 400 clamps to 0.
    const t = thing(1, 1000, 300);
    t.depositHeat(-400000);
    expect(t.getTemperature().rawValue()).toBe(0);
  });

  it('is a no-op on a host with no heat capacity (massless)', () => {
    const massless = thing(0, 1000, 300);
    massless.depositHeat(10000);
    // No C → re-equilibrates to ambient; the deposit changes nothing.
    expect(massless.getTemperature().rawValue()).toBe(300);
  });

  it('rejects a non-finite deposit', () => {
    const t = thing(1, 1000, 300);
    expect(() => t.depositHeat(Number.NaN)).toThrow(RangeError);
  });
});
