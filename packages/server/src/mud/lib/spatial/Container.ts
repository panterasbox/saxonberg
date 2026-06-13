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
import { StuffApi } from '../../api/stuff';
import type { CommandContributions } from '../../api/command';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/keys';
import {
  MqlSubscriptionApi,
  REF_FIELDS,
  type SubscribableFieldDescriptor,
} from '../../api/mql-subscription';

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
     * `getContainer()` is null) has no outer; per-item policy
     * applies:
     *
     *   - `HasInteractive` items (Avatars with a live connection)
     *     escape to the void singleton (`/domain/void`) so an
     *     active session never ends up with a null environment.
     *     The void is in the bootstrap manifest, so the sync
     *     `findByTemplatePath` lookup here is guaranteed to find
     *     a live instance.
     *   - Everything else cascade-destructs along with the host.
     *
     * `onMoved(from, to)` witnesses fire for each item that's
     * evacuated; `onDestruct` fires for each item that cascades.
     *
     * Walk order matters: this fires BEFORE `Containable.
     * cleanupOnDestruct` for a Container+Containable composition,
     * so the evacuation completes while `getContainer()` still
     * returns the outer. Snapshot first — `removeContainable`
     * mutates the live set during iteration.
     *
     * Limitation: only the DIRECT contents of the destructing host
     * are policy-targeted. A `HasInteractive` nested inside a
     * non-`HasInteractive` Container that itself sits inside a
     * top-of-containment host will be cascade-destructed when its
     * containing Container destructs (which moves it to the
     * top-host while that's mid-destruct, then R2.3 self-heal
     * nulls its container). If that nested-HI case becomes real,
     * lift the rule into `ContainmentApi.move` as a chokepoint.
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
      // Pre-resolve the evacuation fallback exactly once — only the
      // null-outer branch needs it, and only when at least one item exists.
      // The target is the `evacuationFallback` app setting (default
      // `/domain/void`), read sync from the warmed cache.
      const evacuationFallback =
        outer === null && snapshot.length > 0
          ? StuffApi.findByTemplatePath<Stuff & Container>(
              AppApi.setting(AppSettingKeys.evacuationFallback)
            ) ?? null
          : null;
      for (const item of snapshot) {
        try {
          if (outer !== null) {
            ContainmentApi.move(item, outer);
          } else if (
            MixinApi.isHasInteractive(item) &&
            evacuationFallback !== null
          ) {
            ContainmentApi.move(item, evacuationFallback);
          } else {
            StuffApi.destruct(item);
          }
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
        'inventory/inventory.yaml',
        'inventory/get.yaml',
        'inventory/drop.yaml',
        'inventory/put.yaml',
        'inventory/give.yaml',
      ],
      environment: [],
      inventory: [],
      peers: [],
    };

    /**
     * Live-query subscribable field: `contents`. Projects each visible
     * contained Stuff as a `REF_FIELDS`-shape record so the inspection
     * pane (and any future container widget) can render the inside-of
     * view from a single subscription without a per-child round trip.
     *
     * Per-viewer visibility filter mirrors `LookController.lookAtLocation`'s
     * structural policy:
     *
     *   - Items the viewer (`self`) IS are excluded — a player listing
     *     their own container shouldn't see themselves in it.
     *   - `AdornmentMixin` items are excluded (they're part of the
     *     host's structure, not loose contents).
     *   - Non-`VisibleMixin` items are excluded (they can't be
     *     referenced in prose anyway).
     *
     * `dependsOnFields: ['contents']` keys the dependency-index entry
     * to the `FieldChangedEvent { field: 'contents' }` fires installed
     * on `addContainable` / `removeContainable` below — the field is
     * not a persistent field (Hydrator never reflects into it) and
     * setter-shaped invariants don't fit, so the events fire from the
     * primitives.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: 'contents',
        read: (stuff, viewer) => {
          const host = stuff as Stuff & Container;
          const out: Record<string, unknown>[] = [];
          for (const child of host.getContents()) {
            if (child.stuffId === viewer.stuffId) continue;
            if (MixinApi.isAdornment(child)) continue;
            if (!MixinApi.isVisible(child)) continue;
            out.push(MqlSubscriptionApi.projectFields(child, REF_FIELDS, viewer));
          }
          return out;
        },
      },
    ];

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
     *
     * Fires `FieldChangedEvent { field: 'contents' }` after a real
     * addition so the MQL subscription substrate's dependency index
     * picks up containment-shape changes for the `contents` descriptor.
     * The substrate matches on `(KIND, 'field', 'contents')` only —
     * `oldValue` / `newValue` are inspected by the diff pass via
     * re-projection of the host, not by the index, so the count
     * delta carried here is informational (debugging / future
     * coarse-grain optimizations) rather than load-bearing.
     */
    @CallSecurity(CalledFromSetContainer)
    @Final
    @Unshadowable
    addContainable(item: Stuff & Containable): void {
      const before = this.contents.size;
      this.contents.add(item);
      if (this.contents.size !== before) {
        // Inline the fire rather than route through `fireFieldChange`
        // — Object.is(before, before+1) is false but the values are
        // documentation-only here, and we want the event to fire
        // unconditionally on a real mutation rather than being
        // suppressed by an accidental no-op return path.
        MqlSubscriptionApi.fireFieldChange(
          this,
          'contents',
          before,
          this.contents.size,
        );
      }
    }

    /**
     * Remove primitive. Same lockdown as `addContainable`. Fires the
     * matching `FieldChangedEvent { field: 'contents' }` on a real
     * removal.
     */
    @CallSecurity(CalledFromSetContainer)
    @Final
    @Unshadowable
    removeContainable(item: Stuff & Containable): boolean {
      const before = this.contents.size;
      const removed = this.contents.delete(item);
      if (removed) {
        MqlSubscriptionApi.fireFieldChange(
          this,
          'contents',
          before,
          this.contents.size,
        );
      }
      return removed;
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
