/**
 * ContainerMixin — anything that holds Containables.
 *
 * Vocabulary unified on the `contain*` root for state mutators
 * (`addContainable` / `removeContainable`) and on `contents` for the
 * collection itself: read accessor `getContents()`, host-internal
 * field `contents`. The MUD-classic "inventory" word is reserved for
 * the player-facing command verb (the `inventory` command and its
 * `world.perception.inventory` topic) — see
 * [docs/subsystems/collections.md § Capability-derived items](../../../../../../docs/subsystems/collections.md).
 *
 * Lockdown contract (Phase 5):
 *   - `addContainable` / `removeContainable` are the state-mutation
 *     primitives. They are `@Final` (no subclass override —
 *     out-of-sync contents is catastrophic), `@Unshadowable` (no
 *     shadow bypass), and `@CallSecurity` gated to be reachable
 *     ONLY from inside `Containable.setContainer`. All
 *     application code goes through `ContainmentApi.move` instead.
 *
 * Witness hooks (optional methods on the interface):
 *   - `canAddContainable(thing)` / `canRemoveContainable(thing)` —
 *     pre-mutation veto.
 *   - `onContainableAdded(thing)` / `onContainableRemoved(thing)` —
 *     post-mutation notification.
 *   ContainmentApi.move dispatches these around the chokepoint call.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from './Containable';
import type { VetoResult } from '../errors';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { ExecutionContextApi } from '../../api/execution-context';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import type { CommandContributions } from '../../api/command';

/**
 * Public shape provided by ContainerMixin.
 *
 * The optional Witness methods (`canAddContainable`,
 * `canRemoveContainable`, `onContainableAdded`, `onContainableRemoved`)
 * fire from `ContainmentApi.move`. Implement only the ones you care
 * about; absence is treated as "no opinion."
 */
export interface Container {
  addContainable(item: Stuff & Containable): void;
  removeContainable(item: Stuff & Containable): boolean;
  hasContainable(item: Stuff & Containable): boolean;
  getContents(): (Stuff & Containable)[];
  /**
   * Recursive contents: every Containable reachable from this
   * Container, including descendants of nested Containers. Walked
   * depth-first pre-order, so a child appears immediately after its
   * parent. Containment is acyclic by construction (a Container
   * can't contain its own ancestor — `Containable.setContainer`
   * enforces it), so no cycle protection is needed.
   *
   * Used by MQL's `:I` deep-inventory transform; equally available
   * to controllers that want every nested item without writing the
   * recursion themselves.
   */
  getDeepContents(): (Stuff & Containable)[];

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
 * `Containable.setContainer`. The proxy checks the policy BEFORE
 * pushing the `addContainable` / `removeContainable` frame, so the
 * top of the stack at check time IS the calling `setContainer`
 * frame.
 */
const CalledFromSetContainer = SecurityPolicies.Custom(() => {
  const stack = ExecutionContextApi.getCallStack();
  const callerFrame = stack[stack.length - 1];
  return callerFrame?.method === 'setContainer';
}, 'CalledFromSetContainer');

export function ContainerMixin<TBase extends MixinConstructor>(Base: TBase) {
  class ContainerMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'ContainerMixin';

    /**
     * Framework cleanup (S1 — evacuate to outer container).
     * When a Container destructs, every Containable currently held
     * is re-parented to the destructing Container's own outer
     * container via `ContainmentApi.move`. Top-of-containment
     * (Container that isn't also Containable, or whose
     * `getContainer()` is null) evacuates to `null` — those items
     * end up "in limbo." `onMoved(from, to)` witnesses fire for
     * each item.
     *
     * Walk order matters: this fires BEFORE `Containable.
     * cleanupOnDestruct` for a Container+Containable composition,
     * so the evacuation completes while `getContainer()` still
     * returns the outer. Snapshot first — `removeContainable`
     * mutates the live set during iteration.
     */
    static cleanupOnDestruct(stuff: Stuff): void {
      const host = stuff as Stuff & Container;
      // Snapshot via getContents() (returns Array.from(this.contents)
      // — already a fresh array). Safe to iterate while mutating
      // the underlying set via ContainmentApi.move.
      const snapshot = host.getContents();
      const outer = MixinApi.isContainable(host)
        ? (host as Stuff & Containable).getContainer()
        : null;
      for (const item of snapshot) {
        try {
          ContainmentApi.move(item, outer);
        } catch (err) {
          // Log-and-continue (same policy as the dispatcher).
          // One stuck item must not strand the rest.
          console.error(
            `ContainerMixin.cleanupOnDestruct: failed to evacuate ` +
              `${item.stuffId} from ${host.stuffId}`,
            err
          );
        }
      }
    }

    /**
     * Command provider for inventory management commands
     */
    static commandContributions: CommandContributions = {
      self: [
        'inventory.yaml',
        'get.yaml',
        'drop.yaml',
        'put.yaml',
        'give.yaml',
      ],
      environment: [],
      inventory: [],
      peers: [],
    };

    /**
     * The contained items. Read access goes through `getContents()`;
     * mutation goes through `addContainable` / `removeContainable`,
     * which only `Containable.setContainer` may legitimately invoke.
     */
    protected contents: Set<Stuff & Containable> = new Set();

    /**
     * State-mutation primitive. Locked down — only callable from
     * `Containable.setContainer`. Use `ContainmentApi.move(item,
     * container)` from application code.
     */
    @CallSecurity(CalledFromSetContainer)
    @Final
    @Unshadowable
    addContainable(item: Stuff & Containable): void {
      this.contents.add(item);
    }

    /**
     * Remove primitive. Same lockdown as `addContainable`.
     */
    @CallSecurity(CalledFromSetContainer)
    @Final
    @Unshadowable
    removeContainable(item: Stuff & Containable): boolean {
      return this.contents.delete(item);
    }

    /** Membership predicate. */
    hasContainable(item: Stuff & Containable): boolean {
      return this.contents.has(item);
    }

    /** Snapshot of contained items as an array. */
    getContents(): (Stuff & Containable)[] {
      return Array.from(this.contents);
    }

    /**
     * Walk the containment tree depth-first pre-order, starting
     * from this Container's immediate contents, and return every
     * Containable encountered. Used by MQL's `:I` transform and
     * any controller that wants the full nested inventory.
     */
    getDeepContents(): (Stuff & Containable)[] {
      const out: (Stuff & Containable)[] = [];
      const walk = (c: Stuff & Container): void => {
        for (const item of c.getContents()) {
          out.push(item);
          if (MixinApi.isContainer(item)) {
            walk(item as Stuff & Container);
          }
        }
      };
      walk(this as unknown as Stuff & Container);
      return out;
    }
  }
  return ContainerMixin;
}
