/**
 * ClockTower — the accurate civic sibling. Reads true game-time-of-day
 * straight off `WorldClockApi` and cannot drift; the pocket watch is the
 * one that lags.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ClockTower from '../ClockTower';
import { MixinApi } from '../../api/mixin';
import { WorldClockApi } from '../../api/worldclock';
import '../../obj/WorldClockRegistry';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

const SCALE = 12;
let real = 0;
function tick(gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
}

// real-ms that maps to game-seconds S: S = real/1000 * SCALE.
function realForGameSeconds(s: number): number {
  return (s * 1000) / SCALE;
}

function tower(): ClockTower {
  return makeStuff(() => new ClockTower());
}

describe('ClockTower', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = realForGameSeconds(10 * 3600 + 30 * 60); // 10:30:00 of day 1
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('composes Timekeeping', () => {
    expect(MixinApi.isTimekeeping(tower() as never)).toBe(true);
  });

  it('reads the true civic time', () => {
    expect(tower().currentReading()?.format()).toBe('10:30');
  });

  it('never drifts — tracks the world clock exactly across elapsed time', () => {
    const t = tower();
    expect(t.currentReading()?.format()).toBe('10:30');
    tick(3600); // exactly one game-hour
    expect(t.currentReading()?.format()).toBe('11:30');
    tick(90 * 60); // ninety more game-minutes
    expect(t.currentReading()?.format()).toBe('13:00');
  });

  it('renders the live civic time into the long description', () => {
    expect(tower().getLong()).toContain('10:30');
  });
});
