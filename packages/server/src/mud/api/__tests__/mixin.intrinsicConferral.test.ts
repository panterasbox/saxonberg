/**
 * Species intrinsic conferral (Step 3.3) — the innate leg.
 *
 * `getActiveMixins` / `collectAugmentConferralNames` union conferral
 * names from BOTH slot augments AND the actor's species, so a gated
 * mixin is active when composed AND (an augment confers it OR the
 * species confers it). A born-attuned species activates `AetherMixin`
 * with no implant; an ordinary species stays inert.
 */

import "../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { MixinApi } from '../mixin';
import { AetherMixin } from '../../lib/message/Aether';
import { AugmentMixin } from '../../lib/augmentation/Augment';
import { SlottedMixin } from '../../lib/slot/Slotted';
import { SlottableMixin } from '../../lib/slot/Slottable';
import Thing from '../../lib/stuff/Thing';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

// A species double exposing just the structural surface
// `collectAugmentConferralNames` duck-types against.
function speciesDouble(innate: string[]) {
  return { getInnateMixins: () => innate };
}

// Attuned-by-species: composes the gated AetherMixin, species confers it.
class BornAttuned extends AetherMixin(Thing) {
  getSpecies() {
    return speciesDouble(['AetherMixin']);
  }
}

// Ordinary: composes the gated AetherMixin, species confers nothing.
class Ordinary extends AetherMixin(Thing) {
  getSpecies() {
    return speciesDouble([]);
  }
}

// An aether-conferring augment for the union case (Slottable so it can
// occupy a slot).
class AetherAug extends AugmentMixin(SlottableMixin(Thing)) {
  override confers(): readonly string[] {
    return ['AetherMixin'];
  }
}

// Both an augment slot AND a conferring species.
class UnionActor extends SlottedMixin(AetherMixin(Thing)) {
  override staticSlots = [
    { name: 'cranial', accepts: 'SlottableMixin' as const },
  ];
  getSpecies() {
    return speciesDouble(['AetherMixin']);
  }
}

describe('species intrinsic conferral', () => {
  it('a born-attuned species activates AetherMixin with no implant', () => {
    const actor = makeStuff(() => new BornAttuned());
    expect(MixinApi.isActive(actor, 'AetherMixin')).toBe(true);
  });

  it('an ordinary species leaves the gated mixin inert', () => {
    const actor = makeStuff(() => new Ordinary());
    expect(MixinApi.isActive(actor, 'AetherMixin')).toBe(false);
  });

  it('augment ⊕ species conferral is idempotent (still active)', () => {
    const actor = makeStuff(() => new UnionActor());
    const aug = makeStuff(() => new AetherAug());
    actor.occupy(aug, 'cranial');
    expect(MixinApi.isActive(actor, 'AetherMixin')).toBe(true);
  });
});
