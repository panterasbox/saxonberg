/**
 * check-instanceable-placement's invariant 7, the pure decision: under
 * `/trade/<industry>/` an instanceable template sits under `obj/` or
 * `command/`; anything without a `class:` (a folder row, a recipe-shaped
 * leaf) is nobody's business; paths outside `/trade/` are untouched.
 */

import { describe, it, expect } from 'vitest';
import { tradePlacementOk } from '../check-instanceable-placement';

describe('check-instanceable-placement.tradePlacementOk', () => {
  it('an instanceable row under <root>/<branch>/ passes', () => {
    expect(tradePlacementOk('/trade/smithing/thing/anvil', true)).toBe(true);
    expect(tradePlacementOk('/trade/smithing/idea/cmd/TemperController', true)).toBe(true);
    expect(tradePlacementOk('/platform/idea/cmd/perception/LookController', true)).toBe(true);
    expect(tradePlacementOk('/stuff/thing/gear/hat', true)).toBe(true);
  });

  it('an instanceable row with no branch segment under a rooted tree is reported', () => {
    expect(tradePlacementOk('/trade/smithing/anvil', true)).toBe(false);
    expect(tradePlacementOk('/trade/smithing/stock/iron-ingot', true)).toBe(false);
    expect(tradePlacementOk('/platform/AccessRegistry', true)).toBe(false);
    expect(tradePlacementOk('/stuff/gear/hat', true)).toBe(false);
  });

  it('a row with no class (a folder, a document-shaped leaf) and anything outside /trade/ are ignored', () => {
    expect(tradePlacementOk('/trade/smithing', false)).toBe(true);
    expect(tradePlacementOk('/trade/smithing/stock', false)).toBe(true);
    expect(tradePlacementOk('/test/x/anvil', true)).toBe(true);
    expect(tradePlacementOk('/stuff/thing/gear/hat', true)).toBe(true);
  });
});
