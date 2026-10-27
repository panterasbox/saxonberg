/**
 * ⭐⭐ A fire has POWER, not just a temperature (sugar D2, W1a).
 *
 * Before this, a pot on a fire drifted toward the flame's held temperature
 * over its own `τ = R·C` — so a 30 L copper warmed as fast as its walls
 * allowed, at whatever wattage that implied, and the boil plateau spent
 * the overshoot of ONE read: an unread pot boiled off one capacity's worth
 * per gap, a watched pot boiled faster for being watched.
 *
 * Now the slower of two couplings limits — the body's walls, or the fire's
 * delivered watts (`burnPowerW × heatTransferFraction`) — and at the boil
 * the fire's power at the boil is spent on steam for the seconds spent
 * there.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Burner } from '../../fire/Burner';
import type { Stuff } from '../../stuff/Stuff';
import { chargeHot } from '../../fire/__tests__/burner-fuel';
import Good from '../../stuff/Good';
import Place from '../../stuff/Place';
import Material from '../../material/Material';
import { BulkableMixin } from '../../bulk/Bulkable';
import { ThermalMixin, THERMAL_DEFAULTS } from '../Thermal';
import { ReservedMixin } from '../../reserve';
import { LightSourceMixin } from '../../perception/LightSource';
import { PlacingMixin } from '../../spatial/Placing';
import { BurnerMixin } from '../../fire/Burner';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestHearth extends BurnerMixin(
  LightSourceMixin(ReservedMixin(PlacingMixin(ThermalMixin(Good)))),
) {
  static _mixinName = 'TestHearthPower';
}
/** An open copper — a Flask without the vacuum. */
class Pot extends ThermalMixin(BulkableMixin(Good)) {
  static _mixinName = 'TestPotPower';
}
class TestRoom extends Place {}

const SCALE = 12;
let real = 0;
const tick = (gameS: number): void => {
  real += (gameS / SCALE) * 1000;
};
const LATENT = 2_260_000;

let seq = 0;
function water(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`power-water-${seq}`);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setMeltingPoint(Quantity.of(273, 'K'));
    m.setBoilingPoint(Quantity.of(373, 'K'));
    m.setLatentHeatOfVaporization(Quantity.of(LATENT, 'J/kg'));
    return m;
  }, `/stuff/idea/material/_test/power-water-${seq}`) as unknown as Material;
}

async function hearth(heldK: number, maxW: number, fraction?: number): Promise<TestHearth> {
  const r = makeStuff(() => {
    const room = new TestRoom();
    room.setTemperature(Quantity.of(295, 'K'));
    return room;
  });
  const f = makeStuff(() => new TestHearth());
  chargeHot(f as unknown as Stuff & Burner, 200);
  f.setBurnTemperatureK(heldK);
  f.setMaxBurnPowerW(maxW);
  if (fraction !== undefined) f.setHeatTransferFraction(fraction);
  f.setStampedTemperatureK(295);
  f.setLastAmbientK(295);
  await ContainmentApi.move(f, r);
  f.ignite();
  return f;
}

/** `litres` of water in a copper, `startK`, set on the hearth. */
async function copper(f: TestHearth, litres: number, startK: number): Promise<Pot> {
  const pot = makeStuff(() => new Pot());
  pot.interiorBulk = true;
  pot.setInteriorCapacity(Quantity.of(litres * 2, 'L'));
  pot.setBulkMaterial('interior', water());
  pot.setBulkAmount('interior', Quantity.of(litres, 'L'));
  pot.setStampedTemperatureK(startK);
  pot.setLastAmbientK(startK);
  await ContainmentApi.move(pot, f, 'on');
  await pot.restamp();
  pot.reconcileThermal(); // first touch — seeds the trajectory
  return pot;
}

const litres = (pot: Pot): number => pot.getBulkAmount('interior').rawValue();

describe('⭐⭐ a fire has power (sugar D2)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100_000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('the transfer fraction is authorable and defaults to a half', async () => {
    const f = await hearth(800, 6000);
    expect(f.getHeatTransferFraction()).toBe(0.5);
    f.setHeatTransferFraction(0.3);
    expect(f.getHeatTransferFraction()).toBe(0.3);
    f.setHeatTransferFraction(1.5); // refused: more than all of it
    expect(f.getHeatTransferFraction()).toBe(0.3);
    expect(f.deliveredPowerW()).toBeCloseTo(f.burnPowerW() * 0.3, 6);
  });

  it('⭐ a 30 L copper warms at the fire’s delivered watts, not its walls’ pace', async () => {
    const f = await hearth(800, 6000);
    const pot = await copper(f, 30, 295);
    expect(pot.heatSource()).toBe(f);
    const C = pot.thermalCapacityJPerK();
    const P = f.deliveredPowerW();
    tick(60);
    const rise = pot.getTemperature().rawValue() - 295;
    // The first minute's rise is the fire's power over the pot's capacity
    // (a hair under: the copper's wall is in series with the flame).
    expect(rise).toBeLessThanOrEqual((P * 60) / C);
    expect(rise).toBeGreaterThan((P * 60) / C * 0.9);
    // A poorer arch (a third of the power reaching the pan) warms slower.
    const g = await hearth(800, 6000, 0.3 * (1 / 0.5) * 0.5);
    const pot2 = await copper(g, 30, 295);
    tick(60);
    expect(pot2.getTemperature().rawValue() - 295).toBeLessThan(rise);
  });

  it('⭐⭐ an unread pot boils off what the fire gave it, not one capacity’s worth', async () => {
    const f = await hearth(800, 6000);
    const pot = await copper(f, 30, THERMAL_DEFAULTS.DEFAULT_TEMPERATURE_K + 78);
    // Bring it to the boil and let the plateau take hold.
    tick(10);
    pot.reconcileThermal();
    const before = litres(pot);
    const P = f.deliveredPowerW();
    const pAtBoil = (P * (800 - 373)) / (800 - THERMAL_DEFAULTS.DEFAULT_TEMPERATURE_K);
    tick(3600);
    pot.reconcileThermal();
    const boiled = before - litres(pot);
    const expected = (pAtBoil * 3600) / LATENT; // litres of water
    expect(boiled).toBeGreaterThan(expected * 0.85);
    expect(boiled).toBeLessThan(expected * 1.15);
    expect(pot.getTemperature().rawValue()).toBeCloseTo(373, 0);
  });

  it('⭐ a watched pot boils no faster for being watched', async () => {
    const f1 = await hearth(800, 6000);
    const watched = await copper(f1, 30, 372);
    const f2 = await hearth(800, 6000);
    const unwatched = await copper(f2, 30, 372);
    for (let i = 0; i < 60; i += 1) {
      tick(60);
      watched.reconcileThermal();
    }
    unwatched.reconcileThermal();
    const a = 30 - litres(watched);
    const b = 30 - litres(unwatched);
    expect(a).toBeGreaterThan(0.5);
    expect(Math.abs(a - b) / a).toBeLessThan(0.1);
  });
});
