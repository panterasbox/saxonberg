/**
 * WorldClockApi — the single global game-time authority.
 *
 * Game-time advances only while the server is up (own-thing model,
 * requirements D1): the clock reads from an in-memory anchor
 * `(anchorGameTimeS, anchorRealMs)` and a `scale` factor, pauses at
 * shutdown, and resumes from the persisted `elapsedGameTimeS` on the
 * next boot. Everything that needs "what time is it in the world"
 * goes through `getNow()`; the activity scheduler, celestial queries,
 * and the calendar all sit on top of this one axis.
 *
 * Scheduling primitives (`after` / `at` / `every` + the cancel
 * family) register against a deadline-ordered registry driven by a
 * single real-time heartbeat. The heartbeat is **arm-next-deadline**,
 * not a fixed tick: on each (re)arm it computes the earliest game-time
 * deadline across all live schedules, converts the game-time delay to
 * real-ms against the current scale, and arms one
 * `ScheduleApi.schedule` one-shot — so a schedule days out doesn't
 * wake the process every tick, and pause / scale re-arm cleanly.
 *
 * Schedules are pure runtime state — the clock NEVER persists them
 * (requirements § "never persisted"). A Stuff that wants to fire
 * later stores its deadline as a persistent field and re-establishes
 * the schedule in `postRegister`; it owns its own missed-event
 * semantics.
 *
 * Static `#`-private slots are permitted here because Api methods are
 * static — there is no instance proxy receiver in play (CLAUDE.md).
 */

import { nanoid } from 'nanoid';
import type { Stuff } from '../lib/stuff/Stuff';
import { Quantity } from '../lib/quantity';
import type { Calendar, CalendarDate } from '../lib/time/Calendar';
import { DefaultCalendar } from '../lib/time/DefaultCalendar';
import { ScheduleApi, type ScheduleHandle } from './schedule';
import { ExecutionContextApi } from './execution-context';
import { EventApi, type Subscription } from './event';
import { Events } from '../lib/events';
import { SecurityApi } from './security';

/* ─────────────────────────── public surface types ─────────────────────────── */

export type ClockCallback = (handle: ClockHandle) => void;

export interface ScheduleOpts {
  /** When set, the schedule auto-cancels if this Stuff destructs. */
  host?: Stuff;
  /** Free-form label for bulk cancel via `cancelByTag`. */
  tag?: string;
}

/**
 * Live handle onto a registered schedule. `nextFireAt` and
 * `fireCount` read through to the underlying record, so they stay
 * accurate as the schedule fires / advances; `nextFireAt` is `null`
 * once the schedule is cancelled or expired.
 */
export interface ClockHandle {
  readonly id: string;
  readonly nextFireAt: Quantity<'s'> | null;
  readonly fireCount: number;
  cancel(): void;
}

export interface WorldClockSnapshot {
  elapsedGameTimeS: number;
  scale: number;
  lastShutdownRealMs: number;
}

/**
 * Partial calendar pattern for `cron` (Wave 3). Declared now,
 * consumed once the calendar lands.
 */
export interface CronPattern {
  weekday?: number | string;
  monthday?: number;
  month?: number | string;
  hour?: number;
  minute?: number;
}

/* ─────────────────────────── internals ─────────────────────────── */

interface Schedule {
  id: string;
  nextFireAtS: number | null; // null = cancelled / expired
  intervalS: number | null; // null = one-shot
  remainingRuns: number | null; // null = unbounded
  fireCount: number;
  cb: ClockCallback;
  host: Stuff | null;
  tag: string | null;
  hostSub: Subscription<unknown> | null;
  handle: ClockHandle;
}

const MS_PER_SECOND = 1000;

/**
 * Deadline-comparison tolerance, in game-seconds. Game-time deadlines
 * accumulate via repeated `+= intervalS` on fractional second values
 * (durations arrive as game-ms ÷ 1000), so exact `<=` would drop a
 * fire when float drift pushes a deadline a few ULPs past `now`
 * (`0.1 + 0.2 === 0.30000000000000004`). One nanosecond of game-time
 * is far below any meaningful cadence and absorbs the drift.
 */
const FIRE_EPSILON_S = 1e-9;

const DURATION_UNITS: Record<string, number> = {
  second: 1,
  minute: 60,
  hour: 3600,
  day: 86_400,
};

/* ─────────────────────────── WorldClockApi ─────────────────────────── */

