/**
 * Watch — the drifting pocket watch. Reading is null with the lid shut;
 * open, it shows `setTo + running-elapsed * rate`, so it runs a touch
 * slow and drifts off true time. The mainspring `Reserve` depletes
 * against game-time: drained, the hands freeze at the stop-time; wound,
 * the watch resumes.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Watch from '../thing/Watch';
import { Reserve, type Reserved } from '@saxonberg/server/mud/lib/reserve';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mixins } from '@saxonberg/server/mud/lib/mixin';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

const SCALE = 12;
let real = 0;
/** Advance game-time by `gameSec` game-seconds (the Campfire harness). */
function tick(gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
}

function watch(): Watch {
  return makeStuff(() => new Watch());
}

describe('Watch', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('composes Sealable, MechanicalMovement (Timekeeping + Reserved), Detailed', () => {
    const w = watch();
    expect(MixinApi.isSealable(w as never)).toBe(true);
    expect(MixinApi.hasMixin(w as never, Mixins.MechanicalMovement)).toBe(true);
    // MechanicalMovement folds in the read + reserve capabilities.
    expect(MixinApi.isTimekeeping(w as never)).toBe(true);
    expect(MixinApi.hasMixin(w as never, Mixins.Reserved)).toBe(true);
    expect(MixinApi.hasMixin(w as never, Mixins.Detailed)).toBe(true);
  });

  it('reads null while the lid is shut, a time once opened', () => {
    const w = watch();
    expect(w.isOpen()).toBe(false);
    expect(w.currentReading()).toBeNull();
    w.open();
    w.setTime(600); // 10:00
    expect(w.currentReading()?.format()).toBe('10:00');
  });

  it('drifts slow: after elapsed game-time it lags true elapsed', () => {
    const w = watch();
    w.open();
    w.setTime(600); // set to 10:00 at t0
    tick(12000); // 200 game-minutes elapse
    const reading = w.currentReading();
    // rate 0.995 → advances 199 min not 200, so it reads 13:19 not 13:20.
    expect(reading?.minutes).toBe(600 + 199);
    expect(reading?.minutes).toBeLessThan(600 + 200);
  });

  it('freezes at its stop-time when the mainspring drains, and resumes on wind', () => {
    const w = watch();
    w.open();
    // Small mainspring: 600 game-seconds of run capacity.
    (w as unknown as Reserved).setReserve(
      new Reserve(
        'mainspring',
        Quantity.of(600, 's'),
        Quantity.of(600, 's'),
        'mechanical',
        'stopped',
      ),
    );
    w.setTime(600); // 10:00

    tick(300); // runs 300s → 5 min * 0.995
    const running = w.currentReading();
    expect(running?.minutes).toBe(600 + Math.floor((300 * 0.995) / 60)); // 604

    tick(600); // only 300s of spring left → floors here
    const stopped = w.currentReading();
    expect(w.mainspringRemaining()).toBe(0);
    // Full 600s consumed (300 + 300) → advanced ~9 min.
    expect(stopped?.minutes).toBe(600 + Math.floor((600 * 0.995) / 60)); // 609

    tick(3000); // more game-time, but the spring is dead
    const frozen = w.currentReading();
    expect(frozen?.minutes).toBe(stopped?.minutes); // held at stop-time

    w.wind(); // refill the mainspring
    expect(w.mainspringRemaining()).toBe(600);
    tick(300); // ticks again from where it stopped
    const resumed = w.currentReading();
    expect(resumed?.minutes).toBeGreaterThan(frozen?.minutes ?? 0);
  });

  it('renders the live reading into the long description; hides it when shut', () => {
    const w = watch();
    w.open();
    w.setTime(600);
    expect(w.getLong()).toContain('10:00');
    w.close();
    expect(w.getLong()).toContain('lid is shut');
  });
});
