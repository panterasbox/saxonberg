/**
 * ⭐⭐ The tide on the moon's clock (underwater D4): high water comes about
 * fifty minutes later each day; springs at new and full moon are bigger
 * than neaps at the quarters; the stream runs hardest at mid-tide and is
 * slack at the turn.
 */

import { describe, it, expect } from 'vitest';
import { Tide } from '../lib/Tide';

const DAY = 86_400;
const SYNODIC = 30;

/** The moon's phase at `t`, as the calendar's moon runs: new at 0. */
function moon(t: number): number {
  return (((t / DAY) / SYNODIC) % 1 + 1) % 1;
}

describe('the tide (D4)', () => {
  const tide = new Tide(3, 0, SYNODIC);

  it('⭐ high water is about fifty minutes later each day', () => {
    const first = tide.at(10 * DAY, moon(10 * DAY)).nextHighS;
    // The high water a lunar day on (two semidiurnal periods).
    const next = tide.at(first + 1, moon(first + 1)).nextHighS;
    const after = tide.at(next + 1, moon(next + 1)).nextHighS;
    const lateBy = after - first - DAY;
    expect(lateBy / 60).toBeGreaterThan(40);
    expect(lateBy / 60).toBeLessThan(60);
  });

  it('springs at new and full are bigger than neaps at the quarters', () => {
    const spring = tide.at(0, 0).rangeM;
    const full = tide.at(15 * DAY, 0.5).rangeM;
    const neap = tide.at(7.5 * DAY, 0.25).rangeM;
    expect(spring).toBeGreaterThan(neap);
    expect(full).toBeCloseTo(spring, 5);
  });

  it('⭐ the stream peaks at mid-tide and is slack at the turn', () => {
    const t0 = 3 * DAY;
    const high = tide.at(t0, moon(t0)).nextHighS;
    const atHigh = tide.at(high, moon(high));
    expect(Math.abs(atHigh.streamFactor)).toBeLessThan(0.05);
    expect(atHigh.levelM).toBeGreaterThan(1);
    const quarter = tide.periodS() / 4;
    const midEbb = tide.at(high + quarter, moon(high + quarter));
    expect(midEbb.streamFactor).toBeLessThan(-0.95);
    expect(midEbb.rising).toBe(false);
    const low = tide.at(high + 2 * quarter, moon(high + 2 * quarter));
    expect(low.levelM).toBeLessThan(-1);
  });
});