export class WorldClockApi {
  private constructor() {}

  /** Default time scale (game-seconds per real-second). Requirements D2. */
  static readonly DEFAULT_SCALE = 12;

  /** Crash-backstop snapshot cadence (module constant, not a setting). */
  static readonly SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

  /* ──────────────────── anchor state ──────────────────── */

  static #anchorGameTimeS = 0;
  static #anchorRealMs = 0;
  static #scale = WorldClockApi.DEFAULT_SCALE;
  static #paused = false;

  /** Injectable real clock — every real-clock read goes through this. */
  static #nowMs: () => number = Date.now;
  /** When true, the live heartbeat is suppressed; tests drive `#onHeartbeat`. */
  static #testMode = false;

  /* ──────────────────── scheduler state ──────────────────── */

  static #schedules: Map<string, Schedule> = new Map();
  static #heartbeat: ScheduleHandle | null = null;
  static #snapshotBackstop: ScheduleHandle | null = null;

  /* ──────────────────── core queries / control ──────────────────── */

  public static getNow(): Quantity<'s'> {
    return Quantity.of(WorldClockApi.#currentGameSeconds(), 's');
  }

  public static getScale(): number {
    return WorldClockApi.#scale;
  }

  /** Admin — re-anchors so no time discontinuity occurs (AC1). */
  public static setScale(scale: number): void {
    if (typeof scale !== 'number' || !Number.isFinite(scale) || scale <= 0) {
      throw new TypeError(
        `WorldClockApi.setScale: scale must be a positive finite number, got ${String(scale)}`
      );
    }
    WorldClockApi.#reanchor();
    WorldClockApi.#scale = scale;
    WorldClockApi.#rearmHeartbeat();
  }

  public static pause(): void {
    if (WorldClockApi.#paused) return;
    WorldClockApi.#reanchor();
    WorldClockApi.#paused = true;
    WorldClockApi.#disarmHeartbeat();
  }

  public static resume(): void {
    if (!WorldClockApi.#paused) return;
    // Resume from the frozen value exactly — re-anchor real time
    // without advancing game time (AC2).
    WorldClockApi.#anchorRealMs = WorldClockApi.#nowMs();
    WorldClockApi.#paused = false;
    WorldClockApi.#rearmHeartbeat();
  }

  public static isPaused(): boolean {
    return WorldClockApi.#paused;
  }

  /* ──────────────────── anchor math ──────────────────── */

  static #currentGameSeconds(): number {
    if (WorldClockApi.#paused) return WorldClockApi.#anchorGameTimeS;
    const realDeltaMs = WorldClockApi.#nowMs() - WorldClockApi.#anchorRealMs;
    return (
      WorldClockApi.#anchorGameTimeS +
      (realDeltaMs / MS_PER_SECOND) * WorldClockApi.#scale
    );
  }

  /** Capture current game-time into the anchor, reset the real anchor. */
  static #reanchor(): void {
    WorldClockApi.#anchorGameTimeS = WorldClockApi.#currentGameSeconds();
    WorldClockApi.#anchorRealMs = WorldClockApi.#nowMs();
  }

  /* ──────────────────── persistence (own-thing model) ──────────────────── */

  public static snapshot(): WorldClockSnapshot {
    return {
      elapsedGameTimeS: WorldClockApi.#currentGameSeconds(),
      scale: WorldClockApi.#scale,
      lastShutdownRealMs: WorldClockApi.#nowMs(),
    };
  }

  public static restore(snap: WorldClockSnapshot): void {
    WorldClockApi.#anchorGameTimeS = snap.elapsedGameTimeS;
    WorldClockApi.#anchorRealMs = WorldClockApi.#nowMs();
    WorldClockApi.#scale = snap.scale;
    WorldClockApi.#paused = false;
    // Schedules are never persisted; they start empty on a fresh boot.
  }

  /**
   * Start the periodic crash-backstop snapshot. Fire-and-forget like
   * Avatar autosave; an ungraceful exit loses at most one interval.
   * The `write` callback is injected so this Api stays free of a
   * `WorldClockState` (lib) import — `AppBootstrap` wires it.
   */
  public static startSnapshotBackstop(
    write: (snap: WorldClockSnapshot) => Promise<void>
  ): void {
    if (WorldClockApi.#snapshotBackstop) return;
    WorldClockApi.#snapshotBackstop = ScheduleApi.recurring(
      WorldClockApi.SNAPSHOT_INTERVAL_MS,
      () => {
        void write(WorldClockApi.snapshot()).catch((err) => {
          console.error('WorldClockApi: backstop snapshot failed:', err);
        });
      },
      { propagateAttribution: false, mode: 'fixed-delay' }
    );
  }

  /**
   * System-scope recurring schedules (festival / market reset).
   * Registered from the `AppBootstrap` restore step rather than a
   * `bootstrap.ts` manifest entry (plan §3.4). Empty in v1 — the
   * mechanism is what's specified; concrete schedules layer on with
   * `cron(...)` once content wants them.
   */
  public static registerSystemSchedules(): void {
    // intentionally empty for v1
  }

  /* ──────────────────── scheduling primitives ──────────────────── */

  public static after(
    delay: Quantity<'s'> | string,
    cb: ClockCallback,
    opts?: ScheduleOpts
  ): ClockHandle {
    const delayS = WorldClockApi.#parseDelayToSeconds(delay);
    return WorldClockApi.#makeSchedule({
      nextFireAtS: WorldClockApi.#currentGameSeconds() + delayS,
      intervalS: null,
      remainingRuns: null,
      cb,
      opts,
    });
  }

