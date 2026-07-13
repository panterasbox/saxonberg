/**
 * Time — a minutes-of-day clock-face reading (0..1439), the value a
 * timepiece *displays*.
 *
 * A named value-object (peer of `Quantity` / `Reserve`): the game-time
 * axis is `Quantity<'s'>` seconds-since-epoch and `DefaultCalendar`
 * decomposes it into a full `{year, month, day, hour, minute}` date, but
 * a clock face shows only the hour-and-minute of the day, wrapping at
 * midnight. `DefaultCalendar` has no minutes-of-day type, so `Time` is
 * that small missing piece: it holds the wrapped minute-of-day and
 * formats it `HH:MM`. It is `Timekeeping.currentReading()`'s return
 * shape — a `Watch` and a `ClockTower` both surface one.
 *
 * Derived on read, never persisted. Immutable.
 */

const MINUTES_PER_DAY = 24 * 60;

export class Time {
  /** Minute of day, normalized into `[0, 1440)`. */
  public readonly minutes: number;

  constructor(minutes: number) {
    // Wrap into a single day (a clock face has no notion of "yesterday").
    const wrapped = Math.floor(minutes) % MINUTES_PER_DAY;
    this.minutes = wrapped < 0 ? wrapped + MINUTES_PER_DAY : wrapped;
  }

  /** Build from a (possibly out-of-range / negative) minute count. */
  static ofMinutes(minutes: number): Time {
    return new Time(minutes);
  }

  /** Build from an hour + minute pair. */
  static ofHourMinute(hour: number, minute: number): Time {
    return new Time(hour * 60 + minute);
  }

  /**
   * Parse a `H:MM` / `HH:MM` clock string into a `Time`. Throws on
   * anything else (an out-of-range hour/minute included).
   */
  static parse(input: string): Time {
    const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(input);
    if (!m) {
      throw new Error(
        `Time.parse: cannot parse '${input}' (expected 'HH:MM')`,
      );
    }
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    if (hour > 23 || minute > 59) {
      throw new Error(`Time.parse: '${input}' is out of range`);
    }
    return Time.ofHourMinute(hour, minute);
  }

  /** Hour component (0..23). */
  get hour(): number {
    return Math.floor(this.minutes / 60);
  }

  /** Minute component (0..59). */
  get minute(): number {
    return this.minutes % 60;
  }

  /** Format as a zero-padded `HH:MM` clock reading. */
  format(): string {
    const pad2 = (n: number): string => String(n).padStart(2, '0');
    return `${pad2(this.hour)}:${pad2(this.minute)}`;
  }

  /** Two readings are equal iff they land on the same minute of day. */
  equals(other: Time): boolean {
    return this.minutes === other.minutes;
  }
}
