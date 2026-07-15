/**
 * CrossingLog — a dumb marks store: appends a timepiece reading (a
 * minute-of-day number) or a null untimed tick, folds a seeded starting
 * count into the running total, and renders total + a recent tail. Stores
 * WHEN, never WHO (there is no identity parameter to store).
 */

import { describe, it, expect, afterEach } from 'vitest';
import CrossingLog from '../CrossingLog';
import { Time } from '../../../../lib/time/Time';
import { MixinApi } from '../../../../api/mixin';
import { Mixins } from '../../../../lib/mixin';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';

function log(): CrossingLog {
  return makeStuff(() => new CrossingLog());
}

describe('CrossingLog', () => {
  afterEach(() => StuffApi.clearAll());

  it('composes Detailed', () => {
    expect(MixinApi.hasMixin(log() as never, Mixins.Detailed)).toBe(true);
  });

  it('starts empty and folds the starting count into the total', () => {
    const l = log();
    expect(l.getTotal()).toBe(0);
    l.startingCount = 1247;
    expect(l.getTotal()).toBe(1247);
    expect(l.getMarks().length).toBe(0);
  });

  it('appends timed and untimed marks, growing the total', () => {
    const l = log();
    l.startingCount = 100;
    l.addMark(600); // 10:00
    l.addMark(null); // untimed tick
    l.addMark(Time.ofHourMinute(15, 47).minutes); // 15:47
    expect(l.getMarks()).toEqual([600, null, 947]);
    expect(l.getTotal()).toBe(103);
  });

  it('renders the total and the recent tail in the long description', () => {
    const l = log();
    l.startingCount = 1244;
    l.addMark(600);
    l.addMark(null);
    l.addMark(947);
    const long = l.getLong();
    expect(long).toContain('1,247 souls seen across');
    expect(long).toContain('10:00');
    expect(long).toContain('15:47');
    expect(long).toContain('—'); // the untimed tick
  });

  it('windows the tail but never the count', () => {
    const l = log();
    for (let i = 0; i < 30; i++) l.addMark(i);
    expect(l.getTotal()).toBe(30);
    const long = l.getLong();
    // Tail shows only the last few marks, not all 30.
    expect(long).toContain('30 souls seen across');
    expect(long).not.toContain('00:00'); // minute 0 is off the tail
  });
});
