/**
 * Fit — two derived numbers and one stamp.
 *
 * ⭐ Deliberately **not a tailor's chart**: a stature and a ponderal
 * index `girth = √(mass / stature)`. `massKg` is `Creature.getMass()`,
 * which already reflects composition — **that is the lineage seam, and
 * it is one line**, which the last test in this file proves.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WearableMixin } from '../Wearable';
import { SlottableMixin } from '../Slottable';
import { ConstructedMixin } from '../../material/Constructed';
import { ContainableMixin } from '../../spatial/Containable';
import Thing from '../../stuff/Thing';
import Material from '../../material/Material';
import { Construction } from '../../material/Construction';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestGarment extends WearableMixin(
  SlottableMixin(ContainableMixin(ConstructedMixin(Thing))),
) {}

let seq = 0;

/** A fresh biped plan, stamped at a unique path. */
function bipedPlan(planMass = 70, planStature = 1.75): BodyPlan {
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`fit-biped-${seq}`);
  plan.setBaseMass(planMass);
  plan.setBaseStature(planStature);
  plan.setSlots([
    { name: 'torso', accepts: 'WearableMixin', capacity: 4, covers: ['body.torso'] },
  ]);
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 40 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/fit-${seq++}`);
  return plan;
}

/**
 * A body of `plan`, at a species mass and stature. ⚠ Two bodies given
 * the SAME plan object share one anatomy — which is what the
 * cross-species test needs, and is the true shipped situation: every
 * playable species is `biped`.
 */
function body(opts: {
  plan?: BodyPlan;
  massKg: number;
  statureM: number;
}): { creature: Creature; planPath: string } {
  const n = seq++;
  const plan = opts.plan ?? bipedPlan();
  const planPath = plan.getTemplatePath()!;

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  species.setBaseMass(opts.massKg);
  species.setStature(opts.statureM);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/fit-${n}`);

  const creature = makeStuff(() => new Creature());
  creature.setSpecies(species);
  return { creature, planPath };
}

function garment(planPath: string, massKg = 1.0): TestGarment {
  const g = makeStuff(() => new TestGarment());
  const m = makeStuff(() => new Material());
  m.setName(`wool-${seq}`);
  m.setDensity(Quantity.of(1310, 'kg/m³'));
  m.setThermalConductivity(Quantity.of(0.04, 'W/(m·K)'));
  m.setWaterAbsorptionCapacity(Quantity.of(33, '%'));
  stampTemplatePathForTest(m, `/stuff/idea/material/textile/fit-wool-${seq++}`);
  g.setMaterial(m);
  g.setMass(Quantity.of(massKg, 'kg'));
  g.setConstructionForm('woven');
  g.setSlotClaim(planPath, ['torso']);
  return g;
}

