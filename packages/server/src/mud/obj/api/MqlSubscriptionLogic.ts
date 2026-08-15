// MqlSubscriptionLogic — the hot-reloadable logic singleton behind the
// registry-backed slice of MqlSubscriptionApi. (Doc comment lives on the
// class declaration below so @internal lands on the reflection TypeDoc
// emits, not on the module.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type Interactive from '../Interactive';
import { StuffApi } from '../../api/stuff';
import { TemplatePaths } from '../../lib/paths';
import type MqlSubscriptionRegistry from '../MqlSubscriptionRegistry';
import type {
  QueryRequest,
  SubscribeRequest,
} from '../../api/mql-subscription';
import type { CardHold, CardId } from '@saxonberg/types';

const MqlSubscriptionApiCallers = SecurityPolicies.FromModule('/api/mql-subscription#MqlSubscriptionApi'
);

/* ─────────────────────── registry resolution ─────────────────────── */
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
      'MqlSubscriptionLogic: MqlSubscriptionRegistry not bootstrapped ' +
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
 * MqlSubscriptionLogic — the hot-reloadable logic singleton behind the
 * registry-backed slice of {@link MqlSubscriptionApi}.
 *
 * Lives at `/obj/api/mql-subscription` (a stateless `Stuff` singleton,
 * no backing `Template`); the registry-touching statics on
 * `MqlSubscriptionApi` forward here via `StuffApi.singletonSync`. Any
 * module that grabs this singleton and calls a method other than through
 * the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`) — all
 * subscription state lives on the `MqlSubscriptionRegistry` at
 * `/obj/MqlSubscriptionRegistry`, resolved via the module-level
 * `resolveRegistry()` (which survives this singleton's destruct/recreate
 * across HMR). The Api's stateless projection helpers (`fireFieldChange`,
 * `projectFields`, and the module-level `collectSubscribableFields` /
 * `projectFocus` / `resolveFieldSet` free functions) stay on the Api
 * module — they have no state to host and don't move here.
 *
 * The test seams use the non-lazy `lookupRegistry()` so they no-op when
 * nothing is seeded (matching the prior Api behaviour).
 *
 * The `FromModule` gate is applied **per public method**, not at the
 * class level — see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class MqlSubscriptionLogic extends ApiLogic {
  /* ─── public surface ─── */

  /** See {@link MqlSubscriptionApi.handleSubscribe}. */
  @CallSecurity(MqlSubscriptionApiCallers)
  public handleSubscribe(req: SubscribeRequest): void {
    resolveRegistry().handleSubscribe(req);
  }

  /** See {@link MqlSubscriptionApi.handleQuery}. */
  @CallSecurity(MqlSubscriptionApiCallers)
  public handleQuery(
    req: Omit<QueryRequest, 'query' | 'cardinality'> &
      Partial<Pick<QueryRequest, 'query' | 'cardinality'>>
  ): void {
    resolveRegistry().handleQuery(req);
  }

  /** See {@link MqlSubscriptionApi.handleUnsubscribe}. */
  @CallSecurity(MqlSubscriptionApiCallers)
  public handleUnsubscribe(
    interactive: Interactive,
    subscriptionId: string
  ): void {
    resolveRegistry().handleUnsubscribe(interactive, subscriptionId);
  }

  /** See {@link MqlSubscriptionApi.cancelAllForInteractive}. */
  @CallSecurity(MqlSubscriptionApiCallers)
  public cancelAllForInteractive(interactive: Interactive): void {
    resolveRegistry().cancelAllForInteractive(interactive);
  }

  /** See {@link MqlSubscriptionApi.refreshForInteractive}. */
  @CallSecurity(MqlSubscriptionApiCallers)
  public refreshForInteractive(interactive: Interactive): void {
    resolveRegistry().refreshForInteractive(interactive);
  }

  /** See {@link MqlSubscriptionApi.applyArrangement}. */
  @CallSecurity(MqlSubscriptionApiCallers)
  public applyArrangement(
    interactive: Interactive,
    cards: readonly CardId[],
  ): { opened: number; closed: number } {
    return resolveRegistry().applyArrangement(interactive, cards);
  }

  /** See {@link MqlSubscriptionApi.notifyPromptSettled}. */
  @CallSecurity(MqlSubscriptionApiCallers)
  public notifyPromptSettled(
    interactive: Interactive,
    promptId: string,
  ): void {
    resolveRegistry().notifyPromptSettled(interactive, promptId);
  }

  /** See {@link MqlSubscriptionApi.notifyDurableSubject}. */
  @CallSecurity(MqlSubscriptionApiCallers)
  public notifyDurableSubject(subject: string): void {
    resolveRegistry().notifyDurableSubject(subject);
  }

  /** See {@link MqlSubscriptionApi.setCardPinned}. */
  @CallSecurity(MqlSubscriptionApiCallers)
  public setCardPinned(
    interactive: Interactive,
    subscriptionId: string,
    pinned: boolean | null
  ): boolean {
    return resolveRegistry().setCardPinned(interactive, subscriptionId, pinned);
  }

  /** See {@link MqlSubscriptionApi.listCards}. */
  @CallSecurity(MqlSubscriptionApiCallers)
  public listCards(
    interactive: Interactive
  ): {
    subscriptionId: string;
    cardId?: CardId;
    hold?: CardHold;
    pinned: boolean | null;
  }[] {
    return resolveRegistry().listCards(interactive);
  }

  /** See {@link MqlSubscriptionApi.cancelAllForScope}. */
  @CallSecurity(MqlSubscriptionApiCallers)
  public cancelAllForScope(scope: string): number {
    return resolveRegistry().cancelAllForScope(scope);
  }

  /* ─── test seams ─── */

  /** See {@link MqlSubscriptionApi._getRegistrySizeForTesting}. */
  @CallSecurity(MqlSubscriptionApiCallers)
  public _getRegistrySize(): number {
    const reg = lookupRegistry();
    return reg ? reg._getRegistrySize() : 0;
  }

  /** See {@link MqlSubscriptionApi._getDependencyIndexEntryCountForTesting}. */
  @CallSecurity(MqlSubscriptionApiCallers)
  public _getDependencyIndexEntryCount(): number {
    const reg = lookupRegistry();
    return reg ? reg._getDependencyIndexEntryCount() : 0;
  }

  /** See {@link MqlSubscriptionApi._drainScheduledForTesting}. */
  @CallSecurity(MqlSubscriptionApiCallers)
  public async _drainScheduled(): Promise<void> {
    const reg = lookupRegistry();
    if (reg) await reg._drainScheduled();
  }

  /** See {@link MqlSubscriptionApi._clearAllForTesting}. */
  @CallSecurity(MqlSubscriptionApiCallers)
  public _clearAll(): void {
    const reg = lookupRegistry();
    if (reg) reg._clearAll();
  }
}
