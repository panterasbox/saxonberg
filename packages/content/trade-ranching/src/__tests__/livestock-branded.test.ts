/**
 * ⭐ **A head of stock composes its own mark.**
 *
 * `BrandedMixin` reached `Livestock` by inheritance from `Creature`
 * until the base-class narrowing build — and reached every player
 * character with it. `Livestock` does not extend `KeptAnimal` (a head of
 * stock is not a pet), so when the mixin moved to the animal rungs this
 * class had to compose it itself, exactly as it already does with
 * `HandlingMixin`.
 *
 * ⚠ This is the test that would have caught the move being done by half:
 * `KeptAnimal` alone strips the mark from the one class whose docstring
 * was the reason the mixin was ever put on `Creature`.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mixins } from '@saxonberg/server/mud/lib/mixin';
import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import Livestock from '../agent/Livestock';
import WorkingAnimal from '../agent/WorkingAnimal';

describe('⭐ the mark is on the stock, not on everything alive', () => {
  it('Livestock composes Branded itself', () => {
    expect(MixinApi.hasMixin(Livestock, Mixins.Branded)).toBe(true);
  });

  it('a working animal inherits it through KeptAnimal', () => {
    expect(MixinApi.hasMixin(WorkingAnimal, Mixins.Branded)).toBe(true);
  });

  it('⚠ and it is no longer coming from Creature', () => {
    expect(MixinApi.hasMixin(Creature, Mixins.Branded)).toBe(false);
  });
});
