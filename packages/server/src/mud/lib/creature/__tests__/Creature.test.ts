/**
 * Creature — the body layer between Agent and Character. These tests
 * prove the body/agency split: a bare Creature carries the body
 * surface (organism, anatomy slots, containment, description) but NOT
 * agency (movement, message receipt, command execution), and Character
 * sits above Creature in the hierarchy.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../Creature';
import { Character } from '../../character/Character';
import Cast from '../../../platform/agent/Cast';
import Extra from '../../../platform/agent/Extra';
import Corpse from '../../../platform/agent/Corpse';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('Creature — the body layer', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it('carries the body surface (organism + anatomy + containment + description)', () => {
    const creature = makeStuff(() => new Creature());
    expect(MixinApi.isOrganism(creature)).toBe(true);
    expect(MixinApi.isContainer(creature)).toBe(true);
    expect(MixinApi.isVisible(creature)).toBe(true);
    // ⭐⭐ **Addressable, not named.** Every body can be referred to by
    // keyword — `look wolf`, `pet collie` — and 48 shipped agent rows
    // had been authoring `primaryKeyword:` into a void until this
    // composed (2026-09-10).
    expect(MixinApi.isPerceptible(creature)).toBe(true);
    // ⚠ And NOT Named: a body is not a somebody. A proper name is
    // composed deliberately, by `CastMixin`, by `Avatar`, or by a class
    // that mints one of its own (a pet, a named artefact). A wolf, a
    // corpse and a head of stock used to carry `setSurname`.
    expect(MixinApi.isNamed(creature)).toBe(false);
    // ⚠ `Sexed` retired — sex is a facet of Organism now (the mixin
    // was merged to reclaim a slot in CreatureBase's inference budget).
    expect(MixinApi.hasMixin(creature, Mixins.Organism)).toBe(true);
    expect(MixinApi.hasMixin(creature, Mixins.Slotted)).toBe(true);
    expect(MixinApi.hasMixin(creature, Mixins.Posed)).toBe(true);
  });

  it('does NOT carry agency (no movement / message receipt)', () => {
    const creature = makeStuff(() => new Creature());
    // Agency mixins live on Character, not Creature.
    expect(MixinApi.isMobile(creature)).toBe(false);
    expect(MixinApi.isSensor(creature)).toBe(false);
  });

  it('⭐ the rungs that DO carry a proper name say so themselves', () => {
    // The whole point of the move: composing Named is an act on one
    // class, and the classes that do it are the ones a proper name
    // belongs to.
    expect(MixinApi.hasMixin(Cast, Mixins.Named)).toBe(true);
    expect(MixinApi.hasMixin(Extra, Mixins.Named)).toBe(false);
    expect(MixinApi.hasMixin(Corpse, Mixins.Named)).toBe(false);
  });

  it('Character sits above Creature in the hierarchy', () => {
    expect(Character.prototype instanceof Creature).toBe(true);
  });

  it('composes RespirationMixin with the default air-breathing config', () => {
    const creature = makeStuff(() => new Creature());
    expect(MixinApi.isRespiration(creature)).toBe(true);
    expect(creature.getBreathableMedia()).toEqual(['air']);
    expect(creature.isRespiring()).toBe(true);
  });
});
