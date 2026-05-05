/**
 * ContainerMixin — anything that holds Containables.
 *
 * Vocabulary unified on the `contain*` root: state mutators are
 * `addContainable` / `removeContainable` (not the old "Inventory"
 * spelling); the read accessor is `getContents()`.
 *
 * Lockdown contract (Phase 5):
 *   - `addContainable` / `removeContainable` are the state-mutation
 *     primitives. They are `@Final` (no subclass override —
 *     out-of-sync inventory is catastrophic), `@Unshadowable` (no
 *     shadow bypass), and `@CallSecurity` gated to be reachable
 *     ONLY from inside `Containable.setEnvironment`. All
 *     application code goes through `ContainmentApi.move` instead.
 *
 * Witness hooks (optional methods on the interface):
 *   - `canAddContainable(thing)` / `canRemoveContainable(thing)` —
 *     pre-mutation veto.
 *   - `onContainableAdded(thing)` / `onContainableRemoved(thing)` —
 *     post-mutation notification.
 *   ContainmentApi.move dispatches these around the chokepoint call.
 */

import type { MixinConstructor } from '../mixin-types';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from './Containable';
import type { VetoResult } from '../witness-types';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { ExecutionContextApi } from '../../api/execution-context';

/**
 * Public shape provided by ContainerMixin.
 *
 * The optional Witness methods (`canAddContainable`,
 * `canRemoveContainable`, `onContainableAdded`, `onContainableRemoved`)
 * fire from `ContainmentApi.move`. Implement only the ones you care
 * about; absence is treated as "no opinion."
 */
export interface Container {
  inventory: Set<Stuff & Containable>;
  addContainable(item: Stuff & Containable): void;
  removeContainable(item: Stuff & Containable): boolean;
  hasContainable(item: Stuff & Containable): boolean;
  getContents(): (Stuff & Containable)[];

  /** Optional pre-add veto. Return `{ ok: false, reason }` to block. */
  canAddContainable?(thing: Stuff & Containable): VetoResult;
  /** Optional pre-remove veto. */
  canRemoveContainable?(thing: Stuff & Containable): VetoResult;
  /** Fired after the Containable has been added. */
  onContainableAdded?(thing: Stuff & Containable): void;
  /** Fired after the Containable has been removed. */
  onContainableRemoved?(thing: Stuff & Containable): void;
}

/**
 * Custom predicate: caller's most-recent frame is inside
 * `Containable.setEnvironment`. The proxy checks the policy BEFORE
 * pushing the `addContainable` / `removeContainable` frame, so the
 * top of the stack at check time IS the calling `setEnvironment`
 * frame.
 */
const CalledFromSetEnvironment = SecurityPolicies.Custom(() => {
  const stack = ExecutionContextApi.getCallStack();
  const callerFrame = stack[stack.length - 1];
  return callerFrame?.method === 'setEnvironment';
}, 'CalledFromSetEnvironment');

export function ContainerMixin<TBase extends MixinConstructor>(Base: TBase) {
  class ContainerMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'ContainerMixin';

    /**
     * Command provider for inventory management commands
     */
    static commandProvider = {
      self: ['inventory.yaml', 'get.yaml', 'drop.yaml'],
      environment: [],
      inventory: [],
      peers: [],
    };

    /**
     * The contained items. Direct access is allowed for read paths
     * (getContents) but mutation goes through `addContainable` /
     * `removeContainable`, which only `Containable.setEnvironment`
     * may legitimately invoke.
     */
    inventory: Set<Stuff & Containable> = new Set();

    /**
     * State-mutation primitive. Locked down — only callable from
     * `Containable.setEnvironment`. Use `ContainmentApi.move(item,
     * container)` from application code.
     */
    @CallSecurity(CalledFromSetEnvironment)
    @Final
    @Unshadowable
    addContainable(item: Stuff & Containable): void {
      this.inventory.add(item);
    }

    /**
     * Remove primitive. Same lockdown as `addContainable`.
     */
    @CallSecurity(CalledFromSetEnvironment)
    @Final
    @Unshadowable
    removeContainable(item: Stuff & Containable): boolean {
      return this.inventory.delete(item);
    }

    /** Membership predicate. */
    hasContainable(item: Stuff & Containable): boolean {
      return this.inventory.has(item);
    }

    /** Snapshot of contained items as an array. */
    getContents(): (Stuff & Containable)[] {
      return Array.from(this.inventory);
    }
  }
  return ContainerMixin;
}
