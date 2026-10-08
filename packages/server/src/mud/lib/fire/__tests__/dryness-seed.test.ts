/**
 * ⭐⭐⭐ **The dryness seed** — the fire build's drive found this on its
 * third checkpoint, and it is the clearest case in the build for why a
 * drive is the exit criterion.
 *
 * `stoke charcoal into forge` was refused *"It is too sodden to catch."*
 *
 * Charcoal comes out of a three-day fire bone dry. The reason it read as
 * sodden is that `WaterActivityMixin`'s sparse default is `_moisture =
 * 1` — *as harvested* — which is right for food and catastrophically
 * wrong for a product of drying. ⚠ Nothing in the game read a fuel's
 * water before this build: `Combustible` reads it for `ignite`, and no
 * shipped Combustible composes `WaterActivityMixin`. So the defect was
 * **invisible until something asked the question**.
 *
 * ## Why a SEED and not a property
 *
 * `_moisture` is deliberately not authorable. Water state is runtime
 * state the world produces by drying and curing, a dried good is
 * something the world MADE, and a `dry-turf` row written to paper over
 * exactly this gap was correctly deleted (`lint:instanceable` invariant
 * 12 refuses a key the applier discards silently).
 *
 * ⭐ But a PROP has no production act. `seed` is the sanctioned mechanism
 * for the initial runtime state of a minted object — applier phase 3,
 * seeded once at mint and never on a restore — which is precisely what
 * this is. A row that says nothing still starts as-harvested, so a
 * freshly cut turf still refuses the flame, which is the lesson.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import Material from '../../material/Material';
import { Quantity } from '../../quantity';
import Provision from '../../../platform/thing/Provision';
import Forge from '../../../platform/thing/Forge';
import type { Stuff } from '../../stuff/Stuff';

let seq = 0;

/** A fuel material that DRINKS — charcoal's own 30 % capacity. */
function thirstyFuel(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`charcoal-${seq}`);
    m.setHeatOfCombustion(Quantity.of(30, 'MJ/kg'));
    m.setWaterAbsorptionCapacity(Quantity.of(30, '%'));
    m.setSpecificHeat(Quantity.of(1000, 'J/(kg·K)'));
    return m;
  }, `/stuff/idea/material/_test/dryness-fuel-${seq}`) as unknown as Material;
}

function coldForge(): Forge {
  const f = makeStuff(() => new Forge()) as Forge;
  // ⚠ `BurnerMixin.lit` defaults TRUE — right for the Campfire seed it
  // was written for, wrong for a bare `new Forge()`.
  (f as unknown as { lit: boolean }).lit = false;
  f.setFuelCapacityKg(30);
  return f;
}

function basket(material: Material, dryness?: number): Stuff {
  return makeStuff(() => {
    const p = new Provision();
    p.setMaterial(material);
    p.setMass(Quantity.of(8, 'kg'));
    if (dryness !== undefined) {
      (p as unknown as { seedDryness(v: number): void }).seedDryness(dryness);
    }
    return p;
  }) as unknown as Stuff;
}

describe('the dryness seed', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('⛔ a Provision that seeds nothing is AS HARVESTED, and refuses', () => {
    // The defect, pinned. `_moisture = 1` × charcoal's 30 % capacity ×
    // water's latent heat / its specific heat is a ~680 K ignition
    // penalty, against a hand-flame's 150 K of drying — so it is not
    // marginally too wet, it is four times too wet.
    const forge = coldForge();
    expect(forge.stoke(basket(thirstyFuel()))).toEqual({
      ok: false,
      reason: 'too-wet',
    });
    expect(forge.fuelRemaining()).toBe(0);
  });

  it('⭐⭐ …and the same basket, seeded dry, goes in', () => {
    const forge = coldForge();
    const out = forge.stoke(basket(thirstyFuel(), 0.95));
    expect(out.ok, JSON.stringify(out)).toBe(true);
    expect(forge.fuelRemaining()).toBeCloseTo(8);
    // ⭐ And then it lights, which is the whole chain: a prop that came
    // out of a fire can be put back into one.
    expect(forge.ignite().lit).toBe(true);
  });

  it('⚠ a BARELY-dried one still refuses — the seed is a figure, not a flag', () => {
    // ⭐ And the threshold is derived rather than chosen: a hand-flame
    // can dry through 150 K of penalty, and the penalty is
    // `held × capacity × L_vap / c` — so for a 30 %-capacity fuel the
    // line sits near moisture 0.6. A fortnight in a rick gets a turf
    // across it; a morning does not. Nothing authors the line.
    const forge = coldForge();
    expect(forge.stoke(basket(thirstyFuel(), 0.2))).toEqual({
      ok: false,
      reason: 'too-wet',
    });
    // Just over it, and it catches — which is what makes drying WORK
    // rather than being a flag somebody flips.
    expect(forge.stoke(basket(thirstyFuel(), 0.45)).ok).toBe(true);
  });

  it('⭐ the seed is clamped, and a nonsense value is ignored rather than stored', () => {
    const forge = coldForge();
    const p = basket(thirstyFuel());
    const seeded = p as unknown as {
      seedDryness(v: number): void;
      getMoisture(): number;
    };
    seeded.seedDryness(Number.NaN);
    expect(seeded.getMoisture()).toBe(1); // untouched
    seeded.seedDryness(5);
    expect(seeded.getMoisture()).toBe(0); // clamped, not 1 − 5
    expect(forge.stoke(p).ok).toBe(true);
  });
});
