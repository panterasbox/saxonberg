/**
 * `TestHarnessApi` — test-world staging, the one implementation behind
 * the harness routes and the `testharness` command.
 *
 * ⛔ The span rule is pinned at the Api, below both doors: a jump past
 * one game day is refused BEFORE it moves anything unless the caller is
 * a soak run. And every static here must be `@TestOnly`, so a seam added
 * later cannot forget the mark and go live in a world somebody plays in.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestHarnessApi } from '../test-harness';
import { WorldClockApi } from '../worldclock';
import { SecurityApi } from '../security';

const DAY_S = 86_400;

describe('TestHarnessApi', () => {
  beforeEach(() => WorldClockApi._resetForTesting());
  afterEach(() => WorldClockApi._resetForTesting());

  describe('advanceClock — the line is one game day', () => {
    it('a day or less moves the clock', async () => {
      const a = await TestHarnessApi.advanceClock('20 hours');
      expect(a.after - a.before).toBeCloseTo(20 * 3600, 3);
      const b = await TestHarnessApi.advanceClock('1 day');
      expect(b.after - b.before).toBeCloseTo(DAY_S, 3);
    });

    it('⛔ past a day is a span step: refused, naming the rule and the fix', async () => {
      await expect(TestHarnessApi.advanceClock('25 hours')).rejects.toThrow(
        /SPAN step.*one game day.*No merge waits on the clock.*\.soak\..*wire:soak/s,
      );
    });

    it('⭐ the refusal leaves the clock where it was', async () => {
      const before = TestHarnessApi.clockNow();
      await expect(TestHarnessApi.advanceClock('2 days')).rejects.toThrow();
      expect(TestHarnessApi.clockNow()).toBeCloseTo(before, 0);
    });

    it('a soak run is let through', async () => {
      const j = await TestHarnessApi.advanceClock('2 days', { soak: true });
      expect(j.after - j.before).toBeCloseTo(2 * DAY_S, 3);
      expect(typeof j.settledMs).toBe('number');
    });

    it('the clock\'s own refusals still come back', async () => {
      await expect(TestHarnessApi.advanceClock('soon')).rejects.toThrow(
        /cannot parse duration/,
      );
    });

    it('the cap is a day in seconds', () => {
      expect(TestHarnessApi.BLOCKING_JUMP_CAP_S).toBe(DAY_S);
    });
  });

  it('⭐ every static function on TestHarnessApi is @TestOnly', () => {
    const marked = SecurityApi.getTestOnlyMembers(TestHarnessApi);
    const statics = Object.getOwnPropertyNames(TestHarnessApi).filter(
      (n) =>
        typeof (TestHarnessApi as unknown as Record<string, unknown>)[n] ===
        'function',
    );
    expect(statics.length).toBeGreaterThan(0);
    for (const name of statics) {
      expect(marked?.has(name), `${name} is not @TestOnly`).toBe(true);
    }
  });
});
