/**
 * onDate / cron tests — calendar-aware scheduling rides the Wave-1
 * `at` / heartbeat machinery (acceptance AC8). Driven at scale 1 via
 * `_advanceForTesting`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorldClockApi } from '../../../api/worldclock';
import { DefaultCalendar } from '../DefaultCalendar';

const cal = DefaultCalendar.singleton();
const DAY = 86_400;

describe('WorldClockApi.onDate (AC8)', () => {
  beforeEach(() => {
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('fires once at a CalendarDate deadline', () => {
    let fired = 0;
    // Day 2 (Arienle 2) at midnight = 86 400 s.
    WorldClockApi.onDate(
      { year: 1, month: 1, day: 2, weekday: 0, hour: 0, minute: 0, second: 0 },
      () => fired++
    );
    WorldClockApi._advanceForTesting(DAY * 1000 - 1000);
    expect(fired).toBe(0);
    WorldClockApi._advanceForTesting(1000);
    expect(fired).toBe(1);
  });

  it('accepts a parseable date string', () => {
    let fired = 0;
    const target = cal.parseDate('3 Arienle 1');
    WorldClockApi.onDate('3 Arienle 1', () => fired++);
    WorldClockApi._advanceForTesting(target.rawValue() * 1000);
    expect(fired).toBe(1);
  });
});

describe('WorldClockApi.cron (AC8)', () => {
  beforeEach(() => {
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('fires daily at midnight and re-arms for the next match', () => {
    let count = 0;
    WorldClockApi.cron({ hour: 0, minute: 0 }, () => count++);
    WorldClockApi._advanceForTesting(DAY * 1000); // to next midnight
    expect(count).toBe(1);
    WorldClockApi._advanceForTesting(DAY * 1000); // one more day
    expect(count).toBe(2);
  });

  it('resolves month / weekday names and fires on the matching date', () => {
    let fired = 0;
    // Karmina (month 5), day 15, midnight.
    const expected = cal.compose({
      year: 1,
      month: 5,
      day: 15,
      weekday: 0,
      hour: 0,
      minute: 0,
      second: 0,
    });
    const h = WorldClockApi.cron(
      { month: 'Karmina', monthday: 15, hour: 0, minute: 0 },
      () => fired++
    );
    expect(h.nextFireAt?.rawValue()).toBe(expected.rawValue());
    WorldClockApi._advanceForTesting(expected.rawValue() * 1000);
    expect(fired).toBe(1);
  });

  it('cancel() stops the cron chain', () => {
    let count = 0;
    const h = WorldClockApi.cron({ hour: 0, minute: 0 }, () => count++);
    WorldClockApi._advanceForTesting(DAY * 1000);
    expect(count).toBe(1);
    h.cancel();
    expect(h.nextFireAt).toBeNull();
    WorldClockApi._advanceForTesting(DAY * 5 * 1000);
    expect(count).toBe(1);
  });
});
