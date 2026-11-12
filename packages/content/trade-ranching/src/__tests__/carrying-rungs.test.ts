/**
 * ⭐ Who carries (size and carrying W8): a working animal does — a harness,
 * a pack saddle — and a head of stock does not. The pack composes the
 * kernel's `CarryingMixin` by specifier; `Livestock` gets only the body's
 * rule (nothing loose), from `Creature`.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mixins } from '@saxonberg/server/mud/lib/mixin';
import Livestock from '../agent/Livestock';
import WorkingAnimal from '../agent/WorkingAnimal';

describe('⭐ the carrying capability composes only where a body carries', () => {
  it('a working animal carries', () => {
    expect(MixinApi.hasMixin(WorkingAnimal, Mixins.Carrying)).toBe(true);
  });

  it('a head of stock does not', () => {
    expect(MixinApi.hasMixin(Livestock, Mixins.Carrying)).toBe(false);
  });
});
