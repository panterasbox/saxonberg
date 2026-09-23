/**
 * The remaining trauma behaviors (Phase 2) — contusion / burn / avulsion
 * carry live, non-no-op behavior, and a fracture impairs its coupled
 * slot's affordances through the existing `canOccupy` machinery (a derived
 * read that restores as the fracture heals / clears).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Thing from '../../stuff/Thing';
import { SlottableMixin } from '../../slot/Slottable';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { TRAUMA_BEHAVIOR, HARM_DEFAULTS } from '../../../platform/idea/Condition';
import type { Trauma } from '../../../platform/idea/Condition';

const SlottableThingBase = SlottableMixin(Thing);
class SlottableThing extends SlottableThingBase {}

/** A Creature whose species has a hand slot coupled to a hand part. */
function anatomicalCreature(): Creature {
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('test-biped');
  plan.setSlots([
    { name: 'grip', accepts: 'SlottableMixin', bodyPart: 'body.arm.left.hand' },
  ]);
  plan.setBodyParts([
    { key: 'body.torso', parent: null, tissues: [] },
    { key: 'body.arm.left', parent: 'body.torso', tissues: [] },
    { key: 'body.arm.left.hand', parent: 'body.arm.left', tissues: [] },
  ]);
  stampTemplatePathForTest(plan, '/stuff/idea/species/BodyPlan/test-biped');

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, '/stuff/idea/species/test/anatomical');

  const creature = makeStuff(() => new Creature());
  creature.setSpecies(species);
  return creature;
}

describe('Trauma behaviors — contusion / burn / avulsion', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('contusion self-resolves over time and never bleeds', () => {
    const host = makeStuff(() => new Creature());
    const start = host.getVitalSign('bloodVolume').rawValue();
    const t: Trauma = {
      kind: 'trauma',
      type: 'contusion',
      site: 'body.torso',
      severity: 1,
    };
    // ⭐ The split (D1): `tick` is the HARM half (a bruise does nothing —
    // no bleed, no blood lost), `mend` is the healing half (the decay,
    // scaled by the convalescence factor `k`).
    TRAUMA_BEHAVIOR.contusion.tick(host, t, 60);
    expect(t.bleeding).toBeUndefined();
    expect(host.getVitalSign('bloodVolume').rawValue()).toBe(start);
    expect(t.severity).toBe(1); // tick alone no longer heals
    TRAUMA_BEHAVIOR.contusion.mend(host, t, 60, 1);
    expect(t.severity).toBeLessThan(1);
  });

  it('burn carries a real, decaying behavior', () => {
    const host = makeStuff(() => new Creature());
    const t: Trauma = {
      kind: 'trauma',
      type: 'burn',
      site: 'body.arm.left',
      severity: 1.5,
    };
    // The severity decay is the healing half (`mend`); `tick` carries only
    // the burn's weep, which is a `signature` effect the reconcile applies.
    TRAUMA_BEHAVIOR.burn.mend(host, t, 60, 1);
    expect(t.severity).toBeLessThan(1.5);
    expect(TRAUMA_BEHAVIOR.burn.describe(t)).toContain('burn');
  });

  it('avulsion behaves as a severe laceration (floors severity, bleeds)', () => {
    const host = makeStuff(() => new Creature());
    const t: Trauma = {
      kind: 'trauma',
      type: 'avulsion',
      site: 'body.leg.left',
      severity: 0.5, // below the floor — onset lifts it
    };
    TRAUMA_BEHAVIOR.avulsion.onset(host, t);
    expect(t.bleeding).toBe(true);
    expect(t.severity).toBeGreaterThanOrEqual(
      HARM_DEFAULTS.AVULSION_SEVERITY_FLOOR
    );

    const start = host.getVitalSign('bloodVolume').rawValue();
    TRAUMA_BEHAVIOR.avulsion.tick(host, t, 60);
    expect(host.getVitalSign('bloodVolume').rawValue()).toBeLessThan(start);
  });
});