  public static at(
    deadline: Quantity<'s'>,
    cb: ClockCallback,
    opts?: ScheduleOpts
  ): ClockHandle {
    return WorldClockApi.#makeSchedule({
      nextFireAtS: deadline.rawValue(),
      intervalS: null,
      remainingRuns: null,
      cb,
      opts,
    });
  }

  public static every(
    interval: Quantity<'s'> | string,
    cb: ClockCallback,
    opts?: ScheduleOpts & { startAt?: Quantity<'s'>; runs?: number }
  ): ClockHandle {
    const intervalS = WorldClockApi.#parseDelayToSeconds(interval);
    if (intervalS <= 0) {
      throw new RangeError(
        `WorldClockApi.every: interval must be a positive game-time, got ${intervalS}s`
      );
    }
    const startAtS =
      opts?.startAt?.rawValue() ??
      WorldClockApi.#currentGameSeconds() + intervalS;
    return WorldClockApi.#makeSchedule({
      nextFireAtS: startAtS,
      intervalS,
      remainingRuns: opts?.runs ?? null,
      cb,
      opts,
    });
  }

  public static cancel(handle: ClockHandle): void {
    handle.cancel();
  }

  /** Cancel every schedule with `tag`; if `host` given, AND on host identity. */
  public static cancelByTag(tag: string, host?: Stuff): number {
    let count = 0;
    for (const s of [...WorldClockApi.#schedules.values()]) {
      if (s.tag !== tag) continue;
      if (host && !WorldClockApi.#sameHost(s.host, host)) continue;
      WorldClockApi.#cancelInternal(s);
      count++;
    }
    return count;
  }

  public static cancelByHost(host: Stuff): number {
    let count = 0;
    for (const s of [...WorldClockApi.#schedules.values()]) {
      if (!WorldClockApi.#sameHost(s.host, host)) continue;
      WorldClockApi.#cancelInternal(s);
      count++;
    }
    return count;
  }

  /* ──────────────────── calendar-aware scheduling (Wave 3) ──────────────────── */

  /**
   * Fire once at an absolute calendar date. A `CalendarDate` is
   * composed to a deadline; a string is parsed via the calendar's
   * `parseDate`. Defaults to `DefaultCalendar` (locale stub for v1).
   */
  public static onDate(
    date: CalendarDate | string,
    cb: ClockCallback,
    opts?: ScheduleOpts & { calendar?: Calendar }
  ): ClockHandle {
    const calendar = opts?.calendar ?? DefaultCalendar.singleton();
    const deadline =
      typeof date === 'string'
        ? calendar.parseDate(date)
        : calendar.compose(date);
    return WorldClockApi.at(deadline, cb, opts);
  }

  /**
   * Fire on every calendar date matching a partial pattern
   * (`weekday` / `monthday` / `month` / `hour` / `minute`). Self-
   * rescheduling: each fire recomputes the next matching deadline and
   * re-arms, so irregular calendar cadences stay correct. The returned
   * handle survives the reschedules; `cancel()` stops the chain.
   */
  public static cron(
    pattern: CronPattern,
    cb: ClockCallback,
    opts?: ScheduleOpts & { calendar?: Calendar }
  ): ClockHandle {
    const calendar = opts?.calendar ?? DefaultCalendar.singleton();
    let cancelled = false;
    let inner: ClockHandle | null = null;
    let fireCount = 0;

    const wrapper: ClockHandle = {
      id: nanoid(),
      get nextFireAt(): Quantity<'s'> | null {
        return inner ? inner.nextFireAt : null;
      },
      get fireCount(): number {
        return fireCount;
      },
      cancel(): void {
        cancelled = true;
        if (inner) inner.cancel();
        inner = null;
      },
    };

    const arm = (fromT: number): void => {
      if (cancelled) return;
      const nextT = WorldClockApi.#nextCronMatch(pattern, fromT, calendar);
      if (nextT === null) return;
      inner = WorldClockApi.at(
        Quantity.of(nextT, 's'),
        () => {
          fireCount++;
          cb(wrapper);
          if (!cancelled) arm(nextT);
        },
        opts
      );
    };

    arm(WorldClockApi.#currentGameSeconds());
    return wrapper;
  }

  /**
   * First game-time strictly after `fromT` whose calendar date
   * satisfies every constrained field of `pattern`. Steps coarsely:
   * a failing month/day/hour jumps to the start of the next
   * month/day/hour rather than scanning every minute. Returns null if
   * no match is found within a bounded search (two years).
   */
  static #nextCronMatch(
    pattern: CronPattern,
    fromT: number,
    calendar: Calendar
  ): number | null {
    const weekday = WorldClockApi.#resolveName(
      pattern.weekday,
      calendar.weekdayNames
    );
    const month = WorldClockApi.#resolveName(
      pattern.month,
      calendar.monthNames,
      1 // month names are 1-based
    );
    const secondsPerDay = calendar.hoursPerDay * 3600;

    // Start strictly after `fromT`, aligned to the next whole minute.
    let t = Math.floor(fromT / 60) * 60 + 60;
    const limit = 2 * 366 * 24 * 60; // ~two years of minute steps
    for (let i = 0; i < limit; i++) {
      const d = calendar.decompose(Quantity.of(t, 's'));
      const dayStart =
        t - (d.hour * 3600 + d.minute * 60 + d.second);
      if (month !== undefined && d.month !== month) {
        // Jump to the first second of the next month.
        const daysThisMonth = calendar.daysPerMonth[d.month - 1] ?? 30;
        const monthStart = dayStart - (d.day - 1) * secondsPerDay;
        t = monthStart + daysThisMonth * secondsPerDay;
        continue;
      }
      if (pattern.monthday !== undefined && d.day !== pattern.monthday) {
        t = dayStart + secondsPerDay;
        continue;
      }
      if (weekday !== undefined && d.weekday !== weekday) {
        t = dayStart + secondsPerDay;
        continue;
      }
      if (pattern.hour !== undefined && d.hour !== pattern.hour) {
        t = dayStart + (d.hour + 1) * 3600;
        continue;
      }
      if (pattern.minute !== undefined && d.minute !== pattern.minute) {
        t += 60;
        continue;
      }
      return t;
    }
    return null;
  }

  /**
   * Resolve a cron field that may be a number or a name. Numbers pass
   * through; strings are looked up in `names` and offset by `base`
   * (0 for weekdays, 1 for months). Returns undefined for an absent
   * field.
   */
  static #resolveName(
    value: number | string | undefined,
    names: string[],
    base = 0
  ): number | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'number') return value;
    const idx = names.findIndex(
      (n) => n.toLowerCase() === value.toLowerCase()
    );
    if (idx < 0) {
      throw new Error(`WorldClockApi.cron: unknown name '${value}'`);
    }
    return idx + base;
  }

  /* ──────────────────── scheduling internals ──────────────────── */

  static #parseDelayToSeconds(d: Quantity<'s'> | string): number {
    if (typeof d !== 'string') return d.rawValue();
    const m = /^\s*(\d+(?:\.\d+)?)\s*(second|minute|hour|day)s?\s*$/.exec(d);
    if (!m) {
      throw new Error(
        `WorldClockApi: cannot parse duration '${d}' ` +
          `(expected e.g. '5 minutes', '3 days')`
      );
    }
    const value = Number(m[1]);
    const unit = DURATION_UNITS[m[2] as string];
    if (unit === undefined) {
      throw new Error(`WorldClockApi: unknown duration unit in '${d}'`);
    }
    return value * unit;
  }

  static #sameHost(a: Stuff | null, b: Stuff | null): boolean {
    if (!a || !b) return false;
    return a.stuffId === b.stuffId;
  }

  static #makeSchedule(spec: {
    nextFireAtS: number;
    intervalS: number | null;
    remainingRuns: number | null;
    cb: ClockCallback;
    opts?: ScheduleOpts;
  }): ClockHandle {
    const id = nanoid();
    const s: Schedule = {
      id,
      nextFireAtS: spec.nextFireAtS,
      intervalS: spec.intervalS,
      remainingRuns: spec.remainingRuns,
      fireCount: 0,
      cb: spec.cb,
      host: spec.opts?.host ?? null,
      tag: spec.opts?.tag ?? null,
      hostSub: null,
      handle: null as unknown as ClockHandle,
    };
    s.handle = {
      id,
      get nextFireAt(): Quantity<'s'> | null {
        return s.nextFireAtS === null ? null : Quantity.of(s.nextFireAtS, 's');
      },
      get fireCount(): number {
        return s.fireCount;
      },
      cancel(): void {
        WorldClockApi.#cancelInternal(s);
      },
    };

    if (s.host) {
      const hostId = s.host.stuffId;
      s.hostSub = EventApi.on<{ stuffId: string }>(
        Events.StuffDestructed,
        (payload) => {
          if (payload.stuffId !== hostId) return;
          ExecutionContextApi.runRoot(WorldClockApi, 'hostDestroyed', () => {
            WorldClockApi.#cancelInternal(s);
          });
        }
      ) as unknown as Subscription<unknown>;
    }

    WorldClockApi.#schedules.set(id, s);
    WorldClockApi.#rearmHeartbeat();
    return s.handle;
  }

  /** Idempotent cancel: detach the schedule and unsubscribe its host hook. */
  static #cancelInternal(s: Schedule): void {
    if (!WorldClockApi.#schedules.has(s.id)) return;
    s.nextFireAtS = null;
    if (s.hostSub) {
      try {
        s.hostSub.unsubscribe();
      } catch (err) {
        console.error(
          `WorldClockApi: host-destruction unsubscribe threw for schedule '${s.id}'`,
          err
        );
      }
      s.hostSub = null;
    }
    WorldClockApi.#schedules.delete(s.id);
    WorldClockApi.#rearmHeartbeat();
  }

  /** Earliest live deadline across all schedules, or null if none. */
  static #earliestDeadline(): number | null {
    let earliest: number | null = null;
    for (const s of WorldClockApi.#schedules.values()) {
      if (s.nextFireAtS === null) continue;
      if (earliest === null || s.nextFireAtS < earliest) {
        earliest = s.nextFireAtS;
      }
    }
    return earliest;
  }

  static #disarmHeartbeat(): void {
    if (WorldClockApi.#heartbeat) {
      ScheduleApi.cancel(WorldClockApi.#heartbeat);
      WorldClockApi.#heartbeat = null;
    }
  }

  /**
   * (Re)arm the single real-time heartbeat for the earliest live
   * deadline. No-op while paused, with no live schedule, or in test
   * mode (where `_advanceForTesting` is the only driver).
   */
  static #rearmHeartbeat(): void {
    WorldClockApi.#disarmHeartbeat();
    if (WorldClockApi.#paused) return;
    if (WorldClockApi.#testMode) return;
    const earliest = WorldClockApi.#earliestDeadline();
    if (earliest === null) return;
    const gameDeltaS = earliest - WorldClockApi.#currentGameSeconds();
    const realMs = Math.max(
      0,
      (gameDeltaS / WorldClockApi.#scale) * MS_PER_SECOND
    );
    WorldClockApi.#heartbeat = ScheduleApi.schedule(
      realMs,
      () => {
        ExecutionContextApi.runRoot(WorldClockApi, 'heartbeat', () => {
          WorldClockApi.#onHeartbeat();
        });
      },
      { propagateAttribution: false }
    );
  }

  /** Fire every schedule due as of the current game-time, then re-arm. */
  static #onHeartbeat(): void {
    if (WorldClockApi.#paused) return;
    const now = WorldClockApi.#currentGameSeconds();
    const deadline = now + FIRE_EPSILON_S;
    const due = [...WorldClockApi.#schedules.values()]
      .filter((s) => s.nextFireAtS !== null && s.nextFireAtS <= deadline)
      .sort((a, b) => (a.nextFireAtS as number) - (b.nextFireAtS as number));

    for (const s of due) {
      // A prior callback this tick may have cancelled this schedule.
      if (WorldClockApi.#schedules.get(s.id) !== s || s.nextFireAtS === null) {
        continue;
      }
      if (s.intervalS === null) {
        s.fireCount++;
        WorldClockApi.#invoke(s);
        // Cancel unless the callback already removed/replaced it.
        if (WorldClockApi.#schedules.get(s.id) === s) {
          WorldClockApi.#cancelInternal(s);
        }
      } else {
        // Recurring: fire (and catch up) while still due.
        do {
          s.fireCount++;
          WorldClockApi.#invoke(s);
          if (WorldClockApi.#schedules.get(s.id) !== s) break;
          if (s.remainingRuns !== null) {
            s.remainingRuns--;
            if (s.remainingRuns <= 0) {
              WorldClockApi.#cancelInternal(s);
              break;
            }
          }
          s.nextFireAtS = (s.nextFireAtS as number) + s.intervalS;
        } while (
          s.nextFireAtS !== null &&
          s.nextFireAtS <= deadline &&
          WorldClockApi.#schedules.get(s.id) === s
        );
      }
    }

    WorldClockApi.#rearmHeartbeat();
  }

  /** Invoke a schedule's callback, isolating throws. */
  static #invoke(s: Schedule): void {
    try {
      s.cb(s.handle);
    } catch (err) {
      console.error(
        `WorldClockApi: schedule '${s.id}' callback threw (continuing)`,
        err
      );
    }
  }

  /* ──────────────────── test seams ──────────────────── */

  static _setNowProviderForTesting(fn: () => number): void {
    SecurityApi.assertTestOnly('_setNowProviderForTesting');
    WorldClockApi.#testMode = true;
    WorldClockApi.#disarmHeartbeat();
    WorldClockApi.#nowMs = fn;
  }

  static _resetForTesting(): void {
    SecurityApi.assertTestOnly('_resetForTesting');
    for (const s of [...WorldClockApi.#schedules.values()]) {
      if (s.hostSub) {
        try {
          s.hostSub.unsubscribe();
        } catch {
          // ignore — test seam
        }
      }
    }
    WorldClockApi.#schedules.clear();
    WorldClockApi.#disarmHeartbeat();
    if (WorldClockApi.#snapshotBackstop) {
      ScheduleApi.cancel(WorldClockApi.#snapshotBackstop);
      WorldClockApi.#snapshotBackstop = null;
    }
    WorldClockApi.#testMode = true;
    // Frozen test clock at 0; `_advanceForTesting` reads it and
    // re-installs a frozen provider at the advanced value.
    WorldClockApi.#nowMs = () => 0;
    WorldClockApi.#anchorGameTimeS = 0;
    WorldClockApi.#anchorRealMs = 0;
    WorldClockApi.#scale = WorldClockApi.DEFAULT_SCALE;
    WorldClockApi.#paused = false;
  }

  /**
   * Advance the (test) real clock by `realMs` and synchronously run
   * every schedule that becomes due — bypassing `ScheduleApi`'s real
   * timer so there is no wall-clock wait. Reads whatever clock is
   * installed, freezes it at the advanced value, then drives
   * `#onHeartbeat` until nothing is due.
   */
  static _advanceForTesting(realMs: number): void {
    SecurityApi.assertTestOnly('_advanceForTesting');
    const target = WorldClockApi.#nowMs() + realMs;
    WorldClockApi.#nowMs = () => target;
    let guard = 0;
    for (;;) {
      if (WorldClockApi.#paused) break;
      const now = WorldClockApi.#currentGameSeconds();
      const deadline = now + FIRE_EPSILON_S;
      const anyDue = [...WorldClockApi.#schedules.values()].some(
        (s) => s.nextFireAtS !== null && s.nextFireAtS <= deadline
      );
      if (!anyDue) break;
      WorldClockApi.#onHeartbeat();
      if (++guard > 1_000_000) {
        throw new Error(
          'WorldClockApi._advanceForTesting: heartbeat did not settle ' +
            '(runaway schedule?)'
        );
      }
    }
  }
}

SecurityApi.decorateApiClass(WorldClockApi);
