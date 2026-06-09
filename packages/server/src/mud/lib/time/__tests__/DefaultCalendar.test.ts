/**
 * DefaultCalendar tests — epoch, decompose∘compose round-trip,
 * weekday drift, and formatDate / parseDate round-trip (acceptance
 * AC8).
 */

import { describe, it, expect } from 'vitest';
import { DefaultCalendar } from '../DefaultCalendar';
import { Quantity } from '../../quantity';

const cal = new DefaultCalendar();
const DAY = 86_400;

describe('DefaultCalendar epoch', () => {
  it('t=0 is Oneday, 1 Arienle, year 1, 00:00:00', () => {
    const d = cal.decompose(Quantity.of(0, 's'));
    expect(d).toEqual({
      year: 1,
      month: 1,
      day: 1,
      weekday: 0,
      hour: 0,
      minute: 0,
      second: 0,
    });
  });
});

describe('decompose / compose', () => {
  it('round-trips exactly for arbitrary times (no leap years)', () => {
    const samples = [
      0,
      59,
      3_600,
      DAY,
      DAY * 29 + 12 * 3600 + 34 * 60 + 56,
      DAY * 30, // month boundary
      DAY * 359 + 23 * 3600 + 59 * 60 + 59,
      DAY * 360, // year boundary
      DAY * 1247 + 7 * 3600,
    ];
    for (const s of samples) {
      const d = cal.decompose(Quantity.of(s, 's'));
      expect(cal.compose(d).rawValue()).toBe(s);
    }
  });

  it('decomposes a mid-year date correctly', () => {
    // Karmina (month 5), day 15, year 1, 13:45:00
    const t = cal.compose({
      year: 1,
      month: 5,
      day: 15,
      weekday: 0,
      hour: 13,
      minute: 45,
      second: 0,
    });
    const d = cal.decompose(t);
    expect(d.month).toBe(5);
    expect(d.day).toBe(15);
    expect(d.hour).toBe(13);
    expect(d.minute).toBe(45);
  });
});

describe('weekday drift', () => {
  it('month 2 (Teliminus) day 1 is Threeday (30 mod 7 = 2)', () => {
    const t = cal.compose({
      year: 1,
      month: 2,
      day: 1,
      weekday: 0,
      hour: 0,
      minute: 0,
      second: 0,
    });
    const d = cal.decompose(t);
    expect(d.weekday).toBe(2);
    expect(cal.weekdayNames[d.weekday]).toBe('Threeday');
  });

  it('the new year shifts the weekday by 3 (360 mod 7 = 3)', () => {
    const t = cal.compose({
      year: 2,
      month: 1,
      day: 1,
      weekday: 0,
      hour: 0,
      minute: 0,
      second: 0,
    });
    const d = cal.decompose(t);
    expect(d.weekday).toBe(3);
    expect(cal.weekdayNames[d.weekday]).toBe('Fourday');
  });
});

describe('formatDate / parseDate', () => {
  it('formats the epoch with the default format', () => {
    expect(cal.formatDate(Quantity.of(0, 's'))).toBe(
      'Oneday, 1 Arienle 1 00:00'
    );
  });

  it('round-trips through parseDate for the default shape', () => {
    const input = '15 Karmina 1247 13:45';
    const t = cal.parseDate(input);
    // The formatted result carries the (derived) weekday + the same
    // date / time fields.
    expect(cal.formatDate(t)).toContain('15 Karmina 1247 13:45');
    // And compose round-trips the parsed time.
    const d = cal.decompose(t);
    expect(cal.compose(d).rawValue()).toBe(t.rawValue());
  });

  it('parses an HH:MM:SS time and a bare date', () => {
    expect(cal.parseDate('1 Arienle 1 06:30:15').rawValue()).toBe(
      6 * 3600 + 30 * 60 + 15
    );
    expect(cal.parseDate('1 Arienle 1').rawValue()).toBe(0);
  });

  it('throws on unparseable input and unknown months', () => {
    expect(() => cal.parseDate('not a date')).toThrow();
    expect(() => cal.parseDate('1 Smarch 1')).toThrow(/unknown month/);
  });
});
