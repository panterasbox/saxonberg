/**
 * ⭐⭐ **A flame needs air** — ONE gate (ceramics R3), `FireLogic
 * .mediumBurns`, read from BOTH ignition paths: the deliberate strike
 * (`ignite`) and the heat threshold (`tryAutoignite`, which is how a log
 * in a clamp would catch).
 *
 * The chamber-air arm: a thing whose immediate container is a `Burner`
 * burns only while that burner draws at or above
 * `fire.air.flamingCompleteness` (0.6). So cordwood sealed in a clamp at
 * draught 0.45 (≈ 0.53) never catches however hot it gets — it chars by
 * its material's transition instead — and at draught wide it catches.
 * And the chamber's own side of the same rule: a well-drawing burner
 * takes what in it is hot enough onto its bed (`catchContents`), even a
 * piece of wood that is no `Combustible` at all (a length of cordwood is
 * a `Crop`).
 *
 * ⚠ The medium arm (under water) is underwater's, inside the same
 * function — never a second gate.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Good from '../../../../lib/stuff/Good';
import Place from '../../../../lib/stuff/Place';
import Firebox from '../../../../lib/fire/Firebox';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import Material from '../../../../lib/material/Material';
import { ThermalMixin } from '../../../../lib/thermal/Thermal';
import { ReservedMixin, Reserve } from '../../../../lib/reserve';
import { CombustibleMixin } from '../../../../lib/fire/Combustible';
import { ContainmentApi } from '../../../../api/containment';
import { StuffApi } from '../../../../api/stuff';
import { Quantity } from '../../../../lib/quantity';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Burner } from '../../../../lib/fire/Burner';
import { chargeWood } from '../../../../lib/fire/__tests__/burner-fuel';
import { makeStuff, makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

/** The clamp's composition: a firebox that encloses its feedstock. */
class Clamp extends ContainerMixin(Firebox) {
  static _mixinName = 'SealedTestClamp';
}
class Log extends CombustibleMixin(ThermalMixin(ReservedMixin(Good))) {
  static _mixinName = 'SealedTestLog';
}
/** A length of cordwood — Thermal matter of a wood, and no Combustible. */
class Length extends ThermalMixin(Good) {
  static _mixinName = 'SealedTestLength';
}
class Yard extends Place {}

let seq = 0;
function wood(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`sealed-wood-${seq}`);
    m.setAutoignitionTemperature(Quantity.of(560, 'K'));
    m.setHeatOfCombustion(Quantity.of(16, 'MJ/kg'));
    m.setSpecificHeat(Quantity.of(2000, 'J/(kg·K)'));
    m.setWaterAbsorptionCapacity(Quantity.of(32, '%'));
    return m;
  }, `/stuff/idea/material/_test/sealed-wood-${seq}`) as unknown as Material;
}

async function clampAt(draught: number): Promise<Clamp> {
  const yard = makeStuff(() => new Yard());
  const c = makeStuff(() => new Clamp());
  chargeWood(c as unknown as Stuff & Burner, 40);
  c.setBurnTemperatureK(720);
  c.setDraught(draught);
  await ContainmentApi.move(c, yard);
  return c;
}

/** Hot: past its autoignition point, and held there. */
function hot<T extends Log | Length>(t: T): T {
  t.setStampedTemperatureK(700);
  t.setLastAmbientK(700);
  return t;
}

async function logIn(c: Clamp): Promise<Log> {
  const l = makeStuff(() => {
    const x = new Log();
    x.setMass(Quantity.of(3, 'kg'));
    x.setMaterial(wood());
    x.setReserve(new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null));
    return x;
  });
  await ContainmentApi.move(l, c);
  return hot(l);
}

describe('a flame needs air — the one gate', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('⭐ a log in a starved clamp, far past its ignition point, never catches', async () => {
    const c = await clampAt(0.45);
    expect(c.completeness()).toBeLessThan(0.6);
    const l = await logIn(c);
    // The heat-threshold path.
    expect(l.tryAutoignite()).toBe(false);
    expect(l.isBurning()).toBe(false);
    // The deliberate strike — refused in the gate's own reason.
    expect(l.ignite()).toEqual({ lit: false, reason: 'no-air' });
  });

  it('⭐ open the clamp wide and the same log catches', async () => {
    const c = await clampAt(1);
    expect(c.completeness()).toBeGreaterThanOrEqual(0.6);
    const l = await logIn(c);
    expect(l.tryAutoignite()).toBe(true);
    expect(l.isBurning()).toBe(true);
  });

  it('a log standing in the open is untouched by the gate', async () => {
    const yard = makeStuff(() => new Yard());
    const l = makeStuff(() => {
      const x = new Log();
      x.setMass(Quantity.of(3, 'kg'));
      x.setMaterial(wood());
      x.setReserve(new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null));
      return x;
    });
    await ContainmentApi.move(l, yard);
    hot(l);
    expect(l.tryAutoignite()).toBe(true);
  });

  it('⭐ the chamber’s side: a drawing burner takes a hot length onto its bed', async () => {
    const c = await clampAt(1);
    const before = c.fuelRemaining();
    const piece = makeStuff(() => {
      const x = new Length();
      x.setMass(Quantity.of(3.2, 'kg'));
      x.setMaterial(wood());
      return x;
    });
    await ContainmentApi.move(piece, c);
    hot(piece);
    c.catchContents();
    expect(piece.isDestroyed()).toBe(true);
    expect(c.fuelRemaining()).toBeCloseTo(before + 3.2, 3);
  });

  it('…and a starved one leaves it to char', async () => {
    const c = await clampAt(0.45);
    const piece = makeStuff(() => {
      const x = new Length();
      x.setMass(Quantity.of(3.2, 'kg'));
      x.setMaterial(wood());
      return x;
    });
    await ContainmentApi.move(piece, c);
    hot(piece);
    c.catchContents();
    expect(piece.isDestroyed()).toBe(false);
  });
});
