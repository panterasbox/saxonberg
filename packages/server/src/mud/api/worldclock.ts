/**
 * WorldClockApi — thin facade over the world-clock substrate.
 *
 * Stable caller-facing surface. The orchestration + registry resolution
 * live in the hot-reloadable {@link WorldClockLogic} singleton at
 * `/platform/idea/api/worldclock`, reached synchronously via
 * `StuffApi.singletonSync`; the Logic resolves the
 * `WorldClockRegistry` singleton (at `/platform/idea/WorldClockRegistry`) where
 * all clock state actually lives. `dest /platform/idea/api/worldclock` reloads
 * the Logic; the Registry's state is unaffected.
 *
 * The Registry's public methods carry a gate that admits this module
 * AND the logic singleton (`FromTemplate('/platform/idea/api/worldclock')`), so
 * external code that grabs the Registry Stuff via
 * `StuffApi.findByTemplatePath` still cannot call its methods. The
 * narrow-entry pattern holds: state has one home, and one
 * structurally-enforced path between callers and it.
 *
 * `shutdown()` keeps its `SystemRoot` gate on this
 * forwarder so the null-caller process-boundary requirement is
 * unchanged.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import { Quantity } from '../lib/quantity';
import type { Calendar, CalendarDate } from '../lib/time/Calendar';
import { SecurityApi } from './security';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { CallSecurity, TestOnly } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { WorldClockLogic } from '../platform/idea/api/WorldClockLogic';
import { fileURLToPath } from 'url';

// DI seam: re-exported so `WorldClockRegistry` registers its class through
// this facade rather than importing the logic singleton directly (the
// no-import-from-*Logic rule). The load-time mechanism lives in
// `WorldClockLogic`; this is a pure pass-through re-export.
export { registerWorldClockRegistryClass } from '../platform/idea/api/WorldClockLogic';

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

/* ─────────────────────────── logic resolution ─────────────────────────── */

const LOGIC_PATH = '/platform/idea/api/worldclock';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/WorldClockLogic', import.meta.url)
);

/** Resolve the HMR-able WorldClockLogic singleton (sync). */
function logic(): WorldClockLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'WorldClockLogic'
      ) as typeof WorldClockLogic | null) ?? WorldClockLogic)()
  );
}

/* ─────────────────────────── WorldClockApi ─────────────────────────── */

export class WorldClockApi {
  private constructor() {}

  /** Default time scale (game-seconds per real-second). Requirements D2. */
  static readonly DEFAULT_SCALE = 12;

  /** Crash-backstop snapshot cadence (module constant, not a setting). */
  static readonly SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

  /* ──────────────────── core queries / control ──────────────────── */

  public static getNow(): Quantity<'s'> {
    return logic().getNow();
  }

  public static getScale(): number {
    return logic().getScale();
  }

  public static setScale(scale: number): void {
    logic().setScale(scale);
  }

  public static pause(): void {
    logic().pause();
  }

  public static resume(): void {
    logic().resume();
  }

  public static isPaused(): boolean {
    return logic().isPaused();
  }

  /**
   * ⛔ **A TEST SEAM. In a normal runtime this method does not exist.**
   *
   * Move world-time forward by `by`, firing every schedule the skipped
   * interval contains — one-shots once, an `every` once per missed
   * period, in deadline order.
   *
   * It exists because a game day is about two real hours, so a *test*
   * cannot observe anything a slow system does over a season. The slow
   * systems themselves need nothing from it: a sap run, a lactation
   * curve and a fleece's year are all reconcile-on-read, and the realm
   * reaches them by living. Only a scheduled act needs the interval
   * actually walked, which is what the drain does.
   *
   * ⚠⚠ **It is NOT an in-world capability, and the earlier version of
   * this comment claiming it was is the mistake the `@TestOnly` marker
   * exists to make unrepeatable.** Nothing a player does moves the
   * realm's clock; there is one clock, it is global, and a jump ages
   * every reconcile-on-read system in the world at once. An
   * immersion-breaking act is not made acceptable by being receipted.
   *
   * The two clock seams are different instruments:
   *
   *   - `_advanceForTesting(realMs)` moves the **injected real clock**,
   *     and only works where a now-provider was injected — so,
   *     in-process unit tests. 44 unit cases walk real game years that
   *     way.
   *   - `advance(by)` moves the **game-time anchor** on a live running
   *     world, and is what a wire drive has to use: it speaks to the
   *     server over a socket and cannot inject anything.
   *
   * ⚠ A jump of years is a loop of thousands of fires. Jump a season at
   * a time. ⚠ And it **throws while the clock is paused** — a paused
   * clock cannot fire, so a jump there would strand every schedule in
   * the interval.
   *
   * @param by game-time to skip, as a `Quantity<'s'>` or a duration
   *   string in the same format `after()` accepts (`'3 days'`,
   *   `'5 minutes'`).
   *
   * @internal ⭐ Not author surface, and the `callable == visible ==
   *   cared-about` invariant makes that mandatory rather than tidy: in
   *   any world an author is working in, this is not callable, so it
   *   must not be visible in the generated docs either.
   */
  @TestOnly(
    'Nothing in the game moves the realm\u2019s clock: there is one ' +
      'clock, it is global, and a jump ages every reconcile-on-read ' +
      'system in the world at once. A slow system reaches its own state ' +
      'by being read, so it needs nothing from here \u2014 pin the ' +
      'arithmetic in a unit test instead (Producing.test.ts and ' +
      'SapStandard.test.ts walk real game years that way). A wire drive ' +
      'that genuinely needs the skipped interval WALKED must own the ' +
      'world it is driving: run it with WIRE_BOOT=1.',
  )
  public static advance(by: Quantity<'s'> | string): void {
    logic().advance(by);
  }

