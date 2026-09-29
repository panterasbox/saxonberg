/**
 * ⭐⭐ **A mark says whose work or whose herd a thing is — which is not
 * a question you can ask about a person.**
 *
 * `BrandedMixin` composed on `Creature` from the ranching build, on the
 * argument that branding livestock is what marks were invented for.
 * The argument is right and the host was wrong: `Creature` is the base
 * of `Character`, so the same line put a maker's mark on every player
 * Avatar, every Cast member, every Extra, every Shade and every corpse
 * in the game. Nothing on that stack ever read it, so nothing failed —
 * which is exactly why it survived: the panel that would have shown it
 * (`wiki branded`) was reading a dead scan root.
 *
 * The base-class narrowing build moved it to the two hosts the argument
 * actually points at. This test is the claim, stated so it can fail.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { Creature } from '../Creature';
import { KeptAnimal } from '../KeptAnimal';
import { Character } from '../../character/Character';
import { Corpse } from '../../../platform/agent/Corpse';

describe('⭐⭐ Branded is on the animal rungs, not on every body', () => {
  it('a kept animal can carry a mark', () => {
    expect(MixinApi.hasMixin(KeptAnimal, Mixins.Branded)).toBe(true);
  });

  it('⚠ a bare Creature cannot — the mark is not a property of being alive', () => {
    expect(MixinApi.hasMixin(Creature, Mixins.Branded)).toBe(false);
  });

  it('⭐ a PERSON is nobody\'s product', () => {
    expect(MixinApi.hasMixin(Character, Mixins.Branded)).toBe(false);
  });

  it('⭐ and a corpse is nobody\'s stock', () => {
    expect(MixinApi.hasMixin(Corpse, Mixins.Branded)).toBe(false);
  });

  it('Chattel stays on Creature — ownable and marked are different questions', () => {
    // D98: a stolen animal keeps its chain of title, which is what makes
    // fencing the hard part. That argument never reached `Character`'s
    // problem, and it is not this build's to re-open.
    expect(MixinApi.hasMixin(Creature, Mixins.Chattel)).toBe(true);
  });
});
