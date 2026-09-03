/**
 * Creature mass default-seeding — `getMass()` rests on the resolved body
 * plan's `baseMass` unless the instance authored its own mass deviation.
 * Plus the `BodyPlan.baseMass` setter invariant (Phase 1).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

let seq = 0;

/** A Creature whose plan authors `baseMass` (or none when `undefined`). */
function creatureWithBaseMass(baseMass: number | undefined): Creature {
  const n = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`mass-plan-${n}`);
  if (baseMass !== undefined) plan.setBaseMass(baseMass);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/mass-${n}`);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/mass-${n}`);

  const creature = makeStuff(() => new Creature());
  creature.setSpecies(species);
  return creature;
}

describe('BodyPlan.baseMass — setter invariant', () => {
  afterEach(() => StuffApi.clearAll());

  it('defaults to 0 and round-trips a valid value', () => {
    const plan = makeStuff(() => new BodyPlan());
    expect(plan.getBaseMass()).toBe(0);
    plan.setBaseMass(70);
    expect(plan.getBaseMass()).toBe(70);
  });

  it('rejects negative / non-finite values', () => {
    const plan = makeStuff(() => new BodyPlan());
    expect(() => plan.setBaseMass(-1)).toThrow(RangeError);
    expect(() => plan.setBaseMass(Number.NaN)).toThrow(RangeError);
    expect(() => plan.setBaseMass(Infinity)).toThrow(RangeError);
  });
});

describe('Creature — mass default-seeding from BodyPlan.baseMass', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('seeds getMass() from the plan baseMass when none is authored', () => {
    const creature = creatureWithBaseMass(70);
    expect(creature.getMass().rawValue()).toBe(70);
  });

  it('an authored mass is the deviation that wins over baseMass', () => {
    const creature = creatureWithBaseMass(70);
    creature.setMass(Quantity.of(90, 'kg'));
    expect(creature.getMass().rawValue()).toBe(90);
  });

  it('a sessile / baseMass-absent plan leaves mass at 0 (no throw)', () => {
    const creature = creatureWithBaseMass(undefined);
    expect(creature.getMass().rawValue()).toBe(0);
  });

  it('seeding is idempotent — repeated reads stay at the seeded value', () => {
    const creature = creatureWithBaseMass(70);
    expect(creature.getMass().rawValue()).toBe(70);
    expect(creature.getMass().rawValue()).toBe(70);
  });
});

describe('Creature biological reserve readers — the contract surface', () => {
  afterEach(() => StuffApi.clearAll());

  it('getEndurance/getSatiation/getHydration front the keyed reserves', () => {
    const c = makeStuff(() => new Creature());
    // installed at construction, full, %-unit — non-null by contract
    for (const r of [c.getEndurance(), c.getSatiation(), c.getHydration()]) {
      expect(r.capacity.unit).toBe('%');
      expect(r.current.rawValue()).toBe(100);
    }
    c.adjustReserve('endurance', Quantity.of(-30, '%'));
    expect(c.getEndurance().current.rawValue()).toBe(70);
    expect(c.getEndurance().key).toBe('endurance');
  });
});

/**
 * ⭐⭐ Size resolves through the SPECIES, and that is the whole point.
 *
 * Before this, every playable species inherited `biped`'s 70 kg — so a
 * halfling and a dragonborn carried the same weight, punched with the
 * same energy, ate the same and cooled at the same rate. Fit cannot key
 * on a constant, which is what forced the fix.
 *
 * ⭐ And there is exactly ONE accessor, so lineage can later override on
 * the individual without touching either layer.
 */
describe('Species size — own, else the plan, else zero', () => {
  afterEach(() => StuffApi.clearAll());

  function sized(
    own: { baseMass?: number; stature?: number },
    plan: { baseMass?: number; baseStature?: number } = {},
  ): { species: Species; creature: Creature } {
    const n = seq++;
    const bodyPlan = makeStuff(() => new BodyPlan());
    bodyPlan.setName(`sized-plan-${n}`);
    if (plan.baseMass !== undefined) bodyPlan.setBaseMass(plan.baseMass);
    if (plan.baseStature !== undefined) {
      bodyPlan.setBaseStature(plan.baseStature);
    }
    stampTemplatePathForTest(bodyPlan, `/stuff/idea/species/BodyPlan/sized-${n}`);

    const species = makeStuff(() => new Species());
    species.setBodyPlan(bodyPlan);
    if (own.baseMass !== undefined) species.setBaseMass(own.baseMass);
    if (own.stature !== undefined) species.setStature(own.stature);
    stampTemplatePathForTest(species, `/stuff/idea/species/test/sized-${n}`);

    const creature = makeStuff(() => new Creature());
    creature.setSpecies(species);
    return { species, creature };
  }

  it("a species override wins over the plan", () => {
    const { species, creature } = sized(
      { baseMass: 125, stature: 2.0 },
      { baseMass: 70, baseStature: 1.75 },
    );
    expect(species.getBaseMass()).toBe(125);
    expect(species.getStature()).toBe(2.0);
    expect(creature.getMass().rawValue()).toBe(125);
  });

  it("an absent override inherits the plan", () => {
    const { species, creature } = sized({}, { baseMass: 70, baseStature: 1.75 });
    expect(species.getBaseMass()).toBe(70);
    expect(species.getStature()).toBe(1.75);
    expect(creature.getMass().rawValue()).toBe(70);
  });

  it("an authored INSTANCE mass still wins over both", () => {
    // The deviation rule is unchanged: species size is a default, not a
    // ceiling, and a specific creature may simply weigh what it weighs.
    const { creature } = sized(
      { baseMass: 125 },
      { baseMass: 70, baseStature: 1.75 },
    );
    creature.setMass(Quantity.of(43, 'kg'));
    expect(creature.getMass().rawValue()).toBe(43);
  });

  it("with neither authored, both read zero and readers fall back", () => {
    const { species, creature } = sized({});
    expect(species.getBaseMass()).toBe(0);
    expect(species.getStature()).toBe(0);
    expect(creature.getMass().rawValue()).toBe(0);
  });

  it("both setters refuse negative / non-finite values", () => {
    const { species } = sized({});
    expect(() => species.setBaseMass(-1)).toThrow(RangeError);
    expect(() => species.setStature(Number.NaN)).toThrow(RangeError);
    const plan = makeStuff(() => new BodyPlan());
    expect(() => plan.setBaseStature(-0.5)).toThrow(RangeError);
  });
});
