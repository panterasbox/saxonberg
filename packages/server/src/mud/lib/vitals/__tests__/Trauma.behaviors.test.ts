/**
 * The remaining trauma behaviors (Phase 2) — contusion / burn / avulsion
 * carry live, non-no-op behavior, and a fracture impairs its coupled
 * slot's affordances through the existing `canOccupy` machinery (a derived
 * read that restores as the fracture heals / clears).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Species from '../../../obj/species/Species';
import BodyPlan from '../../../obj/species/BodyPlan';
import Thing from '../../stuff/Thing';
import { SlottableMixin } from '../../slot/Slottable';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { TRAUMA_BEHAVIOR, HARM_DEFAULTS } from '../../../obj/Condition';
import type { Trauma } from '../../../obj/Condition';

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
  stampTemplatePathForTest(plan, '/obj/species/BodyPlan/test-biped');

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, '/obj/species/test/anatomical');

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
    TRAUMA_BEHAVIOR.contusion.tick(host, t, 60);
    expect(t.severity).toBeLessThan(1);
    expect(t.bleeding).toBeUndefined();
    expect(host.getVitalSign('bloodVolume').rawValue()).toBe(start);
  });

  it('burn carries a real, decaying behavior', () => {
    const host = makeStuff(() => new Creature());
    const t: Trauma = {
      kind: 'trauma',
      type: 'burn',
      site: 'body.arm.left',
      severity: 1.5,
    };
    TRAUMA_BEHAVIOR.burn.tick(host, t, 60);
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
    expect(creature.isSlotImpairedByTrauma('grip')).toBe(true);
    expect(creature.canOccupy(item, 'grip')).toBe(false);

    // Heal below the impair threshold → the affordance returns (a derived
    // read, no separate un-impair step).
    fracture.severity = HARM_DEFAULTS.FRACTURE_IMPAIR_SEVERITY - 0.1;
    expect(creature.isSlotImpairedByTrauma('grip')).toBe(false);
    expect(creature.canOccupy(item, 'grip')).toBe(true);

    // Relieving it entirely also restores.
    fracture.severity = HARM_DEFAULTS.FRACTURE_IMPAIR_SEVERITY + 0.5;
    expect(creature.canOccupy(item, 'grip')).toBe(false);
    creature.relieve(fracture);
    expect(creature.canOccupy(item, 'grip')).toBe(true);
  });
});
