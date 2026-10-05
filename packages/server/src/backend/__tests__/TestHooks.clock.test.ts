/**
 * `TestHooks.advanceClock` / `clockNow` — ⭐⭐ **the clock seam that is
 * OUTSIDE the fiction**, and the reason it is here rather than in the
 * game.
 *
 * The taps build first put `WorldClockApi` on the `eval` sandbox's
 * allowlist so a drive could skip a season. That was wrong three ways,
 * and two of them are pinned here:
 *
 *  1. a clock jump is **scaffolding, not a capability** — so it is
 *     gated on *what process this is*, never on who is asking;
 *  2. and the sandbox route could not have worked anyway, because an
 *     `eval` always runs inside a boundary (a quarantined circle, or a
 *     parcel-bound jurisdiction) and a jump of GLOBAL time is exactly
 *     what a bounded context must not do. ⭐ `advanceClock` runs on a
 *     fresh ROOT frame, which carries neither — that is the whole
 *     mechanism, so it is asserted rather than assumed.
 */

import '../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestHooks } from '../TestHooks';
import { WorldClockApi } from '../../mud/api/worldclock';
import { ExecutionContextApi } from '../../mud/api/execution-context';

const DAY_S = 86_400;

describe('TestHooks.advanceClock', () => {
  beforeEach(() => {
    WorldClockApi._resetForTesting();
    process.env.AUTH_MODE = 'test';
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
    process.env.AUTH_MODE = 'test';
  });

  it('moves world-time and reports both sides of the jump', async () => {
    const moved = await TestHooks.advanceClock('3 days');
    expect(moved.after - moved.before).toBeCloseTo(3 * DAY_S, 3);
    expect(TestHooks.clockNow()).toBeCloseTo(moved.after, 3);
  });

  it('⭐ a ZERO jump is a legal no-op', async () => {
    const moved = await TestHooks.advanceClock('0 seconds');
    expect(moved.after - moved.before).toBe(0);
  });

  it('⚠ surfaces the clock\'s OWN refusal rather than swallowing it', async () => {
    // The route hands this message straight back to the caller. Losing
    // it is how the old eval route stayed undiagnosed for three rounds.
    await expect(TestHooks.advanceClock('next tuesday')).rejects.toThrow(
      /cannot parse duration/i,
    );
  });

  it('⚠ and refuses while the clock is PAUSED, in words', async () => {
    WorldClockApi.pause();
    await expect(TestHooks.advanceClock('1 day')).rejects.toThrow(
      /paused/i,
    );
    WorldClockApi.resume();
  });

  describe('⛔ the gate is WHAT PROCESS THIS IS, not who is asking', () => {
    it('refuses outright when AUTH_MODE is not test', async () => {
      delete process.env.AUTH_MODE;
      await expect(TestHooks.advanceClock('1 day')).rejects.toThrow(
        /test-only/i,
      );
      expect(() => TestHooks.clockNow()).toThrow(/test-only/i);
    });
  });

  describe('⭐⭐ it runs on a fresh ROOT — no scope, no jurisdiction', () => {
    it('sheds a quarantined circle scope', async () => {
      // ⭐ The decisive property. `assertNotQuarantined` refuses a clock
      // mutation from inside a circle, so if `advanceClock` inherited
      // its caller's context this would throw — and that is precisely
      // what killed the in-world `eval` route.
      const before = WorldClockApi.getNow().rawValue();
      await ExecutionContextApi.runRootGuarded(
        null,
        'sandbox.runScoped',
        async () => {
          await TestHooks.advanceClock('2 days');
        },
        'rethrow',
        { circleScope: '/home/somebody' },
      );
      expect(WorldClockApi.getNow().rawValue() - before).toBeCloseTo(
        2 * DAY_S,
        3,
      );
    });

    it('sheds a parcel-bound jurisdiction', async () => {
      const before = WorldClockApi.getNow().rawValue();
      await ExecutionContextApi.runRootGuarded(
        null,
        'sandbox.runGoverned',
        async () => {
          await TestHooks.advanceClock('1 day');
        },
        'rethrow',
        { jurisdictionBound: '/world/_test/field' },
      );
      expect(WorldClockApi.getNow().rawValue() - before).toBeCloseTo(
        DAY_S,
        3,
      );
    });
  });
});
