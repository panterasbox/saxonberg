/**
 * ContainerMixin — anything that holds Containables.
 *
 * Vocabulary unified on the `contain*` root for state mutators
 * (`addContainable` / `removeContainable`) and on `contents` for the
 * collection itself: read accessor `getContents()`, host-internal
 * field `contents`. The MUD-classic "inventory" word is reserved for
 * the player-facing command verb (the `inventory` command and its
 * `sense.survey` topic) — see
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
import type { Stuff, EvictionContext } from '../stuff/Stuff';
import type { Containable } from './Containable';
import type { VetoResult } from '../errors';
import type {
  CaptureContext,
  ContainerSlice,
  ContentEntry,
  Placement,
} from '../persistence/PersistenceSlice';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { ExecutionContextApi } from '../../api/execution-context';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { PerceptionApi } from '../../api/perception';
import { StuffApi } from '../../api/stuff';
import type { CommandContributions } from '../../api/command';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { ChattelApi } from '../../api/chattel';
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
     * Residency veto: a non-empty container stays resident — its cold
     * contents cull individually first, then the emptied container culls
     * a later sweep (bottom-up, so R2.4's owning-cascade never destructs
     * a subtree out from under itself). Falls through to `super` when
     * empty so other composed vetoes still apply.
     */
    public canEvict(context: EvictionContext): VetoResult {
      // A persistable host (persistence spine) does NOT veto on contents:
      // its contents are captured to a `PersistedRecord` before the cull
      // (the residency sweep awaits `PersistableApi.capture` first), so it
      // can evict safely and re-materialize on next reference. Fall through
      // to `super` so the host's OTHER vetoes still apply (a live Avatar's
      // `HasInteractive`, a `WarrenMember`). A non-persistable container
      // keeps the classic contents veto.
      if (
        this.getContents().length > 0 &&
        !MixinApi.isPersistable(this as unknown as Stuff)
      ) {
        return { ok: false, reason: 'container is not empty' };
      }
      return super.canEvict(context);
    }

    /**
     * Persistence-spine capture hook (see
     * [docs/subsystems/persistence.md]). Serializes this Container's
     * directly-held content: one {@link ContentEntry} per Containable, in
     * `getContents()` order (the shared index the Slotted slice references).
     * A nested **host** (composes `Persistable`) is emitted as a `{ ref }`
     * (it persists itself); anything else nests its composed `state`,
     * recursing through `ctx.captureItem`. A surface-resting item records
     * the index of the Surfaced sibling it rests on.
     *
     * Restore of the container slice is centralized in `PersistableLogic`
     * (it cross-references the Slotted slice by index), so there is no
     * paired `restoreSlice` here.
     */
    static captureSlice(
      host: Stuff,
      ctx: CaptureContext,
    ): ContainerSlice {
      const container = host as Stuff & Container;
      // Three skips, one filter — they must produce the SINGLE ordering the
      // Slotted slice indexes into, so they cannot be separate passes.
      //
      // 1. A live player avatar (HasInteractive) is a transient occupant,
      //    never a host's persistent content — it persists itself, under
      //    its own record.
      // 2. A good someone has been STAMPED as owning persists owner-side
      //    too, in that owner's estate (D2). An unstamped fixture — the
      //    dorm's bed, a let unit's range, litter — captures here exactly
      //    as it always has, which is why the rule keys on the stamp and
      //    not on `ownerOf`: a fixture under a parcel extent is *owned* but
      //    not *stamped*, and belongs to its room's record.
      // 3. A `Behaved` NPC is CAST, never content. A hand that commutes
      //    between two persistable rooms (its floor and the counter it
      //    consigns at) stands in whichever one each room's capture
      //    happens to catch — so BOTH records can carry it, and the next
      //    boot restores it twice: `expected singleton, found 2`, boot
      //    dead. The cast is authored `cast:` data; a room's
      //    materialize re-seeds a missing troupe via
      //    `Persistable.reseedCast`, so skipping it here loses nothing.
      //    (The skip keys on the MIXIN, not the authored list — a
      //    wandering NPC standing here at capture time is some other
      //    room's cast, and equally not our content.)
      //
      // The skipped goods are reported so `PersistableLogic` can flush them
      // into their owners' estates after this synchronous walk. Dropping
      // one here without reporting it would destroy it with the host.
      const contents = container.getContents().filter((item) => {
        if (MixinApi.isHasInteractive(item)) return false;
        if (MixinApi.isBehaved(item)) return false;
        if (ChattelApi.isOwnerPersisted(item)) {
          ctx.noteOwnedGood(item);
          return false;
        }
        return true;
      });
      const entries: ContentEntry[] = contents.map((item) => {
        const placement: Placement = {};
        const restingOn = item.getRestingOn();
        if (restingOn) {
          const idx = ctx.indexOf(restingOn);
          if (idx >= 0) placement.restingOnIndex = idx;
        }
        return ctx.captureItem(item, placement);
      });
      return { contents: entries };
    }

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
     *     escape to the void singleton (`/platform/location/void`) so an
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
      // `/platform/location/void`), read sync from the warmed cache.
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
        'platform/cmd/inventory/inventory.yaml',
        'platform/cmd/inventory/get.yaml',
        'platform/cmd/inventory/drop.yaml',
        'platform/cmd/inventory/put.yaml',
        'platform/cmd/inventory/give.yaml',
      ],
      peers: [],
      environment: [],
    };

    /**
     * Live-query subscribable field: `contents`. Projects each visible
     * contained Stuff as a `REF_FIELDS`-shape record so the inspection
     * card (and any future container widget) can render the inside-of
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
          const visible = host.getContents().filter(
            (child) =>
              child.stuffId !== viewer.stuffId &&
              !MixinApi.isAdornment(child) &&
              MixinApi.isVisible(child) &&
              // Honest fog on the wire: a concealed-undiscovered child never
              // enters the client projection. `perceives` short-circuits
              // true for un-concealed children (the common path).
              PerceptionApi.perceives(viewer, child),
          );
          // Surface-resting items (the back-bar's bottles) render under their
          // surface, not as loose contents — the same rule `look`/`sense` use
          // (`ContainmentApi.looseContents`), so the inspection card agrees.
          return ContainmentApi.looseContents(visible).map((child) =>
            MqlSubscriptionApi.projectFields(child, REF_FIELDS, viewer),
          );
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
