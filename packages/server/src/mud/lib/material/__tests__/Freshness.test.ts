/**
 * FreshnessMixin — the spoilage gauge. Growth is logistic from an
 * inoculum, reconcile-on-read over game-time, at a rate
 * `μ_max · f_T(T) · f_aw(a_w)` whose per-material half is tabulated on the
 * `Material`. ⚠ No far-past guard and no linkdead freeze: food rots over
 * the whole absence. See docs/subsystems/spoilage.md.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Thing from '../../stuff/Thing';
import Prop from '../../../platform/thing/Prop';
import Material from '../Material';
import { Freshness } from '../Freshness';
import { MixinApi } from '../../../api/mixin';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import PersistentHydrator from '../../../platform/idea/persistence/PersistentHydrator';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

const HOUR = 3600;
const DAY = 24 * HOUR;
const BASE = 1_000_000;

let now = BASE;
function setNow(s: number): void {
  now = BASE + s;
}

let matSeq = 0;
/**
 * A test Material. `ea` is the spoilage activation energy (J/mol; 0 = the
 * material does not spoil at all); `aw` its water activity.
 */
function material(ea: number, aw = 0.98): Material {
  matSeq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`fresh-test-mat-${matSeq}`);
    m.setSpecificHeat(Quantity.of(3200, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.5, 'W/(m·K)'));
    m.setSpoilActivationEnergy(Quantity.of(ea, 'J/mol'));
    m.setWaterActivity(aw);
    return m;
  }, `/stuff/idea/material/_test/fresh-${matSeq}`) as unknown as Material;
}

/** A `Prop` (Thermal + Fresh) of the given material, held at `tempK`. */
function food(mat: Material, tempK = 293): Prop {
  return makeStuff(() => {
    const p = new Prop();
    p.setMass(Quantity.of(1, 'kg'));
    p.setMaterial(mat);
    p.setStampedTemperatureK(tempK);
    p.setLastAmbientK(tempK); // equal ambient → holds its temperature
    return p;
  });
}

/** A bare `Thing` (Fresh, NOT Thermal) — reads the neutral ambient dial. */
function bareThing(mat: Material): Thing {
  return makeStuff(() => {
    const t = new Thing();
    t.setMaterial(mat);
    return t;
  });
}

const MEAT_EA = 80_000; // J/mol — the mid-range of real food-spoilage values

