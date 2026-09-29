/**
 * Movable — the goods rung.
 *
 * ⭐ The point of this file is the PAIR: `Movable` composes `Chattel` and
 * `Concealable`, and `Thing` does not. The sibling assertion in
 * `Thing.test.ts` is the other half, and neither is meaningful alone —
 * both mixins sat on the `Thing` root until 2026-09-29, so a test that
 * only checked `Movable` would have passed against the defect.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import Thing from '../Thing';
import Movable from '../Movable';
import { Stuff } from '../Stuff';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('Movable', () => {
  it('is a Thing — it traces the branch root', () => {
    const movable = makeStuff(() => new Movable());
    expect(movable).toBeInstanceOf(Thing);
    expect(movable).toBeInstanceOf(Stuff);
  });

  it('composes Chattel and Concealable — the two claims of portability', () => {
    const movable = makeStuff(() => new Movable());
    expect(MixinApi.isChattel(movable)).toBe(true);
    expect(MixinApi.isConcealable(movable)).toBe(true);
  });

  it('keeps everything the matter root carries', () => {
    const movable = makeStuff(() => new Movable());
    expect(MixinApi.isContainable(movable)).toBe(true);
    expect(MixinApi.isTangible(movable)).toBe(true);
    expect(MixinApi.isPerceptible(movable)).toBe(true);
    expect(MixinApi.isVisible(movable)).toBe(true);
    expect(MixinApi.isDetailed(movable)).toBe(true);
  });
});
