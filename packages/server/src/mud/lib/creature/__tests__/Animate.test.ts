/**
 * Animate — the rung between the body and the person.
 *
 * ⭐⭐ The claim is a PAIR, and neither half means anything alone: the
 * five moved mixins are on `Animate`, and the fifteen person mixins are
 * NOT. A test that only checked the first would pass against the defect
 * this rung exists to remove — every one of the twenty was on
 * `Character` yesterday.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { Animate } from '../Animate';
import { Creature } from '../Creature';
import { Character } from '../../character/Character';
import Corpse from '../../../platform/agent/Corpse';

const ACTS = [
  Mixins.Sensor,
  Mixins.Engaged,
  Mixins.Mobile,
  Mixins.Perception,
  Mixins.Combatant,
] as const;

/** The fifteen that make a body SOMEBODY. */
const PERSON = [
  Mixins.CommandGiver,
  Mixins.Persona,
  Mixins.Employed,
  Mixins.Vocal,
  Mixins.Caster,
  Mixins.Hauler,
] as const;

describe('⭐⭐ Animate — a body that acts', () => {
  it('composes the five that are true of anything that acts', () => {
    for (const m of ACTS) {
      expect(MixinApi.hasMixin(Animate, m), `Animate should compose ${m}`).toBe(
        true,
      );
    }
  });

  it('⚠⚠ and composes NONE of the person mixins — the fail-open invariant', () => {
    // `CommandGiverMixin` carries fifteen affordance statics: it is the
    // verb surface of *being a thing that types commands*. Every mixin
    // moved down to this rung contributes to the `self` bucket only,
    // which is inert on a non-giver — so this one assertion is what
    // keeps the move from conferring verbs on a horse.
    for (const m of PERSON) {
      expect(
        MixinApi.hasMixin(Animate, m),
        `Animate must NOT compose ${m} — see Animate.ts § What this rung must NEVER compose`,
      ).toBe(false);
    }
  });

  it('is a Creature — the body is still underneath', () => {
    expect(MixinApi.hasMixin(Animate, Mixins.Vitals)).toBe(true);
    expect(MixinApi.hasMixin(Animate, Mixins.Organism)).toBe(true);
    expect(Object.create(Animate.prototype)).toBeInstanceOf(Creature);
  });
});

describe('⭐ the line, read from both ends', () => {
  it('a PERSON still has all twenty — the move is behaviour-identical', () => {
    for (const m of [...ACTS, ...PERSON]) {
      expect(
        MixinApi.hasMixin(Character, m),
        `Character lost ${m} — the re-base was supposed to change nothing for a person`,
      ).toBe(true);
    }
  });

  it('⭐⭐ a CORPSE has none of the five, which is where the line came from', () => {
    // The strongest evidence for the rung, and it is not an authoring
    // count: a corpse composes the whole of `Creature` — vitals,
    // respiration, postmortem — because it is a forensic body, and it
    // does not move, cannot be engaged, receives no scenes, perceives
    // nothing and does not fight. The five this rung adds are exactly
    // the five that are false of a corpse.
    for (const m of ACTS) {
      expect(MixinApi.hasMixin(Corpse, m), `a corpse should not ${m}`).toBe(
        false,
      );
    }
    expect(MixinApi.hasMixin(Corpse, Mixins.Vitals)).toBe(true);
    expect(MixinApi.hasMixin(Corpse, Mixins.Postmortem)).toBe(true);
  });
});
