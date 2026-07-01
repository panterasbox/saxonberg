// SchedulerLogic — the hot-reloadable logic singleton behind
// SchedulerApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { AbortReason } from '@saxonberg/types';
import type { Engaged, EngagementSlot } from '../../lib/activity/Engaged';
import { StuffApi } from '../../api/stuff';
import { TemplatePaths } from '../../lib/paths';
import type SchedulerRegistry from '../SchedulerRegistry';
import type {
  ActivityClass,
  Engagement,
  StartResult,
} from '../../api/scheduler';

const SchedulerApiCallers = SecurityPolicies.FromModule(
  'api/scheduler#SchedulerApi'
);

/* ─────────────────────── registry resolution ─────────────────────── */
// Module-level so it survives the logic singleton's destruct/recreate
// across HMR. `findByTemplatePath` is O(1), so no cache is needed.

const REGISTRY_PATH = TemplatePaths.schedulerRegistry;

let registryClass: (new () => SchedulerRegistry) | null = null;

/**
 * Pending activity-class registrations, buffered at module level so they
 * survive ordering and HMR. Activity modules self-register at
 * module-load (the HMR seam — see {@link SchedulerApi.registerActivity}),
 * but the Registry isn't seeded until `BootstrapManager.run()` clones it
 * from the manifest — which happens AFTER the eager import graph that
 * pulls those activity modules in (e.g. `Creature` → `RespirationMixin`
 * → `RespirationDrain`). Rather than couple registration to that order
 * (or land it on a throwaway transient the manifest clone would
 * replace), every registration is recorded here and {@link flushPending}
 * replays them onto whatever Registry is live whenever one is resolved.
 * Module-level so it outlives the logic singleton's destruct/recreate
 * and a Registry re-seed.
 */
const pendingActivities = new Map<string, ActivityClass>();

/** Replay every buffered registration onto `reg` (idempotent — plain
 *  `Map.set`s, so re-seed / HMR re-flush is safe and cheap). */
function flushPending(reg: SchedulerRegistry): SchedulerRegistry {
  for (const [type, cls] of pendingActivities) reg.registerActivity(type, cls);
  return reg;
}

/**
 * Buffer an activity-class registration and write it through to a live
 * Registry if one already exists. Safe to call before bootstrap: when
 * no Registry is seeded yet it simply buffers, and {@link resolveRegistry}
 * flushes the buffer the first time the seeded Registry is resolved.
 * @internal
 */
function bufferActivity(type: string, cls: ActivityClass): void {
  pendingActivities.set(type, cls);
  const live = lookupRegistry();
  if (live) live.registerActivity(type, cls);
}

/**
 * Called from `obj/SchedulerRegistry.ts` module body so this file
 * doesn't have to value-import the Registry class (cycle avoidance —
 * see WorldClockLogic for the rationale).
 * @internal
 */
export function registerSchedulerRegistryClass(
  cls: new () => SchedulerRegistry
): void {
  registryClass = cls;
}

/** Non-lazy registry lookup (returns `null` when none seeded). */
function lookupRegistry(): SchedulerRegistry | null {
  return StuffApi.findByTemplatePath<SchedulerRegistry>(REGISTRY_PATH) ?? null;
}

/**
 * Resolve the Registry, lazy-creating a transient in-memory instance if
 * `BootstrapManager.run()` hasn't seeded one yet. Production hits the
 * manifest path; tests fall through here. Either way the buffered
 * activity registrations are flushed onto the resolved Registry, so
 * module-load self-registration lands regardless of boot order. Throws
 * only when the class hasn't been registered (the Registry module wasn't
 * loaded at all).
 */
function resolveRegistry(): SchedulerRegistry {
  const existing = lookupRegistry();
  if (existing) return flushPending(existing);
  if (!registryClass) {
    throw new Error(
      'SchedulerLogic: SchedulerRegistry not bootstrapped and its ' +
        'class is not registered. Either run BootstrapManager.run() ' +
        "or import '../SchedulerRegistry' so its module-load side " +
        'effect registers the class.'
    );
  }
  const reg = StuffApi.createSync<SchedulerRegistry>(() => new registryClass!());
  reg.setTemplatePath(REGISTRY_PATH);
  return flushPending(reg);
}

