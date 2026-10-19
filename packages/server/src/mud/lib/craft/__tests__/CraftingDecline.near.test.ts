/**
 * ⭐ The near miss (sugar D5): offered something of the same ingredient
 * family, the refusal names it rather than claiming there is nothing.
 */
import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { CraftingDecline } from '../CraftingDecline';

describe('CraftingDecline — the near miss', () => {
  it('names what you offered and the family it shares', () => {
    expect(
      CraftingDecline.messageFor({
        ok: false,
        reason: 'insufficient-input',
        detail: 'sugar',
        near: { name: 'honey', family: 'sweetener' },
      }),
    ).toBe('This wants sugar — honey is a different sweetener.');
  });

  it('without one, the plain shortage', () => {
    expect(
      CraftingDecline.messageFor({ ok: false, reason: 'insufficient-input', detail: 'sugar' }),
    ).toBe("There isn't enough sugar to make that.");
  });
});
