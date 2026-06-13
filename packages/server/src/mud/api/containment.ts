/**
 * ContainmentApi — public surface for object movement and the policy
 * layer above the `Containable.setContainer` chokepoint.
 *
 * Layering (Phase 5):
 *
 *   - `Containable.addContainable` / `removeContainable` are
 *     `@Final @Unshadowable` state-mutation primitives reachable
 *     ONLY from `Containable.setContainer`.
 *   - `Containable.setContainer` is the atomic chokepoint —
 *     reachable ONLY from this Api. It orchestrates the three
 *     cross-object updates (remove from old, add to new, set field)
 *     in one call.
 *   - `ContainmentApi.move` is the public surface. It runs invariants
 *     and Witness `can*` vetoes, calls `setContainer` once, then
 *     fires the post-move `on*` hooks. NO direct
 *     `removeContainable` / `addContainable` calls happen here —
 *     `setContainer` does the state mutation.
 *
 * Detach: `ContainmentApi.move(item, null)`. A direct
 * `setContainer(null)` is rejected by the policy.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type { Containable } from '../lib/spatial/Containable';
import type { Surfaced } from '../lib/spatial/Surfaced';
import type { VetoResult } from '../lib/errors';
import type { Warren } from '../lib/location/Warren';
import { CommandApi } from './command';
import { MixinApi } from './mixin';
import { StuffApi } from './stuff';
import { SecurityApi } from './security';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
// `TeleportController` / `GotoController` are reached lazily via
// string module ids to avoid a value-level static-import cycle
// (api/containment → controller → ContainmentApi).

type ContainerStuff = Stuff & Container;
type ContainableStuff = Stuff & Containable;

/**
 * Programmatic-contract violation thrown by `ContainmentApi.move()`.
 *
 * These are NOT user-input failures — user-facing commands (`go`, `get`,
 * `drop`) should validate and produce friendly messages before calling
 * `move()`. `ContainmentError` exists to catch seeder/test/scripted bugs.
 */
export class ContainmentError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, opts?: { cause?: unknown }) {
    super(message);
    this.name = 'ContainmentError';
    if (opts?.cause !== undefined) this.cause = opts.cause;
  }
}

/**
 * Late-bound merge-on-arrival hook. `GlobbableApi` registers a
 * function at module load that handles the "moved Globbable arrived
 * in a container holding a mergeable sibling" ripple. Lives here as
 * a slot rather than a direct import to avoid the
 * containment → glob → containment cycle.
 *
 * The hook fires AFTER post-move `on*` witnesses so subscribers see
 * the arrival before the absorbed Stuff destructs. Hook implementor
 * is responsible for the `MixinApi.isGlobbable` skip path.
 */
type MergeOnArrivalHook = (
  moved: Stuff,
  to: Stuff & Container
) => void;

let _mergeOnArrivalHook: MergeOnArrivalHook | null = null;

/**
 * Static API for containment and movement operations.
 */
export class ContainmentApi {
  /**
   * Install (or replace) the merge-on-arrival hook. Called once by
   * `GlobbableApi` at module load. The `_` prefix marks it
   * framework-internal — same shape as `SecurityApi._registerShadowApi`.
   *
   * @internal
   */
  public static _registerMergeOnArrivalHook(hook: MergeOnArrivalHook): void {
    _mergeOnArrivalHook = hook;
  }

  /**
   * Move an item to `to`, or detach it (when `to === null`).
   *
   * Pipeline:
   *   1. Pre-flight invariants (Exitable layering, zone crossing).
   *   2. `can*` Witness hooks — short-circuit on the first veto.
   *   3. `item.setContainer(to)` — atomic state mutation.
   *   4. `on*` Witness hooks (post-mutation, never veto).
   *
   * Zone is NOT restamped on move — it should reflect whichever
   * zone created the item, not whichever container it currently
   * sits in. Cross-zone movement rules are enforced by the
   * pre-flight invariants (Exitables can't cross zones via
   * containment) but the `zone` field itself is set at clone time
   * and stays put.
   *
   * @throws ContainmentError on invariant violations or hook vetoes.
   */
  public static move(
    item: ContainableStuff,
    to: ContainerStuff | null
  ): void {
    ContainmentApi.#moveCore(item, to, false);
  }

