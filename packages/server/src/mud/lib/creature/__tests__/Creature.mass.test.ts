/**
 * Creature mass default-seeding — `getMass()` rests on the resolved body
 * plan's `baseMass` unless the instance authored its own mass deviation.
 * Plus the `BodyPlan.baseMass` setter invariant (Phase 1).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../Creature';
import Species from '../../../obj/species/Species';
import BodyPlan from '../../../obj/species/BodyPlan';
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
  stampTemplatePathForTest(plan, `/obj/species/BodyPlan/mass-${n}`);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/obj/species/test/mass-${n}`);

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
