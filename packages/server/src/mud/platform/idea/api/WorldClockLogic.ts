// WorldClockLogic — the hot-reloadable logic singleton behind
// WorldClockApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { Quantity } from '../../../lib/quantity';
import type { Calendar, CalendarDate } from '../../../lib/time/Calendar';
import { StuffApi } from '../../../api/stuff';
import { TemplatePaths } from '../../../lib/paths';
import type WorldClockRegistry from '../WorldClockRegistry';
import type {
  ClockCallback,
  ClockHandle,
  CronPattern,
  ScheduleOpts,
  WorldClockSnapshot,
} from '../../../api/worldclock';

const WorldClockApiCallers = SecurityPolicies.FromModule('/api/worldclock#WorldClockApi'
);

/* ─────────────────────── registry resolution ─────────────────────── */
// Module-level so it survives the logic singleton's destruct/recreate
// across HMR. `findByTemplatePath` is O(1), so no `#registryRef` cache
// is needed.

const REGISTRY_PATH = TemplatePaths.worldClockRegistry;

let registryClass: (new () => WorldClockRegistry) | null = null;

/**
 * Cached Registry pointer. Module-level (survives the logic singleton's
 * destruct/recreate across HMR). This is NOT a perf cache — it's
 * load-bearing for the test reset pattern: `_resetForTesting()` puts the
 * Registry into test mode (frozen clock, no live heartbeat), and suites
 * then call `StuffApi.clearAll()` which wipes the template-path index.
 * Holding the pointer here means the next call reuses the reset
 * (test-mode) Registry instead of lazy-minting a fresh one with a live
 * `Date.now` heartbeat that would never settle under `_advanceForTesting`.
 * (Replaces the former `WorldClockApi.#registryRef`, which `clearAll`
 * likewise never touched.)
 */
let registryRef: WorldClockRegistry | null = null;

/**
 * Called from `obj/WorldClockRegistry.ts` module body so this file
 * doesn't have to value-import the Registry class (which would create
 * an `api/stuff` → `api/event` → `obj/EventSubscriptions` → `lib/stuff/Idea`
 * value cycle for Registries that ride EventApi). With the class
 * registered, `resolveRegistry()` can lazy-create an in-memory instance
 * for test harnesses that haven't run `BootstrapManager.run()`.
 * @internal
 */
export function registerWorldClockRegistryClass(
  cls: new () => WorldClockRegistry
): void {
  registryClass = cls;
}

/**
 * Resolve the Registry, lazy-creating a transient in-memory instance if
 * `BootstrapManager.run()` hasn't seeded one yet. The bootstrap
 * manifest entry at `/platform/idea/WorldClockRegistry` is the production path;
 * the lazy-create branch covers test harnesses. Throws when the class
 * hasn't been registered (the Registry module wasn't loaded).
 */
function resolveRegistry(): WorldClockRegistry {
  if (registryRef) return registryRef;
  const existing =
    StuffApi.findByTemplatePath<WorldClockRegistry>(REGISTRY_PATH);
  if (existing) {
    registryRef = existing;
    return existing;
  }
  if (!registryClass) {
    throw new Error(
      'WorldClockLogic: WorldClockRegistry not bootstrapped and its ' +
        'class is not registered. Either run BootstrapManager.run() ' +
        "or import '../WorldClockRegistry' so its module-load " +
        'side effect registers the class.'
    );
  }
  const reg = StuffApi.createSync<WorldClockRegistry>(
    () => new registryClass!()
  );
  reg.setTemplatePath(REGISTRY_PATH);
  registryRef = reg;
  return reg;
}