describe('the measurement pair', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    Construction.registerFabric({
      key: 'woven',
      layerBand: 0,
      loft: 0.1,
      weaveDensity: 0.75,
      drape: 0.6,
    });
  });
  afterEach(() => {
    Construction.clearFabrics();
    StuffApi.clearAll();
  });

  it('an UNSTAMPED garment reads as STOCK against the plan average', () => {
    // ⭐ The load-bearing default: every shipped row carries no stamp,
    // so all fifteen read as ill-fitting hand-me-downs with NO content
    // edit at all.
    const { creature, planPath } = body({ massKg: 70, statureM: 1.75 });
    const g = garment(planPath);
    expect(g.getCutToBodyPlan()).toBe('');
    const fit = g.fitOn(creature);
    expect(fit.measurable).toBe(true);
    // The plan average IS this body, so a stock garment fits it exactly.
    expect(fit.distance).toBeCloseTo(0, 6);
  });

  it('⭐ bespoke out-performs stock ON THE SAME BODY', () => {
    // AC 7. An unusual body is badly served by the average and well
    // served by its own measurements — which is the tailor's entire
    // economic reason to exist.
    const { creature, planPath } = body({ massKg: 30, statureM: 1.0 });
    const stock = garment(planPath);
    const bespoke = garment(planPath);
    const measured = stock.fitOn(creature);
    bespoke.setCutTo(planPath, measured.body.statureM, measured.body.girthIndex);

    expect(bespoke.fitOn(creature).distance).toBeLessThan(measured.distance);
    expect(bespoke.fitOn(creature).distance).toBeCloseTo(0, 6);
    expect(measured.distance).toBeGreaterThan(0.2);
  });

  it('a garment cut for a bigger body reads LOOSE; a smaller one, TIGHT', () => {
    const { creature, planPath } = body({ massKg: 70, statureM: 1.75 });
    const big = garment(planPath);
    big.setCutTo(planPath, 2.0, Math.sqrt(125 / 2.0));
    const small = garment(planPath);
    small.setCutTo(planPath, 1.0, Math.sqrt(30 / 1.0));

    expect(big.fitOn(creature).looseness).toBeGreaterThan(0);
    expect(big.fitOn(creature).tightness).toBe(0);
    expect(small.fitOn(creature).tightness).toBeGreaterThan(0);
    expect(small.fitOn(creature).looseness).toBe(0);
  });

  it("⚠ a halfling's coat fails on a DRAGONBORN by a NUMBER, not a species check", () => {
    // Both are `biped`, so slot matching alone would let it straight on.
    const shared = bipedPlan();
    const halfling = body({ plan: shared, massKg: 38, statureM: 1.05 });
    const dragonborn = body({ plan: shared, massKg: 125, statureM: 2.0 });
    expect(halfling.planPath).toBe(dragonborn.planPath);

    const coat = garment(halfling.planPath);
    const measured = coat.fitOn(halfling.creature);
    coat.setCutTo(
      halfling.planPath,
      measured.body.statureM,
      measured.body.girthIndex,
    );

    expect(coat.fitOn(halfling.creature).distance).toBeCloseTo(0, 6);
    // …and on the big body it is a non-starter, well past any threshold.
    expect(coat.fitOn(dragonborn.creature).distance).toBeGreaterThan(0.35);
  });

  it('⚠ a stamp naming a DIFFERENT body plan is wrong-body outright', () => {
    const { creature, planPath } = body({ massKg: 70, statureM: 1.75 });
    const g = garment(planPath);
    // Same measurements, different anatomy — a hard refusal that
    // distance alone would never catch.
    const measured = g.fitOn(creature);
    g.setCutTo(
      '/stuff/idea/species/BodyPlan/quadruped',
      measured.body.statureM,
      measured.body.girthIndex,
    );
    const fit = g.fitOn(creature);
    expect(fit.wrongBody).toBe(true);
    expect(fit.distance).toBeCloseTo(0, 6);
  });

  it('an unmeasurable wearer yields the neutral reading, never a throw', () => {
    const { planPath } = body({ massKg: 70, statureM: 1.75 });
    const g = garment(planPath);
    const rock = makeStuff(() => new Thing());
    const fit = g.fitOn(rock);
    expect(fit.measurable).toBe(false);
    expect(fit.distance).toBe(0);
  });

  it('the stamp is THREE scalars, and each setter validates', () => {
    // ⚠ Not one composite object: a fixed-key composite of three
    // scalars is exactly the case the persistent-fields doctrine says
    // decomposes. (`slotClaims` is the contrasting variable-key case.)
    const g = makeStuff(() => new TestGarment());
    expect(TestGarment.fieldMeta.cutToBodyPlan?.persistent).toBe(true);
    expect(TestGarment.fieldMeta.cutToStature?.persistent).toBe(true);
    expect(TestGarment.fieldMeta.cutToGirth?.persistent).toBe(true);
    expect(() => g.setCutToStature(-1)).toThrow(RangeError);
    expect(() => g.setCutToGirth(Number.NaN)).toThrow(RangeError);
  });

  it('⭐⭐ THE LINEAGE SEAM — changing only getMass() moves the fit', () => {
    // The test that proves textiles will not need re-opening when
    // lineage lands: individual variance arrives through
    // `Creature.getMass()` alone, and NOTHING in this subsystem is
    // touched to consume it.
    const { creature, planPath } = body({ massKg: 70, statureM: 1.75 });
    const coat = garment(planPath);
    const measured = coat.fitOn(creature);
    coat.setCutTo(planPath, measured.body.statureM, measured.body.girthIndex);
    expect(coat.fitOn(creature).distance).toBeCloseTo(0, 6);

    // The ONLY change: this individual now masses more than its species.
    creature.setMass(Quantity.of(95, 'kg'));

    const after = coat.fitOn(creature);
    expect(after.distance).toBeGreaterThan(0);
    // …and it reads TIGHT, because the body outgrew the garment.
    expect(after.tightness).toBeGreaterThan(0);
  });
});
