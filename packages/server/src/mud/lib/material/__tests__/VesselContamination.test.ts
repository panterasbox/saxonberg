/**
 * ⚠⚠ **A vessel carries TWO loads, and they are different facts.**
 *
 * Its CONTENTS carry their own pathogen loads on the bulk payload;
 * `ContaminableMixin` gives the vessel a **surface** load as well. A dirty
 * pot and a bad stew are genuinely different things, and only one of them
 * survives emptying the pot.
 *
 * Three behaviours fall out of that split, and all three are the point:
 *
 *   1. **Filling a contaminated vessel contaminates its contents.** This is
 *      the entire reason `wash` matters.
 *   2. **Emptying does not clean.** The surface load rides on the mixin,
 *      which a transfer never touches — so one unwashed pot is a chain of
 *      poisonings rather than a single bad meal.
 *   3. **Washing clears the surface, never the contents.** Washing a pot of
 *      bad stew is not a cure for the stew.
 *
 * ⭐ This file also exists because `CraftVessel` is the one contamination
 * host with no *event* producer of its own — nothing in the shipped verbs
 * dirties a pot yet. Without these assertions the mixin would sit on it
 * doing nothing, which is exactly how a capability ships and never runs.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import Material from '../Material';
import Condition from '../../../platform/idea/Condition';
import CraftVessel from '../../../platform/thing/CraftVessel';
import { Contamination } from '../Contaminable';
import type { PathogenBehavior } from '../Contaminable';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import { TemplatePathPrefixes } from '../../paths';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

const BASE = 3_000_000;
let now = BASE;

const BUG: PathogenBehavior = {
  reach: 'infect',
  muMaxPerHour: 0.9,
  activationEnergy: 90000,
  referenceK: 303,
  minGrowthK: 280,
  killK: 331,
  killRatePerHour: 8,
  killActivationEnergy: 200000,
  awFloor: 0.94,
  inoculum: 0.4,
  infectiousDose: 0.02,
  channels: [],
};

const STOCK = '/stuff/idea/material/_test/vessel-stock';

function ensureStock(): Material {
  const found = StuffApi.findByTemplatePath<Material>(STOCK);
  if (found) return found;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('stock');
    m.setEdibility(true);
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setSpoilActivationEnergy(Quantity.of(80_000, 'J/mol'));
    m.setWaterActivity(0.99);
    return m;
  }, STOCK) as unknown as Material;
}

/** A `CraftVessel` holding `amountL` of stock (or empty). */
function vessel(amountL: number): CraftVessel {
  const v = makeStuff(() => new CraftVessel());
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  v.setInteriorCapacity(Quantity.of(4, 'L'));
  v.setStampedTemperatureK(293);
  v.setLastAmbientK(293);
  if (amountL > 0) {
    (v as unknown as { interiorMaterial: string }).interiorMaterial = STOCK;
    v.setInteriorAmount(Quantity.of(amountL, 'L'));
  }
  return v;
}

const slot = (v: CraftVessel) => BulkableApi.slotFor(v, undefined)!;

describe('a vessel carries two loads', () => {
  beforeAll(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(() => {
      const c = new Condition();
      c.setName('vessel bug');
      c.setPathogenBehavior(BUG);
      return c;
    }, `${TemplatePathPrefixes.pathogenCondition}vessel-bug`);
  });

  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    now = BASE;
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    ensureStock();
  });

  afterEach(() => WorldClockApi._resetForTesting());

  it('⭐ 1. filling a contaminated vessel contaminates its contents', () => {
    const jug = vessel(2);
    const dirtyPot = vessel(0);
    dirtyPot.contaminate('vessel-bug', 1);
    expect(Contamination.loadsFor(slot(jug))).toEqual({});

    BulkableApi.transfer(slot(jug), slot(dirtyPot), {
      kind: 'measure',
      litres: 1,
      mode: 'strict',
    });

    expect(
      Contamination.loadsFor(slot(dirtyPot))['vessel-bug'],
    ).toBeGreaterThan(0);
  });

  it('…and pouring clean stock into a CLEAN pot leaves it clean', () => {
    // The control: the fill only dirties what the POT was carrying.
    const jug = vessel(2);
    const cleanPot = vessel(0);
    BulkableApi.transfer(slot(jug), slot(cleanPot), {
      kind: 'measure',
      litres: 1,
      mode: 'strict',
    });
    expect(Contamination.loadsFor(slot(cleanPot))).toEqual({});
  });

  it('⚠ 2. emptying does NOT clean — one unwashed pot is a chain', () => {
    const dirtyPot = vessel(2);
    dirtyPot.contaminate('vessel-bug', 1);
    const sink = vessel(0);
    BulkableApi.transfer(slot(dirtyPot), slot(sink), {
      kind: 'measure',
      litres: 2,
      mode: 'lenient',
    });
    // The contents are gone; the surface load is exactly where it was.
    expect(slot(dirtyPot).isEmpty()).toBe(true);
    expect(dirtyPot.getPathogenLoad('vessel-bug')).toBeGreaterThan(0);
  });

  it('⭐⭐ 3. washing clears the SURFACE and never the contents', () => {
    const pot = vessel(2);
    pot.contaminate('vessel-bug', 1);
    // Dirty the contents too, the way a fill would have.
    Contamination.stampLoads(slot(pot), { 'vessel-bug': 0.5 });

    // ⚠ Called DIRECTLY, not through `wash <thing>`. That is the point:
    // the clearing lived in `WashController` alone for one build, so
    // `wash()` claimed to make a pot clean while leaving salmonella on it,
    // and every other caller got a lie. This assertion is what found it.
    pot.wash();

    expect(pot.getPathogenLoads()).toEqual({});
    expect(pot.getPathogenLoad('vessel-bug')).toBe(0);
    // …and the contents went down the sink with the dregs, which is the
    // vessel's own wash behaviour and not a cure: a pot of bad stew is
    // emptied, never disinfected in place.
    expect(slot(pot).isEmpty()).toBe(true);
  });

  it('the two loads are independent — a clean pot of bad stew is possible', () => {
    const pot = vessel(2);
    Contamination.stampLoads(slot(pot), { 'vessel-bug': 0.6 });
    expect(pot.getPathogenLoads()).toEqual({});
    expect(Contamination.loadsFor(slot(pot))['vessel-bug']).toBeCloseTo(0.6, 6);
  });
});