/**
 * WorldClockLogic — the hot-reloadable logic singleton behind
 * {@link WorldClockApi}.
 *
 * Lives at `/platform/idea/api/worldclock` (a stateless `Stuff` singleton, no
 * backing `Template`); `WorldClockApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`) — all clock /
 * scheduler state lives on the `WorldClockRegistry` at
 * `/platform/idea/WorldClockRegistry`, resolved via the module-level
 * `resolveRegistry()` (which survives this singleton's destruct/recreate
 * across HMR). The registry-class registration slot is likewise
 * module-level so the Registry's module-load side-effect lands on a
 * stable target.
 *
 * The `FromModule` gate is applied **per public method**, not at the
 * class level — see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class WorldClockLogic extends ApiLogic {
  /* ──────────────────── core queries / control ──────────────────── */

  /** See {@link WorldClockApi.getNow}. */
  @CallSecurity(WorldClockApiCallers)
  public getNow(): Quantity<'s'> {
    return resolveRegistry().getNow();
  }

  /** See {@link WorldClockApi.getScale}. */
  @CallSecurity(WorldClockApiCallers)
  public getScale(): number {
    return resolveRegistry().getScale();
  }

  /** See {@link WorldClockApi.setScale}. */
  @CallSecurity(WorldClockApiCallers)
  public setScale(scale: number): void {
    resolveRegistry().setScale(scale);
  }

  /** See {@link WorldClockApi.pause}. */
  @CallSecurity(WorldClockApiCallers)
  public pause(): void {
    resolveRegistry().pauseClock();
  }

  /** See {@link WorldClockApi.resume}. */
  @CallSecurity(WorldClockApiCallers)
  public resume(): void {
    resolveRegistry().resumeClock();
  }

  /** See {@link WorldClockApi.isPaused}. */
  @CallSecurity(WorldClockApiCallers)
  public isPaused(): boolean {
    return resolveRegistry().isPaused();
  }

  /* ──────────────────── persistence (own-thing model) ──────────────────── */

  /** See {@link WorldClockApi.snapshot}. */
  @CallSecurity(WorldClockApiCallers)
  public snapshot(): WorldClockSnapshot {
    return resolveRegistry().snapshot();
  }

  /** See {@link WorldClockApi.restore}. */
  @CallSecurity(WorldClockApiCallers)
  public restore(snap: WorldClockSnapshot): void {
    resolveRegistry().restore(snap);
  }

  /** See {@link WorldClockApi.boot}. */
  @CallSecurity(WorldClockApiCallers)
  public async boot(): Promise<void> {
    await resolveRegistry().boot();
  }

  /** See {@link WorldClockApi.shutdown}. */
  @CallSecurity(WorldClockApiCallers)
  public async shutdown(): Promise<void> {
    await resolveRegistry().shutdown();
  }

  /* ──────────────────── scheduling primitives ──────────────────── */

  /** See {@link WorldClockApi.after}. */
  @CallSecurity(WorldClockApiCallers)
  public after(
    delay: Quantity<'s'> | string,
    cb: ClockCallback,
    opts?: ScheduleOpts
  ): ClockHandle {
    return resolveRegistry().after(delay, cb, opts);
  }

  /** See {@link WorldClockApi.at}. */
  @CallSecurity(WorldClockApiCallers)
  public at(
    deadline: Quantity<'s'>,
    cb: ClockCallback,
    opts?: ScheduleOpts
  ): ClockHandle {
    return resolveRegistry().at(deadline, cb, opts);
  }

  /** See {@link WorldClockApi.every}. */
  @CallSecurity(WorldClockApiCallers)
  public every(
    interval: Quantity<'s'> | string,
    cb: ClockCallback,
    opts?: ScheduleOpts & { startAt?: Quantity<'s'>; runs?: number }
  ): ClockHandle {
    return resolveRegistry().every(interval, cb, opts);
  }

  /** See {@link WorldClockApi.cancel}. Doesn't touch the registry. */
  @CallSecurity(WorldClockApiCallers)
  public cancel(handle: ClockHandle): void {
    handle.cancel();
  }

  /** See {@link WorldClockApi.cancelByTag}. */
  @CallSecurity(WorldClockApiCallers)
  public cancelByTag(tag: string, host?: Stuff): number {
    return resolveRegistry().cancelByTag(tag, host);
  }

  /** See {@link WorldClockApi.cancelByHost}. */
  @CallSecurity(WorldClockApiCallers)
  public cancelByHost(host: Stuff): number {
    return resolveRegistry().cancelByHost(host);
  }

  /** See {@link WorldClockApi.cancelAllForScope}. */
  @CallSecurity(WorldClockApiCallers)
  public cancelAllForScope(scope: string): number {
    return resolveRegistry().cancelAllForScope(scope);
  }

  /* ──────────────────── calendar-aware scheduling ──────────────────── */

  /** See {@link WorldClockApi.onDate}. */
  @CallSecurity(WorldClockApiCallers)
  public onDate(
    date: CalendarDate | string,
    cb: ClockCallback,
    opts?: ScheduleOpts & { calendar?: Calendar }
  ): ClockHandle {
    return resolveRegistry().onDate(date, cb, opts);
  }

  /** See {@link WorldClockApi.cron}. */
  @CallSecurity(WorldClockApiCallers)
  public cron(
    pattern: CronPattern,
    cb: ClockCallback,
    opts?: ScheduleOpts & { calendar?: Calendar }
  ): ClockHandle {
    return resolveRegistry().cron(pattern, cb, opts);
  }

  /* ──────────────────── test seams ──────────────────── */

  /** See {@link WorldClockApi._setNowProviderForTesting}. */
  @CallSecurity(WorldClockApiCallers)
  public _setNowProvider(fn: () => number): void {
    resolveRegistry()._setNowProvider(fn);
  }

  /** See {@link WorldClockApi._resetForTesting}. */
  @CallSecurity(WorldClockApiCallers)
  public _resetForTesting(): void {
    resolveRegistry()._resetForTesting();
  }

  /** See {@link WorldClockApi._advanceForTesting}. */
  @CallSecurity(WorldClockApiCallers)
  public _advanceForTesting(realMs: number): void {
    resolveRegistry()._advanceForTesting(realMs);
  }
}
