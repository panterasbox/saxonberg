// SchedulerLogic — the hot-reloadable logic singleton behind
// SchedulerApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { AbortReason } from '@saxonberg/types';
import type { Engaged, EngagementSlot } from '../../../lib/activity/Engaged';
import { StuffApi } from '../../../api/stuff';
import { TemplatePaths } from '../../../lib/paths';
import type SchedulerRegistry from '../SchedulerRegistry';
import type {
  ActivityClass,
  Engagement,
  StartResult,
} from '../../../api/scheduler';

const SchedulerApiCallers = SecurityPolicies.FromModule('/api/scheduler#SchedulerApi'
);

/* ─────────────────────── registry resolution ─────────────────────── */
// Module-level so it survives the logic singleton's destruct/recreate
// across HMR. `findByTemplatePath` is O(1), so no cache is needed.

const REGISTRY_PATH = TemplatePaths.schedulerRegistry;

let registryClass: (new () => SchedulerRegistry) | null = null;

/**
 * Hand the Registry class to this module (a boot-lifecycle call from
 * `BootstrapManager.installFrameworkWiring` — never a module-scope side
 * effect) so this file doesn't value-import the Registry class (cycle
 * avoidance — see WorldClockLogic for the rationale). With the class
 * registered, `resolveRegistry()` can lazy-create an in-memory instance
 * for test harnesses that haven't run `BootstrapManager.run()`.
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
 * manifest path; tests fall through here. (Activity classes need no
 * flush pass — the dispatch index populates by capture-at-start on the
 * Registry itself.) Throws only when the class hasn't been registered
 * (the Registry module wasn't loaded at all).
 */
function resolveRegistry(): SchedulerRegistry {
  const existing = lookupRegistry();
  if (existing) return existing;
  if (!registryClass) {
    throw new Error(
      'SchedulerLogic: SchedulerRegistry not bootstrapped and its ' +
        'class is not registered. Run BootstrapManager.run() (or its ' +
        'installFrameworkWiring pass, which the vitest setup performs).'
    );
  }
  const reg = StuffApi.createSync<SchedulerRegistry>(() => new registryClass!());
  reg.setTemplatePath(REGISTRY_PATH);
  return reg;
}

/**
 * SchedulerLogic — the hot-reloadable logic singleton behind
 * {@link SchedulerApi}.
 *
 * Lives at `/platform/idea/api/scheduler` (a stateless `Stuff` singleton, no
 * backing `Template`); `SchedulerApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`) — all
 * engagement state lives on the `SchedulerRegistry` at
 * `/platform/idea/SchedulerRegistry`, resolved via the module-level
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
export class SchedulerLogic extends ApiLogic {
  /* ─────────────── activity-class dispatch index ─────────────── */

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

  /** See {@link SchedulerApi.complete}. */
  @CallSecurity(SchedulerApiCallers)
  public complete(engagement: Engagement): void {
    resolveRegistry().complete(engagement);
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

  /** See {@link SchedulerApi.getEngagementById}. */
  @CallSecurity(SchedulerApiCallers)
  public getEngagementById(id: string): Engagement | undefined {
    return resolveRegistry().getEngagementById(id);
  }

  /* ──────────────────── test seams ──────────────────── */

  /** See {@link SchedulerApi._clearAllForTesting}. */
  @CallSecurity(SchedulerApiCallers)
  public _clearAllForTesting(): void {
    const reg = lookupRegistry();
    if (reg) reg._clearAllForTesting();
  }

  /** See {@link SchedulerApi._unregisterActivityForTesting}. */
  @CallSecurity(SchedulerApiCallers)
  public _unregisterActivityForTesting(type: string): void {
    const reg = lookupRegistry();
    if (reg) reg._unregisterActivityForTesting(type);
  }
}
