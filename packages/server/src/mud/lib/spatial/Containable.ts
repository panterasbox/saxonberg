/**
 * ContainableMixin — anything that lives inside a Container.
 *
 * State-mutation chokepoint: `setContainer(container)` is the only
 * place the container's `contents` and the item's `environment`
 * fields are updated atomically.
 * `ContainmentApi.move` is the policy / hook layer above; it calls
 * `setContainer` once, which orchestrates the cross-object
 * mutation:
 *
 *   1. `oldContainer.removeContainable(this)` if there was a previous
 *      environment.
 *   2. `newContainer.addContainable(this)` if there is a new one.
 *   3. `this.environment = newContainer`.
 *
 * Lockdown contract (Phase 5):
 *   - `setContainer` is `@Final` (no subclass override —
 *     out-of-sync state is catastrophic), `@Unshadowable`, and
 *     `@CallSecurity`-gated to ContainmentApi callers only. Detach
 *     is `ContainmentApi.move(item, null)`; a direct
 *     `setContainer(null)` is rejected by policy.
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
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';

/**
 * Public shape provided by ContainableMixin.
 *
 * The optional Witness methods fire from `ContainmentApi.move`.
 * Implement only the ones you care about.
 */
export interface Containable {
  setContainer(container: (Stuff & Container) | null): void;
  getContainer(): (Stuff & Container) | null;
  /**
   * Walk the container chain to the topmost non-null environment.
   * Returns `null` when this Stuff is already at the root (its own
   * `getContainer()` is null) — the caller decides whether "I am
   * the root" should be treated as the result or as no-op.
   *
   * Counterpart to `ContainerMixin.getDeepContents()` — both side
   * helpers for "walk all the way" navigation. Used by MQL's `:E`
   * transform; equally available to controllers that want to find
   * the world / zone / outermost room without rolling their own
   * loop.
   */
  getRootContainer(): (Stuff & Container) | null;

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
     * Framework cleanup (R2.4 collection-symmetric). When a
     * Containable destructs, unhook it from its container's
     * `contents` set via the canonical chokepoint so `onMoved` /
     * `onContainableRemoved` witnesses fire. Discovered by the
     * dispatcher in `StuffApi.#destructCore` via the
     * `MixinApi.queryMixins` walk + own-static filter.
     *
     * The Container-side cleanup (most-derived) for a
     * Container+Containable composition fires BEFORE this — it
     * evacuates contents while `_container` is still set, then
     * this hook completes the unhook for the destructing item's
     * own membership in its outer container.
     */
    static cleanupOnDestruct(stuff: Stuff): void {
      const self = stuff as Stuff & Containable;
      const env = self.getContainer();
      if (env) {
        ContainmentApi.move(self, null);
      }
    }

    /**
     * Note: environment is a complex type (reference to another object).
     * It is NOT included in persistentFields - instead, classes using
     * this mixin must declare a custom persistenceHandler.
     */
    protected environment: (Stuff & Container) | null = null;

    /**
     * State-mutation chokepoint. Reachable only from
     * `ContainmentApi.move`; cross-Container `contents` mutation must
     * not be subclass-extensible (`@Final`) or shadow-bypassable
     * (`@Unshadowable`).
     *
     * Atomic across three updates: detach from the old container,
     * attach to the new, update the field. `null` argument is the
     * detach case; the policy rejects calls from anywhere other than
     * `ContainmentApi`, so `setContainer(null)` outside the Api
     * throws — the legitimate detach is `ContainmentApi.move(item,
     * null)`.
     */
    @CallSecurity(FromContainmentApi)
    @Final
    @Unshadowable
    setContainer(container: (Stuff & Container) | null): void {
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
     * Get the current container.
     *
     * R2.3 self-heal: if `environment` points at a destroyed
     * Container (a path bypassed the eager evacuation in
     * `Container.cleanupOnDestruct`), clear the slot and return
     * `null`. Cheap one-liner backstop for S1 / S8.
     */
    getContainer(): (Stuff & Container) | null {
      const env = this.environment;
      if (env !== null && env.isDestroyed()) {
        this.environment = null;
        return null;
      }
      return env;
    }

    /**
     * Walk the container chain to the topmost non-null environment.
     * Returns `null` when already at the root.
     *
     * Containment is acyclic by construction (a Container can't
     * contain its own ancestor — `setContainer`'s atomic update is
     * the chokepoint), so the loop is bounded by the depth of the
     * world's nesting.
     */
    getRootContainer(): (Stuff & Container) | null {
      let current: Stuff = this as unknown as Stuff;
      let topmost: (Stuff & Container) | null = null;
      while (MixinApi.isContainable(current)) {
        const env = current.getContainer();
        if (!env) break;
        topmost = env;
        current = env as Stuff;
      }
      return topmost;
    }
  }
  return ContainableMixin;
}
