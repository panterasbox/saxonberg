/**
 * Crossing — the `tower` detail is a prose fixture (no ClockTower Stuff):
 * it reads the world clock directly and appends the honest civic time on
 * the terminal clock tower across the avenue. Degrades to the authored
 * static base when no world clock is running.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Crossing from '../Crossing';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import '../../obj/WorldClockRegistry';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

const SCALE = 12;
// real-ms that maps to game-seconds S: S = real/1000 * SCALE.
function realForGameSeconds(s: number): number {
  return (s * 1000) / SCALE;
}

const TOWER_BASE = 'High on the terminal facade, a clock tower keeps time.';

function crossing(): Crossing {
  const c = makeStuff(() => new Crossing());
  // Author a static base for the `tower` detail; getDetail appends the
  // live reading to it.
  c.setDetail(['tower', 'clock'], TOWER_BASE);
  return c;
}

describe('Crossing tower detail', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() =>
      realForGameSeconds(10 * 3600 + 30 * 60),
    ); // 10:30:00 of day 1
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('appends the live civic time to the authored base', () => {
    const detail = crossing().getDetail('tower');
    expect(detail).toContain(TOWER_BASE);
    expect(detail).toContain('terminal clock tower reads 10:30.');
  });

  it('reflects the live world clock as it advances', () => {
    const c = crossing();
    expect(c.getDetail('tower')).toContain('reads 10:30.');
    // Advance the injected real clock by one game-hour.
    WorldClockApi._setNowProviderForTesting(() =>
      realForGameSeconds(11 * 3600 + 30 * 60),
    );
    expect(c.getDetail('tower')).toContain('reads 11:30.');
  });

  it('degrades to the static base when no world clock is running', () => {
    // Author the detail first, then remove the world-clock registry so the
    // presence check reads absent. Runs last so no later test is poisoned.
    const c = crossing();
    StuffApi.clearAll();
    expect(c.getDetail('tower')).toBe(TOWER_BASE);
  });
});
