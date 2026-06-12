/**
 * Creature — the body layer between Agent and Character. These tests
 * prove the body/agency split: a bare Creature carries the body
 * surface (organism, anatomy slots, containment, description) but NOT
 * agency (movement, message receipt, command execution), and Character
 * sits above Creature in the hierarchy.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../Creature';
import { Character } from '../../character/Character';
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
    expect(MixinApi.isNamed(creature)).toBe(true);
    expect(MixinApi.hasMixin(creature, Mixins.Sexed)).toBe(true);
    expect(MixinApi.hasMixin(creature, Mixins.Slotted)).toBe(true);
    expect(MixinApi.hasMixin(creature, Mixins.Posed)).toBe(true);
  });

  it('does NOT carry agency (no movement / message receipt)', () => {
    const creature = makeStuff(() => new Creature());
    // Agency mixins live on Character, not Creature.
    expect(MixinApi.isMobile(creature)).toBe(false);
    expect(MixinApi.isSensor(creature)).toBe(false);
  });

  it('Character sits above Creature in the hierarchy', () => {
    expect(Character.prototype instanceof Creature).toBe(true);
  });
});