describe('FreshnessMixin — the spoilage gauge', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('every Thing carries the gauge, and a fresh one reads fresh', () => {
    const t = bareThing(material(MEAT_EA));
    expect(MixinApi.isFresh(t)).toBe(true);
    expect(t.getMicrobialLoad()).toBe(0);
    expect(t.getFreshnessBand()).toBe('fresh');
  });

  // ---- AC1: inertness is the material's silence, not a flag ----

  it('a material tabulating NO activation energy never spoils, ever', () => {
    const anvil = food(material(0));
    anvil.getMicrobialLoad(); // seeds the stamp
    setNow(30 * DAY);
    expect(anvil.getMicrobialLoad()).toBe(0);
    expect(anvil.getFreshnessBand()).toBe('fresh');
    expect(anvil.isPerishable()).toBe(false);
    // …and the field stays at its sparse default: nothing to persist.
    expect(anvil._microbialLoad).toBe(0);
  });

  it('a perishable material reports itself perishable', () => {
    expect(food(material(MEAT_EA)).isPerishable()).toBe(true);
  });

  // ---- AC2: the three temperature regimes ----

  it('warm food spoils, and cold food spoils MUCH slower', () => {
    const mat = material(MEAT_EA);
    const warm = food(mat, 303); // 30 °C — the reference
    const cold = food(mat, 277); // 4 °C — a cold larder
    warm.getMicrobialLoad();
    cold.getMicrobialLoad();
    setNow(2 * DAY);
    const w = warm.getMicrobialLoad();
    const c = cold.getMicrobialLoad();
    expect(w).toBeGreaterThan(0.5);
    expect(c).toBeLessThan(w);
    expect(c).toBeLessThan(0.1);
  });

  it('frozen PAUSES growth — and thawing resumes where it left off', () => {
    const mat = material(MEAT_EA);
    const frozen = food(mat, 260); // −13 °C
    frozen.getMicrobialLoad();
    setNow(10 * DAY);
    expect(frozen.getMicrobialLoad()).toBe(0);

    // Thaw it: the load resumes from where it was, not from a reset.
    const warmed = food(mat, 303);
    warmed.setMicrobialLoad(0.2);
    setNow(10 * DAY + HOUR);
    expect(warmed.getMicrobialLoad()).toBeGreaterThan(0.2);
  });

  it('heat KILLS — the load falls exponentially above the kill temperature', () => {
    const hot = food(material(MEAT_EA), 373); // a rolling boil
    hot.setMicrobialLoad(0.9);
    setNow(HOUR);
    expect(hot.getMicrobialLoad()).toBeLessThan(0.01);
  });

  it('below the water-activity floor nothing grows — salt keeps by physics', () => {
    // Same activation energy, same warmth; only a_w differs.
    const wet = food(material(MEAT_EA, 0.98), 303);
    const dry = food(material(MEAT_EA, 0.35), 303); // dried / salted / candied
    wet.getMicrobialLoad();
    dry.getMicrobialLoad();
    setNow(3 * DAY);
    expect(wet.getMicrobialLoad()).toBeGreaterThan(0.5);
    expect(dry.getMicrobialLoad()).toBe(0);
  });

  // ---- AC1: no far-past guard — food rots over the WHOLE absence ----

  it('a three-day gap integrates in full (⚠ no far-past guard)', () => {
    const stew = food(material(MEAT_EA), 293);
    stew.getMicrobialLoad(); // stamp
    setNow(3 * DAY); // far beyond wetness’s 4-hour absence guard
    // One read after a long silence integrates the whole silence.
    expect(stew.getMicrobialLoad()).toBeGreaterThan(0.5);
  });

  it('the integral is path-independent: many small reads == one long one', () => {
    const mat = material(MEAT_EA);
    const watched = food(mat, 296);
    const ignored = food(mat, 296);
    watched.getMicrobialLoad();
    ignored.getMicrobialLoad();
    for (let h = 1; h <= 48; h++) {
      setNow(h * HOUR);
      watched.getMicrobialLoad(); // read every hour
    }
    setNow(48 * HOUR);
    expect(ignored.getMicrobialLoad()).toBeCloseTo(
      watched.getMicrobialLoad(),
      4,
    );
  });

  // ---- AC3: the host's own temperature is what the gauge reads ----

  it('a Prop reads its OWN thermal state — the larder and the windowsill differ', () => {
    const mat = material(MEAT_EA);
    const larder = food(mat, 280);
    const sill = food(mat, 305);
    larder.getMicrobialLoad();
    sill.getMicrobialLoad();
    setNow(DAY);
    expect(sill.getMicrobialLoad()).toBeGreaterThan(
      larder.getMicrobialLoad() * 5,
    );
  });

  // ---- bands + the augmenter ----

  it('bands map by threshold', () => {
    const mk = (load: number): Prop => {
      const p = food(material(MEAT_EA));
      p.setMicrobialLoad(load);
      return p;
    };
    expect(mk(0.1).getFreshnessBand()).toBe('fresh');
    expect(mk(0.3).getFreshnessBand()).toBe('tainted');
    expect(mk(0.7).getFreshnessBand()).toBe('spoiled');
    expect(mk(0.95).getFreshnessBand()).toBe('rotten');
  });

  it('a spoiled thing shows a band line, never a number; a fresh one says nothing', () => {
    // Fold every augmenter the chain contributes, the way the render does.
    const augment = (host: Prop): string =>
      MixinApi.getAllMarkupAugmenters(
        (host as unknown as { constructor: never }).constructor,
      ).reduce((text, fn) => fn(text, host, host), 'A bowl of stew.');

    const fresh = food(material(MEAT_EA));
    expect(augment(fresh)).toBe('A bowl of stew.');

    const rank = food(material(MEAT_EA));
    rank.setMicrobialLoad(0.95);
    const text = augment(rank);
    expect(text).toContain('rotten');
    expect(text).not.toMatch(/0\.9/);
  });
});