  /**
   * Force-bypass variant of `move()`. Pre-flight invariants still
   * fire (those are programmatic-contract guards, not policy);
   * `canMove` / `canRemoveContainable` / `canAddContainable`
   * witnesses still fire (so observers / audit hooks see the call)
   * but their veto results are ignored. Post-move `on*` hooks fire
   * identically.
   *
   * Gated by `SecurityPolicies.FromController(TeleportController,
   * GotoController)` — the **narrow-entry pattern**. Only the
   * teleport/goto controllers can reach this entry point; each does
   * the `AccessApi.can(giver, 'force-teleport' | 'force-goto', ...)`
   * check before invoking. Combined, the mutation has exactly one
   * legitimate entry path AND that path enforces who is authorized.
   *
   * Direct calls from outside those controllers' modules throw
   * `SecurityError` from the decorator gate before this body runs.
   */
  @CallSecurity(
    SecurityPolicies.AnyOf(
      SecurityPolicies.FromModule('mud/obj/command/author/TeleportController'),
      SecurityPolicies.FromModule('mud/obj/command/author/GotoController'),
    ),
  )
  public static forceMove(
    item: ContainableStuff,
    to: ContainerStuff | null
  ): void {
    ContainmentApi.#moveCore(item, to, true);
  }

  /**
   * Shared implementation for `move` / `forceMove`. Pre-flight
   * invariants and witness invocation are uniform across both
   * paths so any side effects the hooks attach observe every call;
   * `force=true` skips only the veto-result enforcement.
   */
  static #moveCore(
    item: ContainableStuff,
    to: ContainerStuff | null,
    force: boolean
  ): void {
    if (to !== null) {
      // PRE-FLIGHT (1): Exitables may only land in Exitables.
      if (MixinApi.isExitable(item) && !MixinApi.isExitable(to)) {
        throw new ContainmentError(
          'Exitables can only be placed inside other exitables.'
        );
      }
      // PRE-FLIGHT (2): Exitables cannot cross zones via containment.
      if (MixinApi.isExitable(item) && item.getZone() && item.getZone() !== to.getZone()) {
        throw new ContainmentError(
          'Cannot move an exitable into a different zone.'
        );
      }
      // PRE-FLIGHT (3): Adornments attached to a host cannot be moved
      // into a Container's contents while still adorning. The
      // not-portable invariant — wall sconces, BoundaryAnchors, and
      // similar fixtures are reachable through `Adornable.getFixtures()`,
      // not `getContents()`. Detaching first
      // (`host.removeFixture(item)`) is the prerequisite for moving
      // the Adornment as inventory; same shape as `Door.detach()` for
      // a broken door.
      if (MixinApi.isAdornment(item) && item.getAdornedTo() !== null) {
        throw new ContainmentError(
          'Cannot move an adornment that is still attached to a host; ' +
            'detach it first.'
        );
      }
    }

    const from = item.getContainer();
    if (from === to) return;

    // VETO HOOKS — invoked uniformly; only the assert is conditional.
    // Witnesses fire on every call (observability) so the force path
    // matches the polished path's side effects.
    const moveVeto = callHook<VetoResult>(item, 'canMove', [to]);
    const removeVeto = from
      ? callHook<VetoResult>(from, 'canRemoveContainable', [item])
      : undefined;
    const addVeto = to
      ? callHook<VetoResult>(to, 'canAddContainable', [item])
      : undefined;
    if (!force) {
      assertVetoOk(moveVeto, 'canMove');
      assertVetoOk(removeVeto, 'canRemoveContainable');
      assertVetoOk(addVeto, 'canAddContainable');
    }

    // STATE MUTATION through the chokepoint. setContainer handles
    // the three cross-object updates atomically.
    item.setContainer(to);

    // Auxiliary-pointer invariant: when the container actually
    // changes, the `restingOn` auxiliary pointer can no longer be
    // valid (the apple is now in the chest; whatever desk it was on
    // can't still be supporting it). Clearing here keeps the
    // move-as-container-change contract clean. `placeOn` re-stamps
    // restingOn after this move() call, so the on-surface case is
    // unaffected.
    if (from !== to && item.getRestingOn() !== null) {
      item._setRestingOn(null);
    }

    // Recency-stack bookkeeping. Runs BEFORE the on-hooks so anything
    // those hooks observe (e.g. peers' getAvailableCommands) reflects
    // the new contributions.
    CommandApi.applyContainmentDelta(item, from, to);

    // NOTIFICATION HOOKS. Single onMoved per item; per-container
    // hooks for source and destination separately.
    if (from) callHook(from, 'onContainableRemoved', [item]);
    if (to) callHook(to, 'onContainableAdded', [item]);
    callHook(item, 'onMoved', [from, to]);

    // Merge-on-arrival ripple (globbable substrate). Fires after the
    // arrival witnesses so subscribers see the arriving Stuff before
    // it's absorbed and destructed. The hook is responsible for its
    // own `isGlobbable` skip path.
    if (to !== null && _mergeOnArrivalHook !== null) {
      _mergeOnArrivalHook(item, to);
    }
  }

  /**
   * Place `item` in `env` without firing movement witnesses, running
   * capacity validators, or triggering the glob merge-on-arrival
   * ripple. The matter is treated as if it were already in `env`;
   * this call just records the topological fact.
   *
   * **Precondition**: `item.getContainer() === null`. This is NOT a
   * relocation primitive — existing-env Stuffs go through
   * `ContainmentApi.move`. Throws when violated.
   *
   * Use when the placement is semantically NOT an arrival:
   *   - Glob split (splitoff is freshly cloned, has no container).
   *   - First-placement bootstrap paths after `StuffApi.clone` that
   *     deliberately bypass arrival hooks.
   *   - Hot-reload re-attachment (post-clone, pre-relink).
   *
   * Use `ContainmentApi.move` when the placement IS movement (an
   * existing Stuff genuinely entered `env` from elsewhere).
   *
   * What's preserved (always):
   *   - Containment graph integrity (atomic three-update via
   *     `setContainer`).
   *   - Mixin compatibility — `item` must be `Containable`, `env`
   *     must be `Container`. Putting a non-Containable somewhere or
   *     accepting contents into a non-Container would corrupt the
   *     graph regardless of who's observing.
   *   - Fresh-placement precondition.
   *
   * What's bypassed:
   *   - Capacity validators (matter-was-already-there assumption).
   *   - `can*` / `on*` witnesses (placement is not movement).
   *   - Merge-on-arrival ripple for globs.
   *   - Recency-stack bookkeeping (no command-contribution delta —
   *     the matter is treated as already-present).
   *
   * Security: gated by `SecurityPolicies.ApiOnly` because the
   * skipped checks make this primitive more powerful than `move`.
   * The fresh-placement precondition rules out the obvious abuse
   * (smuggling, teleport-past-guard) — existing-env Stuffs must go
   * through `move`, period.
   */
  @CallSecurity(SecurityPolicies.ApiOnly)
  public static placeDirect(
    item: ContainableStuff,
    env: ContainerStuff
  ): void {
    if (!MixinApi.isContainable(item)) {
      throw new ContainmentError(
        'ContainmentApi.placeDirect: item is not Containable.'
      );
    }
    if (!MixinApi.isContainer(env)) {
      throw new ContainmentError(
        'ContainmentApi.placeDirect: env is not a Container.'
      );
    }
    if (item.getContainer() !== null) {
      throw new ContainmentError(
        'ContainmentApi.placeDirect: item already has a container; ' +
          'use ContainmentApi.move for relocations.'
      );
    }
    item.setContainer(env);
  }

  /**
   * Place `item` on `surface` — the on-surface analogue of
   * {@link move}. Under Option D (see
   * `docs/plans/affordance-verb-plan.md` § 2), containment stays
   * hierarchical and exclusive; the supporting surface is an
   * orthogonal auxiliary pointer.
   *
   * Pipeline:
   *   1. Resolve target environment as the surface's container.
   *      Surfaces themselves are Containable; their environment is
   *      where the supported items live (e.g., the desk lives in
   *      the room; apples on the desk are also in the room).
   *   2. Run the surface's `canRest(item)` veto. Throws on
   *      programmatic-contract failure (validators upstream produce
   *      friendly user-input messages).
   *   3. `move(item, targetEnv)` — this fires the usual container
   *      change hooks AND clears any prior `restingOn` as part of
   *      the change-of-container invariant.
   *   4. Set the auxiliary `restingOn` pointer to the surface.
   *      Order matters: move() in step 3 clears restingOn; the
   *      _setRestingOn call after it restamps to the new surface.
   *
   * @throws Error when the surface has no environment to place the
   *   item into, OR when `surface.canRest(item)` returns false.
   */
  public static placeOn(
    item: ContainableStuff,
    surface: Stuff & Surfaced,
  ): void {
    // Resolve target environment: the surface's container.
    const surfaceAsContainable = surface as unknown as Containable;
    const targetEnv = surfaceAsContainable.getContainer();
    if (!targetEnv) {
      throw new ContainmentError(
        `placeOn: surface ${(surface as Stuff).stuffId} has no ` +
          `environment to place items into`,
      );
    }
    if (!surface.canRest(item)) {
      throw new ContainmentError(
        `placeOn: surface ${(surface as Stuff).stuffId} rejects ` +
          `${item.stuffId}`,
      );
    }
    // Move item into the surface's environment first (fires existing
    // containment hooks); then set the auxiliary restingOn pointer.
    // move() clears restingOn as part of its container-change
    // invariant when the container differs from the previous one;
    // setting restingOn AFTER move ensures the new support pointer
    // survives. When the container is unchanged (apple already in
    // the room, just moving from one desk to another in the same
    // room), move is a no-op and we go straight to the restingOn
    // update.
    ContainmentApi.move(item, targetEnv);
    item._setRestingOn(surface);
  }

  /**
   * Check if an object is contained in a specific container
   */
  public static isContainedIn(item: Stuff, container: ContainerStuff): boolean {
    return container.getContents().some((obj) => obj.stuffId === item.stuffId);
  }

  /**
   * Get the container that holds an item
   */
  public static getContainer(item: ContainableStuff): ContainerStuff | null {
    return item.getContainer();
  }

  /**
   * Get contents from a container object
   *
   * Usage:
   * ```typescript
   * const inventory = ContainmentApi.getContents(avatar);
   * const locationContents = ContainmentApi.getContents(location);
   * ```
   */
  public static getContents(container: ContainerStuff): ContainableStuff[] {
    return container.getContents();
  }

  /**
   * Find the first reachable Stuff matching `predicate`, searched in
   * "on your person, then the room" order: installed augmentations
   * (slot occupants), then carried inventory, then the surrounding
   * location's contents. Returns null when nothing matches.
   *
   * The reach surface mirrors the `canReach` validator's criteria
   * (inventory + location contents), extended with slot occupants so
   * an installed implant counts as on-person. No global index — scans
   * only the actor and the given location.
   *
   * Generalizes the old check-inventory-and-augs scans: fast travel
   * uses it to find a credential (card or implant) or the node you're
   * standing at, but it is deliberately predicate-agnostic.
   */
  public static findReachable<T>(
    actor: Stuff,
    location: ContainerStuff | null,
    predicate: (s: Stuff) => s is Stuff & T,
  ): (Stuff & T) | null {
    // 1. Installed augmentations — slot occupants ("on your person").
    if (MixinApi.isSlotted(actor)) {
      for (const occupants of actor.getAllOccupants().values()) {
        for (const occ of occupants) {
          if (predicate(occ)) return occ;
        }
      }
    }
    // 2. Carried inventory.
    if (MixinApi.isContainer(actor)) {
      for (const item of actor.getContents()) {
        if (predicate(item)) return item;
      }
    }
    // 3. Surrounding location contents.
    if (location) {
      for (const item of location.getContents()) {
        if (predicate(item)) return item;
      }
    }
    return null;
  }

  /**
   * Resolve a spawn/landing reference into the live Container to place
   * something in. The reference is EITHER a Warren — land in its lazily
   * created (and migration-tracked) host via `getHost()` — or an ordinary
   * location: a singleton room is reused, a non-singleton is cloned fresh
   * (`StuffApi.singletonOrClone`).
   *
   * Returns the resolved container plus the Warren when the ref named one,
   * so a caller that must follow host migration — a self-seating fixture —
   * can register with it; `warren` is null for a plain location.
   *
   * This is the warren-aware landing resolution shared by avatar spawn
   * (game entry, `Avatar.applyStartLocation`) and self-seating fixtures
   * (`FixtureMixin.seatSelf`). `StuffApi.singletonOrClone` stays the
   * generic, domain-free primitive; this is its Warren-aware sibling. The
   * `Warren` value is loaded dynamically so the static import graph stays
   * acyclic (`Warren` imports `ContainmentApi`).
   */
  public static async resolveLanding(
    ref: string
  ): Promise<{ container: Stuff & Container; warren: Warren | null }> {
    const { Warren } = await import('../lib/location/Warren');
    const cls = await StuffApi.classForRef(ref);
    if ((cls.prototype as object) instanceof Warren) {
      const warren = await StuffApi.singleton<Warren>(ref);
      return { container: await warren.getHost(), warren };
    }
    return {
      container: await StuffApi.singletonOrClone<Stuff & Container>(ref),
      warren: null,
    };
  }
}

/**
 * Call an optional Witness hook by name. The dispatcher uses
 * `typeof === 'function'` so the proxy resolves through any shadow
 * stack naturally — a shadow that defines `onEntered` participates
 * without needing a `MixinApi.hasMixin` precheck on the host.
 *
 * Returns the hook's return value (or `undefined` if no hook present).
 */
function callHook<T>(
  obj: object,
  hookName: string,
  args: unknown[]
): T | undefined {
  const fn = (obj as Record<string, unknown>)[hookName];
  if (typeof fn !== 'function') return undefined;
  return (fn as (...a: unknown[]) => T).apply(obj, args);
}

function assertVetoOk(result: VetoResult | undefined, hookName: string): void {
  if (!result) return;
  if (result.ok) return;
  throw new ContainmentError(
    `${hookName} veto: ${result.reason}`,
    { cause: { hookVeto: result, hookName } }
  );
}

SecurityApi.decorateApiClass(ContainmentApi);
