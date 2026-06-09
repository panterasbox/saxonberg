/**
 * DefaultCalendar — the universe-default calendar (requirements §
 * Layer 3): 360-day year = 12 months × 30 days, 4 seasons × 90 days,
 * 7-day weeks, 24-hour days, no leap years. Weekday-of-date drifts
 * (30 mod 7 = 2; 360 mod 7 = 3) — a feature, asserted by the tests.
 *
 * Epoch: game-time `t = 0` ⇒ {year 1, Arienle 1, Oneday, 00:00:00}.
 *
 * Stateless value object (a singleton instance is offered for
 * convenience); not a Stuff.
 */

import { Quantity } from '../quantity';
import type { Calendar, CalendarDate } from './Calendar';

const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_MINUTE = 60;
const DAYS_PER_YEAR = 360;
const DAYS_PER_MONTH = 30;
const MONTHS_PER_YEAR = 12;
const DAYS_PER_WEEK = 7;

const MONTH_NAMES = [
  'Arienle',
  'Teliminus',
  'Lorien',
  'Ysaril',
  'Karmina',
  'Heliune',
  'Brendarn',
  'Ingot',
  'Alystos',
  'Gettrellyn',
  'Rozgayn',
  'Blayhrr',
];

const WEEKDAY_NAMES = [
  'Oneday',
  'Twoday',
  'Threeday',
  'Fourday',
  'Fiveday',
  'Sixday',
  'Sevenday',
];

const DEFAULT_FORMAT = '{weekday}, {day} {month} {year} {hh}:{mm}';

const pad2 = (n: number): string => String(n).padStart(2, '0');

export class DefaultCalendar implements Calendar {
  readonly monthNames = MONTH_NAMES;
  readonly weekdayNames = WEEKDAY_NAMES;
  readonly hoursPerDay = 24;
  readonly daysPerMonth = Array<number>(MONTHS_PER_YEAR).fill(DAYS_PER_MONTH);
  readonly daysPerWeek = DAYS_PER_WEEK;

  static #instance: DefaultCalendar | null = null;

  /** Shared instance — the universe-default calendar (locale stub for v1). */
  static singleton(): DefaultCalendar {
    if (!DefaultCalendar.#instance) {
      DefaultCalendar.#instance = new DefaultCalendar();
    }
    return DefaultCalendar.#instance;
  }

  decompose(t: Quantity<'s'>): CalendarDate {
    const s = Math.floor(t.rawValue());
    const totalDays = Math.floor(s / SECONDS_PER_DAY);
    const secOfDay = ((s % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY;

    const hour = Math.floor(secOfDay / SECONDS_PER_HOUR);
    const minute = Math.floor((secOfDay % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    const second = secOfDay % SECONDS_PER_MINUTE;

    const year = Math.floor(totalDays / DAYS_PER_YEAR) + 1;
    const doy = ((totalDays % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR;
    const month = Math.floor(doy / DAYS_PER_MONTH) + 1;
    const day = (doy % DAYS_PER_MONTH) + 1;
    const weekday = ((totalDays % DAYS_PER_WEEK) + DAYS_PER_WEEK) % DAYS_PER_WEEK;

    return { year, month, day, weekday, hour, minute, second };
  }

  compose(date: CalendarDate): Quantity<'s'> {
    const totalDays =
      (date.year - 1) * DAYS_PER_YEAR +
      (date.month - 1) * DAYS_PER_MONTH +
      (date.day - 1);
    const s =
      totalDays * SECONDS_PER_DAY +
      date.hour * SECONDS_PER_HOUR +
      date.minute * SECONDS_PER_MINUTE +
      date.second;
    return Quantity.of(s, 's');
  }

  formatDate(t: Quantity<'s'>, format: string = DEFAULT_FORMAT): string {
    const d = this.decompose(t);
    const monthName = this.monthNames[d.month - 1] ?? `M${d.month}`;
    const weekdayName = this.weekdayNames[d.weekday] ?? `W${d.weekday}`;
    return format
      .replace(/\{year\}/g, String(d.year))
      .replace(/\{monthNum\}/g, String(d.month))
      .replace(/\{month\}/g, monthName)
      .replace(/\{day\}/g, String(d.day))
      .replace(/\{weekday\}/g, weekdayName)
      .replace(/\{hh\}/g, pad2(d.hour))
      .replace(/\{mm\}/g, pad2(d.minute))
      .replace(/\{ss\}/g, pad2(d.second));
  }

  /**
   * Inverse of the default format only (v1): parse
   * `"<day> <MonthName> <year> [hh:mm[:ss]]"`. Throws on unparseable
   * input. The `format` parameter is accepted for interface
   * conformance but only the default shape is supported in v1.
   */
  parseDate(input: string, _format?: string): Quantity<'s'> {
    const m =
      /^\s*(\d+)\s+([A-Za-z]+)\s+(\d+)(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?\s*$/.exec(
        input
      );
    if (!m) {
      throw new Error(
        `DefaultCalendar.parseDate: cannot parse '${input}' ` +
          `(expected '<day> <Month> <year> [hh:mm[:ss]]')`
      );
    }
    const day = Number(m[1]);
    const monthName = m[2] as string;
    const year = Number(m[3]);
    const hour = m[4] ? Number(m[4]) : 0;
    const minute = m[5] ? Number(m[5]) : 0;
    const second = m[6] ? Number(m[6]) : 0;

    const monthIdx = this.monthNames.findIndex(
      (name) => name.toLowerCase() === monthName.toLowerCase()
    );
    if (monthIdx < 0) {
      throw new Error(
        `DefaultCalendar.parseDate: unknown month '${monthName}'`
      );
    }

    // weekday is derived by compose; pass a placeholder.
    return this.compose({
      year,
      month: monthIdx + 1,
      day,
      weekday: 0,
      hour,
      minute,
      second,
    });
  }
}
