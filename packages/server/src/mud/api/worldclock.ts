/**
 * WorldClockApi — thin facade over the `WorldClockRegistry` singleton.
 *
 * Stable caller-facing surface for the world-clock substrate. Every
 * state-touching method delegates to the Registry; the Registry's
 * methods carry `@CallSecurity(FromModule('mud/api/worldclock#WorldClockApi'))`
 * so the security gate denies any caller outside this module. External
 * code that grabs the Registry Stuff via `StuffApi.findByTemplatePath`
 * cannot call its methods; this Api is the only legitimate path.
 *
 * State lives on the Registry (anchor pair + scale + pause flag,
 * injectable real clock, schedule registry, heartbeat handle). Reload
 * of this file invalidates only the cached Registry pointer; reload
 * of `obj/WorldClockRegistry.ts` re-clones the Stuff per HotReloadApi's
 * pattern (state resets, `postRegister` re-runs idempotently).
 *
 * The narrow-entry pattern: `WorldClockApi` is reachable from anywhere,
 * mediating every call into the Registry. State has one home, one
 * calling surface, and one structurally-enforced path between them.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import { Quantity } from '../lib/quantity';
import type { Calendar, CalendarDate } from '../lib/time/Calendar';
import { SecurityApi } from './security';
import { StuffApi } from './stuff';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import type WorldClockRegistry from '../obj/WorldClockRegistry';
import { TemplatePaths } from '../lib/paths';

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

/* ─────────────────────────── WorldClockApi ─────────────────────────── */

const REGISTRY_PATH = TemplatePaths.worldClockRegistry;

export class WorldClockApi {
  private constructor() {}

  /** Default time scale (game-seconds per real-second). Requirements D2. */
  static readonly DEFAULT_SCALE = 12;

  /** Crash-backstop snapshot cadence (module constant, not a setting). */
  static readonly SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

  /** Cached pointer to the Registry singleton. Pure lookup cache. */
  static #registryRef: WorldClockRegistry | null = null;

  /**
   * Registry class slot. Set as a module-side-effect at the bottom of
   * `obj/WorldClockRegistry.ts` so the Api doesn't have to value-import
   * the Registry class (which would create an `api/stuff` → `api/event`
   * → `obj/EventSubscriptions` → `lib/stuff/Idea` cycle for Registries
   * that ride EventApi). With the class registered, `#registry()` can
   * lazy-create an in-memory instance for test harnesses that haven't
   * run `BootstrapManager.run()`.
   */
  static #registryClass: (new () => WorldClockRegistry) | null = null;

  /** @internal — called from `obj/WorldClockRegistry.ts` module body. */
  public static _registerRegistryClass(
    cls: new () => WorldClockRegistry,
  ): void {
    WorldClockApi.#registryClass = cls;
  }

  static #lookupRegistry(): WorldClockRegistry | null {
    if (WorldClockApi.#registryRef) return WorldClockApi.#registryRef;
    const reg = StuffApi.findByTemplatePath<WorldClockRegistry>(REGISTRY_PATH);
    if (reg) WorldClockApi.#registryRef = reg;
    return reg ?? null;
  }

