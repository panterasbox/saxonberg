// SubscriptionLogic — the hot-reloadable logic singleton behind
// SubscriptionApi. (Doc comment lives on the
// class declaration below so @internal lands on the reflection TypeDoc
// emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { StuffApi } from '../../../api/stuff';
import { TemplatePaths } from '../../../lib/paths';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type MqlSubscriptionRegistry from '../MqlSubscriptionRegistry';
import SubscriptionRegistry from '../SubscriptionRegistry';
import type {
  QueryRequest,
} from '../../../api/subscription';

const SubscriptionApiCallers = SecurityPolicies.FromModule('/api/subscription#SubscriptionApi');

/** The protocol's one table (lazy-created in tests; a row in prod). */
function protocol(): SubscriptionRegistry {
  return StuffApi.singletonSync<SubscriptionRegistry>(
    TemplatePaths.subscriptionRegistry,
    () => new SubscriptionRegistry(),
  );
}

/* ─────────────────────── the MQL source's resolution ─────────────────────── */
// Module-level so it survives the logic singleton's destruct/recreate
// across HMR. `findByTemplatePath` is O(1), so no cache is needed.

const REGISTRY_PATH = TemplatePaths.mqlSubscriptionRegistry;

let registryClass: (new () => MqlSubscriptionRegistry) | null = null;

/**
 * Called from `obj/MqlSubscriptionRegistry.ts` module body so this file
 * doesn't have to value-import the Registry class (cycle avoidance —
 * see WorldClockLogic for the rationale).
 * @internal
 */
export function registerMqlSubscriptionRegistryClass(
  cls: new () => MqlSubscriptionRegistry
): void {
  registryClass = cls;
}

/** Non-lazy registry lookup (returns `null` when none seeded). */
function lookupRegistry(): MqlSubscriptionRegistry | null {
  return (
    StuffApi.findByTemplatePath<MqlSubscriptionRegistry>(REGISTRY_PATH) ?? null
  );
}

/**
 * Resolve the Registry, lazy-creating a transient in-memory instance if
 * `BootstrapManager.run()` hasn't seeded one yet. Production hits the
 * manifest path; tests fall through here. Throws when the class hasn't
 * been registered (the Registry module wasn't loaded).
 */
function resolveRegistry(): MqlSubscriptionRegistry {
  const existing = lookupRegistry();
  if (existing) return existing;
  if (!registryClass) {
    throw new Error(
      'SubscriptionLogic: MqlSubscriptionRegistry not bootstrapped ' +
        'and its class is not registered. Either run ' +
        "BootstrapManager.run() or import '../MqlSubscriptionRegistry' " +
        'so its module-load side effect registers the class.'
    );
  }
  const reg = StuffApi.createSync<MqlSubscriptionRegistry>(
    () => new registryClass!()
  );
  reg.setTemplatePath(REGISTRY_PATH);
  return reg;
}

/**
 * SubscriptionLogic — the hot-reloadable logic singleton behind
 * {@link SubscriptionApi}, the one subscription Api.
 *
 * Lives at `/platform/idea/api/subscription` (a stateless `Stuff`
 * singleton, no backing `Template`). Stateless by construction: the
 * protocol's table is the {@link SubscriptionRegistry}, and the MQL
 * source's index lives on the `MqlSubscriptionRegistry` — both resolved
 * at module level so they survive this singleton's destruct/recreate
 * across HMR. The stateless projection helpers stay on the Api module.
 *
 * The MQL test seams use the non-lazy `lookupRegistry()` so they no-op
 * when nothing is seeded.
 *
 * The `FromModule` gate is applied **per public method**, not at the
 * class level — see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class SubscriptionLogic extends ApiLogic {
  /* ─── public surface ─── */

  /** See {@link SubscriptionApi.poke}. */
  @CallSecurity(SubscriptionApiCallers)
  public poke(source: string, holder: Stuff | null, hint?: unknown): void {
    protocol().poke(source, holder, hint);
  }

  /** See {@link SubscriptionApi.handleQuery}. */
  @CallSecurity(SubscriptionApiCallers)
  public handleQuery(
    req: Omit<QueryRequest, 'query' | 'cardinality'> &
      Partial<Pick<QueryRequest, 'query' | 'cardinality'>>
  ): void {
    resolveRegistry().handleQuery(req);
  }

  /** See {@link SubscriptionApi.cancelAllForScope}. */
  @CallSecurity(SubscriptionApiCallers)
  public cancelAllForScope(scope: string): number {
    return resolveRegistry().cancelAllForScope(scope);
  }

  /* ─── test seams ─── */

  /** See {@link SubscriptionApi._countForTesting}. */
  @CallSecurity(SubscriptionApiCallers)
  public _count(): number {
    return protocol().count();
  }

  /** See {@link SubscriptionApi._getRegistrySizeForTesting}. */
  @CallSecurity(SubscriptionApiCallers)
  public _getRegistrySize(): number {
    const reg = lookupRegistry();
    return reg ? reg._getRegistrySize() : 0;
  }

  /** See {@link SubscriptionApi._getDependencyIndexEntryCountForTesting}. */
  @CallSecurity(SubscriptionApiCallers)
  public _getDependencyIndexEntryCount(): number {
    const reg = lookupRegistry();
    return reg ? reg._getDependencyIndexEntryCount() : 0;
  }

  /** See {@link SubscriptionApi._drainScheduledForTesting}. */
  @CallSecurity(SubscriptionApiCallers)
  public async _drainScheduled(): Promise<void> {
    const reg = lookupRegistry();
    if (reg) await reg._drainScheduled();
  }

  /** See {@link SubscriptionApi._clearAllForTesting}. */
  @CallSecurity(SubscriptionApiCallers)
  public _clearAll(): void {
    // ⭐ Stands the registry (a suite's `StuffApi.clearAll()` has just
    // removed it): the protocol finds a source by what stands at its
    // path, and a suite has no row to load it from.
    resolveRegistry()._clearAll();
  }
}
