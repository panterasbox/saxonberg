/**
 * StunBaton — the composition contract after the combat-hooks Phase-3
 * migration: `EnergizedMixin` composes `CombatReactiveMixin` (the nested
 * factory, DECISION H), so every Energized source IS a combat-reactive
 * instrument — the engine's carrier scan lights up on a wielded baton
 * and the consequence drain delivers the shock. The behavioral half (a
 * landed hit's inflict→shockContact ordering, the switched-off guard)
 * lives in `obj/api/__tests__/CombatLogic.hooks.test.ts`; the pinned
 * matchup in `scripts/__tests__/combat-gym.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import { makeStuff } from '../../security/__tests__/test-setup';
import { MixinApi } from '../../../api/mixin';
import StunBaton from '../StunBaton';
import LiveWire from '../LiveWire';

describe('StunBaton — the instrument-seam composition (Phase 3)', () => {
  it('narrows as BOTH Energized and CombatReactive (the nested-factory marker walk)', () => {
    const baton = makeStuff(() => new StunBaton());
    expect(MixinApi.isEnergized(baton)).toBe(true);
    expect(MixinApi.isCombatReactive(baton)).toBe(true);
  });

  it('every Energized source carries the seam — a LiveWire too (harmless: never a strike carrier)', () => {
    const wire = makeStuff(() => new LiveWire());
    expect(MixinApi.isEnergized(wire)).toBe(true);
    expect(MixinApi.isCombatReactive(wire)).toBe(true);
  });
});
