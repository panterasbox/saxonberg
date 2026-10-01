/**
 * `WorldClockApi.advance` — the seam that lets somebody inside the game
 * move world-time forward, and the one thing it must get right: **the
 * skipped interval is DRAINED, not skipped.**
 *
 * The taps build opened it (D12) because the systems it ships are
 * reconcile-on-read — a sap run, a lactation curve, a fleece's year all
 * derive from elapsed game-time and need nothing from the clock — but a
 * scheduled act does, and a jump that silently dropped every schedule in
 * the interval would make the drive a liar. So a one-shot in the skipped
 * window fires once, and an `every` fires once per missed period.
 *
 * ⚠ Distinct from `_advanceForTesting`, which moves the INJECTED REAL
 * clock. `advance` moves the game-time anchor and leaves the real clock
 * where it is, which is what makes it usable from a running world.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../../../api/execution-context';

const DAY_S = 86_400;

describe('WorldClockApi.advance', () => {
  beforeEach(() => {
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    StuffApi.clearAll();
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('moves game-time forward by exactly what it was asked for', () => {
    const before = WorldClockApi.getNow().rawValue();
    WorldClockApi.advance(Quantity.of(DAY_S, 's'));
    expect(WorldClockApi.getNow().rawValue() - before).toBeCloseTo(DAY_S, 3);
  });

  it("parses a duration string in `after()`'s own format", () => {
    const before = WorldClockApi.getNow().rawValue();
    WorldClockApi.advance('1 day');
    expect(WorldClockApi.getNow().rawValue() - before).toBeCloseTo(DAY_S, 3);

    const mid = WorldClockApi.getNow().rawValue();
    WorldClockApi.advance('5 minutes');
    expect(WorldClockApi.getNow().rawValue() - mid).toBeCloseTo(300, 3);
  });

  it('⚠ refuses to run time backwards, and a zero jump is a no-op', () => {
    expect(() => WorldClockApi.advance(Quantity.of(-60, 's'))).toThrow(
      /only runs forward/,
    );
    const before = WorldClockApi.getNow().rawValue();
    WorldClockApi.advance(Quantity.of(0, 's'));
    expect(WorldClockApi.getNow().rawValue()).toBeCloseTo(before, 3);
  });

  it('⭐⭐ DRAINS the interval: a one-shot inside it fires exactly once', () => {
    let fired = 0;
    WorldClockApi.after(Quantity.of(600, 's'), () => fired++);
    WorldClockApi.advance('1 day');
    expect(fired).toBe(1);
    // …and the jump does not re-fire a spent one-shot.
    WorldClockApi.advance('1 day');
    expect(fired).toBe(1);
  });

  it('a one-shot BEYOND the jump does not fire early', () => {
    let fired = 0;
    WorldClockApi.after(Quantity.of(2 * DAY_S, 's'), () => fired++);
    WorldClockApi.advance('1 day');
    expect(fired).toBe(0);
    WorldClockApi.advance('1 day');
    expect(fired).toBe(1);
  });

  it('⭐ an `every` fires once per MISSED period, not once in total', () => {
    let fired = 0;
    WorldClockApi.every(Quantity.of(DAY_S / 4, 's'), () => fired++);
    WorldClockApi.advance('1 day');
    // Four quarter-days land inside a one-day jump.
    expect(fired).toBe(4);
    WorldClockApi.advance('1 day');
    expect(fired).toBe(8);
  });

  it('fires the skipped schedules in deadline order', () => {
    const order: string[] = [];
    WorldClockApi.after(Quantity.of(3_000, 's'), () => order.push('late'));
    WorldClockApi.after(Quantity.of(60, 's'), () => order.push('early'));
    WorldClockApi.after(Quantity.of(600, 's'), () => order.push('middle'));
    WorldClockApi.advance('1 day');
    expect(order).toEqual(['early', 'middle', 'late']);
  });

  it('⭐ a callback that RE-ARMS relative to now lands after the jump', () => {
    // The honest semantics, and worth pinning because the intuition goes
    // the other way: a cascade (a tick that schedules the next tick off
    // `now`) does NOT catch up through a jump. The drain fires the
    // generation that was already due; the one it arms is 60s past the
    // jumped `now`, so it is genuinely in the future. An `every` is the
    // shape that catches up, which is why the recurring systems use one.
    let fired = 0;
    const chain = (): void => {
      fired++;
      if (fired < 5) WorldClockApi.after(Quantity.of(60, 's'), chain);
    };
    WorldClockApi.after(Quantity.of(60, 's'), chain);
    WorldClockApi.advance('1 day');
    expect(fired).toBe(1);
    // …and the next generation is armed and waiting, not lost.
    WorldClockApi.advance('1 day');
    expect(fired).toBe(2);
  });

  it('⚠ REFUSES while the clock is paused — a paused jump cannot drain', () => {
    // A paused clock fires nothing, so a jump taken here would bank the
    // game-time and strand every schedule in the interval: the silent
    // skip the drain exists to prevent. `resume()` first.
    let fired = 0;
    WorldClockApi.after(Quantity.of(600, 's'), () => fired++);
    WorldClockApi.pause();
    const before = WorldClockApi.getNow().rawValue();
    expect(() => WorldClockApi.advance('1 day')).toThrow(/paused/);
    expect(WorldClockApi.getNow().rawValue()).toBeCloseTo(before, 3);
    expect(fired).toBe(0);

    WorldClockApi.resume();
    WorldClockApi.advance('1 day');
    expect(fired).toBe(1);
  });

  it('⚠⚠ the drain fires under the WORLD\u2019s scope, not the caller\u2019s', () => {
    // ⭐⭐ **A live drive found this one, and it crashed the server.** A
    // bare `onHeartbeat()` inherits the caller's execution context, so
    // an `advance` run from inside the `eval` sandbox fired a world
    // schedule in the EVAL's circle scope, hit the sandbox boundary on
    // an ordinary world object, and took the process down with an
    // unhandled rejection.
    //
    // A drained schedule belongs to the world, not to whoever moved the
    // clock — which is what the live heartbeat already does in
    // `rearmHeartbeat`. ⚠ This test cannot see a circle scope directly,
    // so what it pins is the observable half: the callback runs under a
    // root attributed to the clock rather than under whatever frame
    // called `advance`.
    let sawScope: string | null | undefined;
    WorldClockApi.after(Quantity.of(60, 's'), () => {
      sawScope = ExecutionContextApi.getCircleScope();
    });
    WorldClockApi.advance('1 day');
    expect(sawScope).toBe(OMNI_SCOPE);
  });
});
