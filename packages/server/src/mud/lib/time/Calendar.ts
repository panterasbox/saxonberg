/**
 * Calendar — the seam between the raw game-time axis (seconds since
 * epoch) and a human-readable date. A `Calendar` decomposes a
 * `Quantity<'s'>` into `{year, month, day, weekday, hour, minute,
 * second}` and composes the inverse; `compose` is the basis for
 * `WorldClockApi.onDate` / `cron`. The substrate supports multiple
 * calendars on one time axis (cross-calendar conversion = ask the
 * target calendar to decompose the shared time); v1 ships only
 * `DefaultCalendar`.
 *
 * Plain interface + value type — no Stuff. Concrete calendars live
 * beside it in `lib/time/`.
 */

import type { Quantity } from '../quantity';

export interface CalendarDate {
  year: number;
  month: number; // 1-based
  day: number; // 1-based
  weekday: number; // 0-based (0 = first weekday)
  hour: number;
  minute: number;
  second: number;
}

export interface Calendar {
  decompose(t: Quantity<'s'>): CalendarDate;
  compose(date: CalendarDate): Quantity<'s'>;
  formatDate(t: Quantity<'s'>, format?: string): string;
  parseDate(input: string, format?: string): Quantity<'s'>;
  readonly monthNames: string[];
  readonly weekdayNames: string[];
  readonly hoursPerDay: number;
  readonly daysPerMonth: number[];
  readonly daysPerWeek: number;
}
