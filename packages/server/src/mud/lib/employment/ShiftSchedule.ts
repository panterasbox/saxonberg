/**
 * ShiftSchedule — **a list of {@link ShiftEntry} windows read over a span of
 * time**, not at one instant.
 *
 * The roster asks *is this assignment on shift NOW?* ({@link Roster.evaluate}).
 * Anything that reconciles an unwatched gap asks the other question: *for
 * which stretches of `[fromS, toS)` was it on?* — the turncock's fills that
 * filled the tank while nobody was in Hinkley, an irrigator's turn that
 * watered a field nobody read all night (water-supply D5, D21). Same data
 * (the employment `ShiftEntry`, reused as DATA by anything with a schedule),
 * the integral instead of the sample.
 *
 * ⭐ A window whose end hour is BEFORE its start runs across midnight: a
 * night turn `[22, 4)` on day 1 is 22:00 on day 1 to 04:00 on day 2. An
 * entry whose two hours are equal covers nothing.
 *
 * ⭐⭐ This is the ONE reading of a `ShiftEntry`: {@link ShiftSchedule.covers}
 * at an instant (the roster's question) and {@link windowsBetween} over a
 * span. The roster used to read the same data its own way, so a night turn
 * watered the field through the gate while its irrigator was never on
 * shift, and a season-bound window was honored by one and ignored by the
 * other (found after the water-supply merge).
 *
 * Pure: the default calendar's day and week (24 h, the calendar's week),
 * no clock read, no state. Season is the house's (its climate decides), so
 * a caller passes it; a season-bound window with no season known is off.
 */

import { DefaultCalendar } from '../time/DefaultCalendar';
import type { RosterClock, ShiftEntry } from './Roster';
import type { Season } from '../time/CelestialProfile';

/** One stretch of time a schedule was on, `[fromS, toS)`. */
export interface ScheduleWindow {
  fromS: number;
  toS: number;
}

/** The longest gap a schedule is walked over, in days — older is not read. */
const MAX_WALK_DAYS = 400;

export class ShiftSchedule {
  private readonly entries: readonly ShiftEntry[];

  public constructor(entries: readonly ShiftEntry[] | null | undefined) {
    this.entries = (entries ?? []).filter(
      (e) => Array.isArray(e?.days) && Array.isArray(e?.hours),
    );
  }

  /**
   * ⭐ Is the schedule on at the decomposed instant `clock`? The roster's
   * question, by the same rules as {@link windowsBetween}: an evening
   * window runs on into the small hours of the next day, and a
   * season-bound window is off while the house's season is unknown.
   */
  public covers(clock: RosterClock): boolean {
    return this.entries.some((e) => ShiftSchedule.entryCovers(e, clock));
  }

  private static entryCovers(entry: ShiftEntry, clock: RosterClock): boolean {
    if (entry.season && (clock.season === undefined || !entry.season.includes(clock.season))) {
      return false;
    }
    const [h0, h1] = entry.hours;
    if (h1 > h0) return entry.days.includes(clock.weekday) && clock.hour >= h0 && clock.hour < h1;
    if (h1 === h0) return false;
    const week = DefaultCalendar.singleton().daysPerWeek;
    const yesterday = (((clock.weekday - 1) % week) + week) % week;
    return (
      (entry.days.includes(clock.weekday) && clock.hour >= h0) ||
      (entry.days.includes(yesterday) && clock.hour < h1)
    );
  }

  /** Does the schedule say anything at all? */
  public isEmpty(): boolean {
    return this.entries.length === 0;
  }

  /**
   * Every stretch of `[fromS, toS)` the schedule is on, merged and in
   * order. A gap longer than {@link MAX_WALK_DAYS} is read from its last
   * `MAX_WALK_DAYS` only. `seasonAt` is the house's season at a time; a
   * season-bound window is read in the season of the day it starts, and is
   * off when no reader is given.
   */
  public windowsBetween(
    fromS: number,
    toS: number,
    seasonAt?: (atS: number) => Season | undefined,
  ): ScheduleWindow[] {
    if (!(toS > fromS) || this.entries.length === 0) return [];
    const cal = DefaultCalendar.singleton();
    const day = cal.hoursPerDay * 3600;
    const week = cal.daysPerWeek;
    const start = Math.max(fromS, toS - MAX_WALK_DAYS * day);
    // One day back, so a night window that began yesterday is seen.
    const firstDay = Math.floor(start / day) - 1;
    const lastDay = Math.floor(toS / day);
    const raw: ScheduleWindow[] = [];
    for (let d = firstDay; d <= lastDay; d++) {
      const weekday = ((d % week) + week) % week;
      const dayStart = d * day;
      for (const e of this.entries) {
        if (!e.days.includes(weekday)) continue;
        const [h0, h1] = e.hours;
        if (h1 === h0) continue;
        if (e.season) {
          const season = seasonAt?.(dayStart);
          if (season === undefined || !e.season.includes(season)) continue;
        }
        const open = dayStart + h0 * 3600;
        const close = h1 > h0 ? dayStart + h1 * 3600 : dayStart + (h1 + cal.hoursPerDay) * 3600;
        const a = Math.max(open, start);
        const b = Math.min(close, toS);
        if (b > a) raw.push({ fromS: a, toS: b });
      }
    }
    raw.sort((x, y) => x.fromS - y.fromS);
    const merged: ScheduleWindow[] = [];
    for (const w of raw) {
      const last = merged[merged.length - 1];
      if (last && w.fromS <= last.toS) last.toS = Math.max(last.toS, w.toS);
      else merged.push({ ...w });
    }
    return merged;
  }

  /** Seconds of `[fromS, toS)` the schedule is on. */
  public onSecondsBetween(
    fromS: number,
    toS: number,
    seasonAt?: (atS: number) => Season | undefined,
  ): number {
    return this.windowsBetween(fromS, toS, seasonAt).reduce((n, w) => n + (w.toS - w.fromS), 0);
  }

  /** Is the schedule on at `atS`? */
  public isOnAt(atS: number, seasonAt?: (atS: number) => Season | undefined): boolean {
    return this.windowsBetween(atS, atS + 1, seasonAt).length > 0;
  }
}
