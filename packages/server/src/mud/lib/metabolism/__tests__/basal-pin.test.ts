/**
 * ⚠⚠ **AC 18 — nothing is sharpened at the player.** (docs/subsystems/behavior.md § the `eats` brain.)
 *
 * The `eats` brain makes NPC hunger exist for the first time: satiation
 * is reconcile-on-read and nothing has ever read an NPC's. The obvious
 * temptation while building that is to "tune" the drain so the morning
 * beat feels right — and every one of those constants is shared with
 * every player character in the world.
 *
 * So this file pins them. It asserts nothing about NPCs and nothing about
 * bread. It exists to fail loudly if a later hand nudges a number because
 * a brain's cadence did not feel right, which is the cheapest possible
 * guard against a build about baking quietly making everybody hungrier.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { METABOLIC_DEFAULTS } from '../Metabolic';

describe('the metabolic constants the grain chain must not touch', () => {
  it('⭐ the basal drain is unchanged', () => {
    // Per GAME-minute, of 100%. 83 game-hours to empty at rest.
    expect(METABOLIC_DEFAULTS.BASAL_SATIATION_PER_MIN).toBe(0.02);
  });

  it('⭐ a portion is unchanged', () => {
    expect(METABOLIC_DEFAULTS.EAT_PORTION_LITRES).toBe(0.4);
  });

  it("a player's time-to-empty at basal rate is unchanged", () => {
    const minutesToEmpty = 100 / METABOLIC_DEFAULTS.BASAL_SATIATION_PER_MIN;
    expect(minutesToEmpty).toBe(5000); // ~83 game-hours, ~3.5 game-days
  });

  it('the lethal dwell and the dying window are unchanged', () => {
    // ⚠ Starvation CAN kill: 24 game-hours dwelling at a floored reserve
    // begins the dying clock. The `eats` brain does not make that
    // reachable — see `eats.test.ts` — but the numbers are pinned here
    // because a build that made them reachable would want to soften
    // them, and softening them is exactly what AC 18 forbids.
    expect(METABOLIC_DEFAULTS.STARVATION_LETHAL_SEC).toBe(24 * 3600);
    expect(METABOLIC_DEFAULTS.DEHYDRATION_LETHAL_SEC).toBe(8 * 3600);
  });
});
