/**
 * ContainableMixin — anything that lives inside a Container.
 *
 * State-mutation chokepoint: `setEnvironment(container)` is the only
 * place inventory and environment fields are updated atomically.
 * `ContainmentApi.move` is the policy / hook layer above; it calls
 * `setEnvironment` once, which orchestrates the cross-object
 * mutation:
 *
 *   1. `oldContainer.removeContainable(this)` if there was a previous
 *      environment.
 *   2. `newContainer.addContainable(this)` if there is a new one.
 *   3. `this.environment = newContainer`.
 *
 * Lockdown contract (Phase 5):
 *   - `setEnvironment` is `@Final` (no subclass override —
 *     out-of-sync state is catastrophic), `@Unshadowable`, and
 *     `@CallSecurity`-gated to ContainmentApi callers only. Detach
 *     is `ContainmentApi.move(item, null)`; a direct
 *     `setEnvironment(null)` is rejected by policy.
 *
 * Witness hooks (optional methods on the interface):
 *   - `canMove(to)` — pre-move veto on the moving item.
 *   - `onMoved(from, to)` — post-move notification. Either argument
 *     may be `null` for first-placement / final-detach edges.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from './Container';
import type { VetoResult } from '../errors';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';

/**
 * Public shape provided by ContainableMixin.
 *
 * The optional Witness methods fire from `ContainmentApi.move`.
 * Implement only the ones you care about.
 */
export interface Containable {
  environment: (Stuff & Container) | null;
  setEnvironment(container: (Stuff & Container) | null): void;
  getEnvironment(): (Stuff & Container) | null;

  /** Optional pre-move veto on the moving item itself. */
  canMove?(to: (Stuff & Container) | null): VetoResult;

  /**
   * Fired after the item has moved. Either `from` or `to` may be
   * `null` for first-placement / final-detach edges. Single hook
   * covers every transition — no separate "placed" / "removed"
   * methods on the item side.
   */
  onMoved?(
    from: (Stuff & Container) | null,
    to: (Stuff & Container) | null
  ): void;
}

const FromContainmentApi = SecurityPolicies.FromModule(
  'mud/api/containment#ContainmentApi',
  { includeSubclasses: false }
);

export function ContainableMixin<TBase extends MixinConstructor>(Base: TBase) {
  class ContainableMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'ContainableMixin';

    /**
     * Note: environment is a complex type (reference to another object).
     * It is NOT included in persistentFields - instead, classes using
     * this mixin must declare a custom persistenceHandler.
     */
    environment: (Stuff & Container) | null = null;

    /**
     * State-mutation chokepoint. Reachable only from
     * `ContainmentApi.move`; inventory mutation must not be
     * subclass-extensible (`@Final`) or shadow-bypassable
     * (`@Unshadowable`).
     *
     * Atomic across three updates: detach from the old container,
     * attach to the new, update the field. `null` argument is the
     * detach case; the policy rejects calls from anywhere other than
     * `ContainmentApi`, so `setEnvironment(null)` outside the Api
     * throws — the legitimate detach is `ContainmentApi.move(item,
     * null)`.
     */
    @CallSecurity(FromContainmentApi)
    @Final
    @Unshadowable
    setEnvironment(container: (Stuff & Container) | null): void {
      const old = this.environment;
      if (old === container) return;
      if (old) {
        old.removeContainable(this as unknown as Stuff & Containable);
      }
      if (container) {
        container.addContainable(this as unknown as Stuff & Containable);
      }
      this.environment = container;
    }

    /**
     * Get the current environment.
     */
    getEnvironment(): (Stuff & Container) | null {
      return this.environment;
    }
  }
  return ContainableMixin;
}