  /**
   * Resolve the Registry, lazy-creating a transient in-memory instance
   * if `BootstrapManager.run()` hasn't seeded one yet. The bootstrap
   * manifest entry at `/obj/WorldClockRegistry` is the production path;
   * the lazy-create branch covers test harnesses. Throws when the
   * class hasn't been registered (the Registry module wasn't loaded).
   */
  static #registry(): WorldClockRegistry {
    const existing = WorldClockApi.#lookupRegistry();
    if (existing) return existing;
    if (!WorldClockApi.#registryClass) {
      throw new Error(
        'WorldClockApi: WorldClockRegistry not bootstrapped and its ' +
          'class is not registered. Either run BootstrapManager.run() ' +
          "or import '../obj/WorldClockRegistry' so its module-load " +
          'side effect registers the class.',
      );
    }
    const reg = StuffApi.createSync<WorldClockRegistry>(
      () => new WorldClockApi.#registryClass!(),
    );
    reg.setTemplatePath(REGISTRY_PATH);
    WorldClockApi.#registryRef = reg;
    return reg;
  }

  /* ──────────────────── core queries / control ──────────────────── */

  public static getNow(): Quantity<'s'> {
    return WorldClockApi.#registry().getNow();
  }

  public static getScale(): number {
    return WorldClockApi.#registry().getScale();
  }

  public static setScale(scale: number): void {
    WorldClockApi.#registry().setScale(scale);
  }

  public static pause(): void {
    WorldClockApi.#registry().pauseClock();
  }

  public static resume(): void {
    WorldClockApi.#registry().resumeClock();
  }

  public static isPaused(): boolean {
    return WorldClockApi.#registry().isPaused();
  }

  /* ──────────────────── persistence (own-thing model) ──────────────────── */

  public static snapshot(): WorldClockSnapshot {
    return WorldClockApi.#registry().snapshot();
  }

  public static restore(snap: WorldClockSnapshot): void {
    WorldClockApi.#registry().restore(snap);
  }

  /**
   * Boot the clock: restore the persisted game-time anchor (or seed a
   * zero clock on a fresh DB), start the crash backstop, and register
   * any system-scope schedules. Called once from `AppBootstrap.run`
   * after the bootstrap manifest.
   *
   * `SystemRoot`-gated: only the empty-stack process-boundary caller
   * (the `AppBootstrap.run` sequence) has a `null` caller. Every game,
   * eval, scheduled-callback, and network context runs under a frame
   * (non-null caller) and is denied — nothing in-world can re-anchor
   * the clock or restart its backstop.
   */
  @CallSecurity(SecurityPolicies.SystemRoot)
  public static async boot(): Promise<void> {
    await WorldClockApi.#registry().boot();
  }

  /**
   * Shut the clock down gracefully: pause game-time and persist the
   * elapsed-game-time anchor so the next boot resumes continuously.
   * `SystemRoot`-gated for the same reason as `boot()`.
   */
  @CallSecurity(SecurityPolicies.SystemRoot)
  public static async shutdown(): Promise<void> {
    await WorldClockApi.#registry().shutdown();
  }

  /* ──────────────────── scheduling primitives ──────────────────── */

  public static after(
    delay: Quantity<'s'> | string,
    cb: ClockCallback,
    opts?: ScheduleOpts,
  ): ClockHandle {
    return WorldClockApi.#registry().after(delay, cb, opts);
  }

  public static at(
    deadline: Quantity<'s'>,
    cb: ClockCallback,
    opts?: ScheduleOpts,
  ): ClockHandle {
    return WorldClockApi.#registry().at(deadline, cb, opts);
  }

  public static every(
    interval: Quantity<'s'> | string,
    cb: ClockCallback,
    opts?: ScheduleOpts & { startAt?: Quantity<'s'>; runs?: number },
  ): ClockHandle {
    return WorldClockApi.#registry().every(interval, cb, opts);
  }

  public static cancel(handle: ClockHandle): void {
    handle.cancel();
  }

  /** Cancel every schedule with `tag`; if `host` given, AND on host identity. */
  public static cancelByTag(tag: string, host?: Stuff): number {
    return WorldClockApi.#registry().cancelByTag(tag, host);
  }

  public static cancelByHost(host: Stuff): number {
    return WorldClockApi.#registry().cancelByHost(host);
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
    opts?: ScheduleOpts & { calendar?: Calendar },
  ): ClockHandle {
    return WorldClockApi.#registry().onDate(date, cb, opts);
  }

  /**
   * Fire on every calendar date matching a partial pattern. Self-
   * rescheduling: each fire recomputes the next matching deadline.
   */
  public static cron(
    pattern: CronPattern,
    cb: ClockCallback,
    opts?: ScheduleOpts & { calendar?: Calendar },
  ): ClockHandle {
    return WorldClockApi.#registry().cron(pattern, cb, opts);
  }

  /* ──────────────────── HMR / test seams ──────────────────── */

  /**
   * HMR seam: drop the cached Registry pointer so the next call
   * re-resolves. Called when `api/worldclock.ts` is reloaded.
   * Registry state itself is unaffected.
   * @internal
   */
  public static _resetRegistryRefForReload(): void {
    WorldClockApi.#registryRef = null;
  }

  static _setNowProviderForTesting(fn: () => number): void {
    SecurityApi.assertTestOnly('_setNowProviderForTesting');
    WorldClockApi.#registry()._setNowProvider(fn);
  }

  static _resetForTesting(): void {
    SecurityApi.assertTestOnly('_resetForTesting');
    // Force the lazy-create when no Registry exists yet, so callers
    // get a freshly-reset clock instead of one that the next access
    // would mint with `Date.now()` already baked into the anchor.
    WorldClockApi.#registry()._resetForTesting();
  }

  static _advanceForTesting(realMs: number): void {
    SecurityApi.assertTestOnly('_advanceForTesting');
    WorldClockApi.#registry()._advanceForTesting(realMs);
  }
}

SecurityApi.decorateApiClass(WorldClockApi);