describe('Fracture impairs affordances via canOccupy', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('a fracture disables the coupled slot; healing restores it', () => {
    const creature = anatomicalCreature();
    const item = makeStuff(() => new SlottableThing());

    // Intact hand → the grip slot accepts the item.
    expect(creature.canOccupy(item, 'grip')).toBe(true);

    const fracture: Trauma = {
      kind: 'trauma',
      type: 'fracture',
      site: 'body.arm.left.hand',
      severity: HARM_DEFAULTS.FRACTURE_IMPAIR_SEVERITY + 0.5,
    };
    creature.afflict(fracture);
    expect(creature.isSlotImpairedByCondition('grip')).toBe(true);
    expect(creature.canOccupy(item, 'grip')).toBe(false);

    // Heal below the impair threshold → the affordance returns (a derived
    // read, no separate un-impair step).
    fracture.severity = HARM_DEFAULTS.FRACTURE_IMPAIR_SEVERITY - 0.1;
    expect(creature.isSlotImpairedByCondition('grip')).toBe(false);
    expect(creature.canOccupy(item, 'grip')).toBe(true);

    // Relieving it entirely also restores.
    fracture.severity = HARM_DEFAULTS.FRACTURE_IMPAIR_SEVERITY + 0.5;
    expect(creature.canOccupy(item, 'grip')).toBe(false);
    creature.relieve(fracture);
    expect(creature.canOccupy(item, 'grip')).toBe(true);
  });
});

/* ────── W10: the capability term — the fracture rule, generalized ────── */

describe('the capability term', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('⭐ a badly BURNED hand cannot grip either — the rule is the table\'s now', () => {
    // `isSlotImpairedByCondition` used to name `fracture` in code, so a
    // hand burned to the bone held a shield perfectly well. The term is
    // now declared on TRAUMA_BEHAVIOR beside the decay law, which makes
    // it available to every wound type instead of hard-coded for one.
    const creature = anatomicalCreature();
    expect(creature.isSlotImpairedByCondition('grip')).toBe(false);
    const burn: Trauma = {
      kind: 'trauma',
      type: 'burn',
      site: 'body.arm.left.hand',
      severity: 2,
    };
    creature.afflict(burn);
    expect(creature.isSlotImpairedByCondition('grip')).toBe(true);
    // …and it is a DERIVED read: the affordance returns as it heals, with
    // no separate un-impair step.
    burn.severity = 0.5;
    expect(creature.isSlotImpairedByCondition('grip')).toBe(false);
  });

  it('⭐⭐ a cut costs the grip a LITTLE — and enough of one costs it all', () => {
    // ⚠ This replaces *"a wound type that declares no capability term
    // never impairs"*, which pinned the boolean cliff: a wound either
    // declared a `capability` term and crossed its threshold, or the slot
    // was perfectly fine. A severity-3 gash on the hand left the grip
    // untouched, and two wounds each just under the line were free.
    //
    // Every type now declares a RATE, and `laceration` is deliberately the
    // lowest of them (0.2) — a cut is mostly a bleed. So a small one is
    // free and a terrible one is not, which is the honest shape.
    const creature = anatomicalCreature();
    const cut: Trauma = {
      kind: 'trauma',
      type: 'laceration',
      site: 'body.arm.left.hand',
      severity: 1,
      bleeding: true,
    };
    creature.afflict(cut);
    expect(creature.isSlotImpairedByCondition('grip')).toBe(false);

    // ⚠ 3 lands exactly on `impaired` (1 − 3 × 0.2 = 0.4) and an impaired
    // hand can still close — the slot goes at `failing`, which is the
    // band below. It takes a gash past 3 to actually cost the grip.
    cut.severity = 3;
    expect(creature.functionAt('body.arm.left.hand')).toBe('impaired');
    expect(creature.isSlotImpairedByCondition('grip')).toBe(false);

    cut.severity = 4;
    expect(creature.functionAt('body.arm.left.hand')).toBe('failing');
    expect(creature.isSlotImpairedByCondition('grip')).toBe(true);
  });

  it('⭐ …and wounds COMPOSE — two half-wounds are not free', () => {
    // The cliff's worst case: two wounds that each sat just under the
    // threshold cost nothing at all, however many of them there were.
    const creature = anatomicalCreature();
    creature.afflict({
      kind: 'trauma',
      type: 'fracture',
      site: 'body.arm.left.hand',
      severity: 0.4,
    });
    expect(creature.isSlotImpairedByCondition('grip')).toBe(false);
    creature.afflict({
      kind: 'trauma',
      type: 'fracture',
      site: 'body.arm.left.hand',
      severity: 0.4,
    });
    // 2 × 0.4 × 1.2 = 0.96 — the hand is nearly gone, and under the old
    // rule neither wound had reached 0.5 so both were free.
    expect(creature.isSlotImpairedByCondition('grip')).toBe(true);
  });
});