  /* ──────────────────── persistence (own-thing model) ──────────────────── */

  public static snapshot(): WorldClockSnapshot {
    return logic().snapshot();
  }

  public static restore(snap: WorldClockSnapshot): void {
    logic().restore(snap);
  }

  /**
   * Shut the clock down gracefully: pause game-time and persist the
   * elapsed-game-time anchor so the next boot resumes continuously.
   *
   * `SystemRoot`-gated: only the empty-stack process-boundary caller
   * (the `AppBootstrap.shutdown` sequence) has a `null` caller. Every
   * game, eval, scheduled-callback, and network context runs under a
   * frame (non-null caller) and is denied — nothing in-world can
   * freeze world-time. (The boot itself is the Registry's own
   * `postRegister` — self-warming via the boot manifest.)
   */
  @CallSecurity(SecurityPolicies.SystemRoot)
  public static async shutdown(): Promise<void> {
    await logic().shutdown();
  }

  /* ──────────────────── scheduling primitives ──────────────────── */

  public static after(
    delay: Quantity<'s'> | string,
    cb: ClockCallback,
    opts?: ScheduleOpts
  ): ClockHandle {
    return logic().after(delay, cb, opts);
  }

  public static at(
    deadline: Quantity<'s'>,
    cb: ClockCallback,
    opts?: ScheduleOpts
  ): ClockHandle {
    return logic().at(deadline, cb, opts);
  }

  public static every(
    interval: Quantity<'s'> | string,
    cb: ClockCallback,
    opts?: ScheduleOpts & { startAt?: Quantity<'s'>; runs?: number }
  ): ClockHandle {
    return logic().every(interval, cb, opts);
  }

  /** Cancel every schedule with `tag`; if `host` given, AND on host identity. */
  public static cancelByTag(tag: string, host?: Stuff): number {
    return logic().cancelByTag(tag, host);
  }

  public static cancelByHost(host: Stuff): number {
    return logic().cancelByHost(host);
  }

  /**
   * Cancel every schedule registered from `scope`'s circle context — the
   * sandbox reap seam (continuations die with their circle). @internal
   */
  public static cancelAllForScope(scope: string): number {
    return logic().cancelAllForScope(scope);
  }

  /* ──────────────────── calendar-aware scheduling ──────────────────── */

  /**
   * Fire once at an absolute calendar date. A `CalendarDate` is
   * composed to a deadline; a string is parsed via the calendar's
   * `parseDate`. Defaults to `DefaultCalendar`.
   */
  public static onDate(
    date: CalendarDate | string,
    cb: ClockCallback,
    opts?: ScheduleOpts & { calendar?: Calendar }
  ): ClockHandle {
    return logic().onDate(date, cb, opts);
  }

  /**
   * Fire on every calendar date matching a partial pattern. Self-
   * rescheduling: each fire recomputes the next matching deadline.
   */
  public static cron(
    pattern: CronPattern,
    cb: ClockCallback,
    opts?: ScheduleOpts & { calendar?: Calendar }
  ): ClockHandle {
    return logic().cron(pattern, cb, opts);
  }

  /* ──────────────────── test seams ──────────────────── */

  static _setNowProviderForTesting(fn: () => number): void {
    SecurityApi.assertTestOnly('_setNowProviderForTesting');
    logic()._setNowProvider(fn);
  }

  static _resetForTesting(): void {
    SecurityApi.assertTestOnly('_resetForTesting');
    // Force the lazy-create when no Registry exists yet, so callers
    // get a freshly-reset clock instead of one that the next access
    // would mint with `Date.now()` already baked into the anchor.
    logic()._resetForTesting();
  }

  static _advanceForTesting(realMs: number): void {
    SecurityApi.assertTestOnly('_advanceForTesting');
    logic()._advanceForTesting(realMs);
  }
}

SecurityApi.decorateApiClass(WorldClockApi);
