/**
 * Beast and DraftAnimal — an animal is not a person.
 *
 * ⚠⚠ The wolf was an `Extra`, the horse and the pony were
 * `HaulingCreature`s, and `Extra` and `HaulingCreature` are both
 * `Character`s. So all three composed `CasterMixin`, `MemorizedMixin`,
 * `EmployedMixin`, `PersonaMixin`, `CommandGiverMixin`,
 * `AdvancementMixin`, `SoulMixin` and `VocalMixin`: a pit pony that
 * could cast a spell, hold a job, claim a written bio and type commands.
 *
 * ⭐ Nothing ever called any of it, which is why it survived — the
 * defect was in what the classes CLAIMED, and a claim is the author
 * surface.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../../lib/mixin';
import { Animate } from '../../../lib/creature/Animate';
import { Character } from '../../../lib/character/Character';
import Beast from '../Beast';
import DraftAnimal from '../DraftAnimal';

/** The fifteen that make a body somebody. A beast has none of them. */
const PERSON = [
  Mixins.CommandGiver,
  Mixins.Persona,
  Mixins.Employed,
  Mixins.Caster,
  Mixins.Memorized,
  Mixins.Vocal,
  Mixins.Soul,
  Mixins.Advancement,
  Mixins.Perceiver,
  Mixins.BeliefStore,
  Mixins.Gendered,
  Mixins.Dispositioned,
  Mixins.Status,
  Mixins.Hiding,
  Mixins.Costumed,
] as const;

describe('⭐⭐ Beast — an animal that is nobody', () => {
  it('is Animate: it moves, fights, is engaged and receives scenes', () => {
    for (const m of [
      Mixins.Sensor,
      Mixins.Engaged,
      Mixins.Mobile,
      Mixins.Perception,
      Mixins.Combatant,
    ]) {
      expect(MixinApi.hasMixin(Beast, m), `a beast should ${m}`).toBe(true);
    }
    expect(Object.create(Beast.prototype)).toBeInstanceOf(Animate);
  });

  it('has a brain — `talk to wolf` stays afforded, and the refusal stays diegetic', () => {
    // Without `Behaved` the dialogue verb would be refused at the
    // BINDER, which the player cannot read. With it, the controller
    // answers, which they can.
    expect(MixinApi.hasMixin(Beast, Mixins.Behaved)).toBe(true);
  });

  it('⚠⚠ and composes NONE of the fifteen person mixins', () => {
    for (const m of PERSON) {
      expect(
        MixinApi.hasMixin(Beast, m),
        `a wolf must not ${m} — it was an Extra, and an Extra is a PERSON`,
      ).toBe(false);
    }
  });

  it('⭐ is not a Character, and that is the whole move', () => {
    expect(Object.create(Beast.prototype)).not.toBeInstanceOf(Character);
  });
});

describe('⭐ DraftAnimal — a beast in the shafts', () => {
  it('hauls and can be ridden', () => {
    expect(MixinApi.hasMixin(DraftAnimal, Mixins.Hauler)).toBe(true);
    expect(MixinApi.hasMixin(DraftAnimal, Mixins.Mountable)).toBe(true);
  });

  it('⚠⚠ a plain Beast does NEITHER — the two arg gates this protects', () => {
    // `hitch.yaml:35` gates its target on `HaulerMixin` and is its only
    // reader; `mount.yaml:21` gates on `MountableMixin`, and composing
    // Mountable MINTS a mount slot. On `Beast` the binder would accept
    // `hitch cart to wolf` and `mount wolf`, and the refusals would move
    // from an honest gate to breakaway physics and an empty slot.
    expect(MixinApi.hasMixin(Beast, Mixins.Hauler)).toBe(false);
    expect(MixinApi.hasMixin(Beast, Mixins.Mountable)).toBe(false);
  });

  it('is still nobody', () => {
    for (const m of PERSON) {
      expect(MixinApi.hasMixin(DraftAnimal, m), `a horse must not ${m}`).toBe(
        false,
      );
    }
  });

  it('⭐ a PERSON still hauls — `Hauler` is composed twice, on purpose', () => {
    // Every person self-hauls; a draft animal hauls; a wolf does not.
    // Three answers, so the mixin cannot live on one shared rung.
    expect(MixinApi.hasMixin(Character, Mixins.Hauler)).toBe(true);
  });
});
