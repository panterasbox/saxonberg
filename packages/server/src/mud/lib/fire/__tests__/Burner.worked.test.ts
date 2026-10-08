/**
 * A WORKED flame — ⭐⭐ D14's kernel half, and the honest answer the Fire
 * school inherits instead of inventing one.
 *
 * A conjured fire has no matter in it. The consequences all follow from
 * that one fact rather than from a magic exemption:
 *
 *  - **No soot**, because nothing is incompletely burning — so it is
 *    DIM, and a player can tell a worked fire from a real one by
 *    looking. (The glowlight already proves the decoupling on the LIGHT
 *    side: *"Light, not heat — the sim decouples them."* This is the
 *    heat side of the same carve.)
 *  - **Nothing to stoke** and nothing to run out of.
 *  - ⭐ **It still spends the room's air**, because conservation is not
 *    something magic is exempt from — which is what makes a worked fire
 *    in a sealed cellar exactly as dangerous as a real one.
 *
 * ⚠ The class here is test-local on purpose (the `FireController` tests'
 * author-your-own-class precedent): this file is the KERNEL's half of
 * D14. `arcane-library`'s `WorkedFlame` is the shipped implementer and
 * the only reason `fuelSource()` is a hook at all.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import CartesianLocation from '../../location/CartesianLocation';
import Good from '../../stuff/Good';
import { ThermalMixin } from '../../thermal/Thermal';
import { LightSourceMixin } from '../../perception/LightSource';
import { BurnerMixin } from '../Burner';
import type { FuelSource } from '../Burner';
import { BiomeApi } from '../../../api/biome';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { chargeWood } from './burner-fuel';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';
import type { Burner } from '../Burner';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const CO2 = '/stuff/idea/material/gas/carbon-dioxide';
const SMOKE = '/stuff/idea/material/gas/smoke';

const FlameBase = BurnerMixin(LightSourceMixin(ThermalMixin(Good)));

/** A fire with no matter in it. */
class TestWorkedFlame extends FlameBase {
  static _mixinName = 'TestWorkedFlame';
  public override lit = true;
  public override burnTemperatureK = 900;
  public override maxBurnPowerW = 2000;
  protected override fuelSource(): FuelSource {
    return { kind: 'worked' };
  }
}

/** The same chain with a real bed, as the control. */
class TestRealFlame extends FlameBase {
  static _mixinName = 'TestRealFlame';
  public override lit = true;
  public override burnTemperatureK = 900;
  public override maxBurnPowerW = 2000;
}

function amountOf(r: CartesianLocation, path: string): number {
  const hit = BiomeApi.resolveAtmosphereContentsFor(
    r as unknown as Stuff & Container,
  ).find((c) => c.type === path);
  return hit?.amount ?? 0;
}

describe('a worked flame', () => {
  let zone: CartesianZone;
  let cell: CartesianLocation;

  beforeEach(() => {
    installV1QuantityMarshallers();
    zone = makeStuff(() => new CartesianZone());
    cell = makeStuff(() => new CartesianLocation());
    cell.setExtent(2); // a sealed 8 m³ test cell
    zone.addLocation(cell, 0, 0, 0);
  });
  afterEach(() => StuffApi.clearAll());

  function worked(): TestWorkedFlame {
    const f = makeStuff(() => {
      const x = new TestWorkedFlame();
      x.setEmittedFlux(100);
      return x;
    }) as TestWorkedFlame;
    ContainmentApi.move(f as never, cell as never);
    return f;
  }

  function real(): TestRealFlame {
    const f = makeStuff(() => {
      const x = new TestRealFlame();
      x.setEmittedFlux(100);
      return x;
    }) as TestRealFlame;
    ContainmentApi.move(f as never, cell as never);
    chargeWood(f as unknown as Stuff & Burner, 20);
    return f;
  }

  it('⭐ has no fuel to run out of, and nothing to stoke', () => {
    const f = worked();
    expect(f.fuelRemaining()).toBe(Infinity);
    const outcome = f.stoke(makeStuff(() => new Good()) as unknown as Stuff);
    expect(outcome).toEqual({ ok: false, reason: 'no-bed' });
  });

  it('⭐⭐ makes NO smoke, and a real flame in the same cell does', () => {
    const f = worked();
    for (let i = 0; i < 40; i++) f.exhaustTick(30);
    expect(amountOf(cell, SMOKE)).toBe(0);
    expect(amountOf(cell, CO2)).toBeGreaterThan(0);

    // The control: a real fire in a shut cell goes incomplete and soots.
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    zone = makeStuff(() => new CartesianZone());
    cell = makeStuff(() => new CartesianLocation());
    cell.setExtent(2);
    zone.addLocation(cell, 0, 0, 0);
    const r = real();
    for (let i = 0; i < 400; i++) r.exhaustTick(30);
    expect(amountOf(cell, SMOKE)).toBeGreaterThan(0);
  });

  it('⭐⭐ is DIM — a player can tell a worked fire from a real one by looking', () => {
    const f = worked();
    const workedFlux = f.getEmittedFlux().rawValue();
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    zone = makeStuff(() => new CartesianZone());
    cell = makeStuff(() => new CartesianLocation());
    cell.setExtent(2);
    zone.addLocation(cell, 0, 0, 0);
    const r = real();
    const realFlux = r.getEmittedFlux().rawValue();

    expect(workedFlux).toBeGreaterThan(0);
    expect(workedFlux).toBeLessThan(realFlux / 2);
  });

  it('⭐ still spends the room’s air — conservation is not optional', () => {
    const f = worked();
    const before = BiomeApi.airShareOf(
      BiomeApi.resolveAtmosphereContentsFor(cell as unknown as Stuff & Container),
    );
    for (let i = 0; i < 60; i++) f.exhaustTick(30);
    const after = BiomeApi.airShareOf(
      BiomeApi.resolveAtmosphereContentsFor(cell as unknown as Stuff & Container),
    );
    expect(before).toBe(1);
    expect(after).toBeLessThan(1);
  });

  it('its temperature is the vessel ceiling — no fuel to cap it', () => {
    const f = worked();
    // Complete in fresh air, so the starvation factor is 1 and the
    // ceiling is what is left. ⚠ A real flame is capped by its FUEL
    // instead, which is the whole asymmetry: a worked fire is whatever
    // the working says, a real one is whatever the wood allows.
    expect(f.getHeldTemperatureK()).toBeCloseTo(900, 0);
  });
});