/**
 * SchedulerLogic — the hot-reloadable logic singleton behind
 * {@link SchedulerApi}.
 *
 * Lives at `/obj/api/scheduler` (a stateless `Stuff` singleton, no
 * backing `Template`); `SchedulerApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`) — all
 * engagement state lives on the `SchedulerRegistry` at
 * `/obj/SchedulerRegistry`, resolved via the module-level
 * `resolveRegistry()` (which survives this singleton's destruct/recreate
 * across HMR). The registry-class registration slot is likewise
 * module-level so the Registry's module-load side-effect lands on a
 * stable target.
 *
 * The introspection helpers `getEngagements` / `getEngagementBySlot`
 * read directly off the actor (no Registry touch); the test seams use
 * the non-lazy `lookupRegistry()` so they no-op when nothing is seeded
 * (matching the prior Api behaviour).
 *
 * The `FromModule` gate is applied **per public method**, not at the
 * class level — see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class SchedulerLogic extends Idea {
  /* ──────────────────── activity-class registry ──────────────────── */

  /** See {@link SchedulerApi.registerActivity}. */
  @CallSecurity(SchedulerApiCallers)
  public registerActivity(type: string, cls: ActivityClass): void {
    // Buffer-and-write-through: tolerates registration before the
    // Registry is seeded (activity modules self-register at module-load,
    // ahead of `BootstrapManager.run()`). The buffer is replayed onto
    // the Registry whenever it's resolved — see `bufferActivity` /
    // `flushPending`.
    bufferActivity(type, cls);
  }

  /** See {@link SchedulerApi.getActivityClass}. */
  @CallSecurity(SchedulerApiCallers)
  public getActivityClass(type: string): ActivityClass | undefined {
    return resolveRegistry().getActivityClass(type);
  }

  /** See {@link SchedulerApi.reloadActivity}. */
  @CallSecurity(SchedulerApiCallers)
  public async reloadActivity(type: string): Promise<void> {
    await resolveRegistry().reloadActivity(type);
  }

  /* ──────────────────── lifecycle: start ──────────────────── */

  /** See {@link SchedulerApi.start}. */
  @CallSecurity(SchedulerApiCallers)
  public start(engagement: Engagement): StartResult {
    return resolveRegistry().start(engagement);
  }

  /* ──────────────────── lifecycle: cancel family ──────────────────── */

  /** See {@link SchedulerApi.cancel}. */
  @CallSecurity(SchedulerApiCallers)
  public cancel(engagement: Engagement, reason: AbortReason): void {
    resolveRegistry().cancel(engagement, reason);
  }

  /** See {@link SchedulerApi.cancelAll}. */
  @CallSecurity(SchedulerApiCallers)
  public cancelAll(actor: Stuff & Engaged): void {
    resolveRegistry().cancelAll(actor);
  }

  /** See {@link SchedulerApi.cancelByType}. */
  @CallSecurity(SchedulerApiCallers)
  public cancelByType(actor: Stuff & Engaged, type: string): void {
    resolveRegistry().cancelByType(actor, type);
  }

  /** See {@link SchedulerApi.cancelByPredicate}. */
  @CallSecurity(SchedulerApiCallers)
  public cancelByPredicate(
    actor: Stuff & Engaged,
    pred: (e: Engagement) => boolean
  ): void {
    resolveRegistry().cancelByPredicate(actor, pred);
  }

  /* ──────────────────── introspection ──────────────────── */

  /** See {@link SchedulerApi.getEngagements}. Reads off the actor. */
  @CallSecurity(SchedulerApiCallers)
  public getEngagements(actor: Stuff & Engaged): readonly Engagement[] {
    return actor.getEngagements();
  }

  /** See {@link SchedulerApi.getEngagementBySlot}. Reads off the actor. */
  @CallSecurity(SchedulerApiCallers)
  public getEngagementBySlot(
    actor: Stuff & Engaged,
    slot: EngagementSlot
  ): Engagement | undefined {
    return actor.getEngagementBySlot(slot);
  }

  /** See {@link SchedulerApi.getEngagementById}. */
  @CallSecurity(SchedulerApiCallers)
  public getEngagementById(id: string): Engagement | undefined {
    return resolveRegistry().getEngagementById(id);
  }

  /* ──────────────────── test seams ──────────────────── */

  /** See {@link SchedulerApi._clearAllForTesting}. */
  @CallSecurity(SchedulerApiCallers)
  public _clearAllForTesting(): void {
    // Clear the module-level buffer too, else a buffered registration
    // from an earlier test replays onto the next test's fresh Registry
    // via `flushPending` and breaks isolation.
    pendingActivities.clear();
    const reg = lookupRegistry();
    if (reg) reg._clearAllForTesting();
  }

  /** See {@link SchedulerApi._unregisterActivityForTesting}. */
  @CallSecurity(SchedulerApiCallers)
  public _unregisterActivityForTesting(type: string): void {
    // Drop from the buffer so `flushPending` can't re-add it.
    pendingActivities.delete(type);
    const reg = lookupRegistry();
    if (reg) reg._unregisterActivityForTesting(type);
  }
}
