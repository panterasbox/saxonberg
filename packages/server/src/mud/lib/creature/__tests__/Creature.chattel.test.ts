/**
 * ⭐⭐ **A person is nobody's property.**
 *
 * `ChattelMixin` composed on `Creature` from the ranching build (D22, D98),
 * on the argument that livestock, pets and future aquaculture want
 * per-instance ownership with chain of title — a stolen animal keeps its
 * provenance and cannot be sold cleanly, which is what makes fencing the
 * hard part.
 *
 * The argument is right and the host was one level too high. `Creature` is
 * the base of `Character`, so the same line declared that every player
 * Avatar, every Cast member, every Extra, every Shade and every corpse in
 * the game is somebody's chattel. Nothing ever stamped one, so nothing
 * failed — the defect was entirely in what the classes CLAIMED, which is
 * the documented author surface and therefore exactly what
 * `callable == visible == cared-about` is about.
 *
 * The base-class narrowing build moved it to the two hosts the argument
 * points at. ⭐ This is the sibling of `Creature.branded.test.ts`; they
 * are one claim told twice, because the same wrong host produced both.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { Creature } from '../Creature';
import { KeptAnimal } from '../KeptAnimal';
import { Character } from '../../character/Character';
import Corpse from '../../../platform/agent/Corpse';
import Cast from '../../../platform/agent/Cast';
import Extra from '../../../platform/agent/Extra';

describe('⭐⭐ Chattel is on the animal rungs, not on every body', () => {
  it('a kept animal is ownable — D22 and D98 intact', () => {
    expect(MixinApi.hasMixin(KeptAnimal, Mixins.Chattel)).toBe(true);
  });

  it('⚠ a bare Creature is not — being alive is not being owned', () => {
    expect(MixinApi.hasMixin(Creature, Mixins.Chattel)).toBe(false);
  });

  it("⭐ a PERSON is nobody's property", () => {
    expect(MixinApi.hasMixin(Character, Mixins.Chattel)).toBe(false);
  });

  it('⭐ and neither is a Cast member or an Extra', () => {
    expect(MixinApi.hasMixin(Cast, Mixins.Chattel)).toBe(false);
    expect(MixinApi.hasMixin(Extra, Mixins.Chattel)).toBe(false);
  });

  it('⭐ a corpse is evidence, not stock', () => {
    expect(MixinApi.hasMixin(Corpse, Mixins.Chattel)).toBe(false);
  });

  it('a kept animal keeps its mark as well as its title', () => {
    // The two moved together and land together — the pair is what makes
    // a head of stock a head of stock.
    expect(MixinApi.hasMixin(KeptAnimal, Mixins.Branded)).toBe(true);
  });
});