describe('Freshness — the shared arithmetic', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('the ptomaine dose is a CURVE, not a step', () => {
    expect(Freshness.doseFor(0.1)).toBeNull();
    expect(Freshness.doseFor(0.3)).toBeNull(); // at the onset: still nothing
    const mild = Freshness.doseFor(0.5);
    const bad = Freshness.doseFor(0.8);
    const rotten = Freshness.doseFor(1);
    expect(mild!.type).toBe('ptomaine');
    expect(mild!.amount).toBeGreaterThan(0);
    expect(bad!.amount).toBeGreaterThan(mild!.amount);
    // Superlinear: the second half of the ladder costs more than the first.
    expect(bad!.amount - mild!.amount).toBeGreaterThan(mild!.amount);
    expect(rotten!.amount).toBeGreaterThan(bad!.amount);
  });

  it('withDose leaves clean matter alone and never invents a payload', () => {
    const mat = material(MEAT_EA);
    expect(Freshness.withDose(null, mat, 0.1)).toBeNull();
  });

  it('withDose synthesizes the material shadow so nutrition is not dropped', () => {
    const mat = material(MEAT_EA);
    mat.setNutrients(['protein']);
    mat.setNutrientAmounts({ protein: 26000 });
    const payload = Freshness.withDose(null, mat, 0.9)!;
    expect(payload.nutrients).toEqual(['protein']);
    expect(payload.nutrientAmounts.protein).toBe(26000);
    expect(payload.toxicity.find((t) => t.type === 'ptomaine')).toBeTruthy();
  });

  it('blendLoads is mass-weighted — pouring does not launder spoilage', () => {
    // 1 L spoiled (0.9) into 1 L fresh (0) → 0.45, not 0.
    expect(Freshness.blendLoads(0.9, 1, 0, 1)).toBeCloseTo(0.45, 6);
    // A drop of spoiled into a lot of fresh barely moves it.
    expect(Freshness.blendLoads(0.9, 0.1, 0, 9.9)).toBeLessThan(0.01);
  });
});

describe('the gauge across a restore (AC5)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('a restored object integrates the gap at its STORED temperature', async () => {
    const mat = material(MEAT_EA);
    // ⚠ The stamp is in GAME-seconds off the world clock, which is not the
    // test's wall-clock cursor — read it rather than assume it.
    const takenAt = WorldClockApi.getNow().rawValue();
    // What the snapshot holds: a load, the stamp it was taken at, and the
    // thermal state the object was in — a cold larder.
    const stored = {
      _microbialLoad: 0.1,
      freshnessClockStamp: takenAt,
      stampedTemperatureK: 277,
      lastAmbientK: 277,
    };

    setNow(2 * DAY); // two game-days of absence

    const restored = makeStuff(() => new Prop());
    restored.setMaterial(mat);
    await makeStuff(() => new PersistentHydrator()).hydrate(restored, stored);

    // ⚠ The stamp survives hydration — a `set<Field>` that re-stamped
    // would silently swallow the whole absence. (`_microbialLoad` has no
    // `set_microbialLoad`, so the Hydrator bracket-assigns; the public
    // `setMicrobialLoad` is the KILL seam and deliberately does re-stamp.)
    expect(restored.freshnessClockStamp).toBe(takenAt);

    const cold = restored.getMicrobialLoad();
    expect(cold).toBeGreaterThan(0.1); // the absence counted…

    // …and it counted at the LARDER's rate, not the room's. The same
    // snapshot restored warm is far worse off.
    const warmStored = { ...stored, stampedTemperatureK: 303, lastAmbientK: 303 };
    const warmRestored = makeStuff(() => new Prop());
    warmRestored.setMaterial(mat);
    await makeStuff(() => new PersistentHydrator()).hydrate(
      warmRestored,
      warmStored,
    );
    expect(warmRestored.getMicrobialLoad()).toBeGreaterThan(cold * 3);
  });

  it('the sparse default round-trips as nothing to restore', async () => {
    const fresh = makeStuff(() => new Prop());
    fresh.setMaterial(material(0));
    expect(fresh._microbialLoad).toBe(0);
    expect(fresh.freshnessClockStamp).toBe(0);
  });
});
