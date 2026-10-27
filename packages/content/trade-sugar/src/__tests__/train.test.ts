/**
 * The Jamaica train (sugar D17) — an assembled fire whose share of the
 * heat reaching its kettles is read off its bill.
 *
 * ⚠ It shipped as `AssembledMixin(Oven)`, which the composition check
 * refuses (an assembly's wear needs a Durable to land on) — and nothing
 * here registered one, so the first a world heard of it was a login that
 * failed. Registering is the test.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import Train from '../thing/Train';

describe('the train', () => {
  it('registers: an assembly that can wear', () => {
    const t = makeStuff(() => new Train());
    expect(MixinApi.isDurable(t)).toBe(true);
  });

  it('with no kettles fitted, takes the floor of the fire', () => {
    const t = makeStuff(() => new Train());
    // Four kettles missing: 0.8 − 4 × 0.15.
    expect(t.getHeatTransferFraction()).toBeCloseTo(0.2, 6);
  });
});
