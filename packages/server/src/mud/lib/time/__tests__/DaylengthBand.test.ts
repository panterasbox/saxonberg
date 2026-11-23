/**
 * DaylengthBand — the one evaluator of a seasonal window
 * (organism-biology S17). Pins the behavior the two shipped copies had
 * (`Species.breedsAtDaylight`, `Producing`'s `inBand`) before W7 moves
 * the authored bands onto it.
 */
import { describe, it, expect } from 'vitest';
import { DaylengthBand } from '../DaylengthBand';

describe('DaylengthBand', () => {
  it('a plain band holds inside its bounds, inclusive', () => {
    const b = new DaylengthBand({ daylightFrom: 0.46, daylightTo: 0.62 });
    expect(b.contains(0.46)).toBe(true);
    expect(b.contains(0.55)).toBe(true);
    expect(b.contains(0.62)).toBe(true);
    expect(b.contains(0.45)).toBe(false);
    expect(b.contains(0.63)).toBe(false);
  });

  it('⚠ a band with from > to wraps the solstice', () => {
    const b = new DaylengthBand({ daylightFrom: 0.6, daylightTo: 0.4 });
    expect(b.contains(0.7)).toBe(true);
    expect(b.contains(0.3)).toBe(true);
    expect(b.contains(0.5)).toBe(false);
  });

  it('rising splits spring from autumn; an unknown direction agrees', () => {
    const spring = new DaylengthBand({ daylightFrom: 0.4, daylightTo: 0.6, rising: true });
    expect(spring.holds(0.5, true)).toBe(true);
    expect(spring.holds(0.5, false)).toBe(false);
    expect(spring.holds(0.5, null)).toBe(true);
    expect(new DaylengthBand({ daylightFrom: 0.4, daylightTo: 0.6 }).holds(0.5, false)).toBe(true);
  });

  it('sideOf: below the opener is before, else after', () => {
    const b = new DaylengthBand({ daylightFrom: 0.45, daylightTo: 1 });
    expect(b.sideOf(0.3)).toBe('before');
    expect(b.sideOf(0.5)).toBe('after');
  });
});
