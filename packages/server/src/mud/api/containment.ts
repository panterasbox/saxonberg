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
 *
 * This Api is a thin, security-gated forwarding shell: the logic lives
 * in the hot-reloadable {@link ContainmentLogic} singleton at
 * `/obj/api/containment`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /obj/api/containment` reloads it. The
 * narrow-entry guards on `forceMove` (FromController) and `placeDirect`
 * (ApiOnly) stay on these face statics — the face is the security
 * boundary.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type { Containable } from '../lib/spatial/Containable';
import type { Surfaced } from '../lib/spatial/Surfaced';
import type { Warren } from '../lib/location/Warren';
import { StuffApi } from './stuff';
import { MixinApi } from './mixin';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { ContainmentLogic } from '../obj/api/ContainmentLogic';
import { fileURLToPath } from 'url';
// `TeleportController` / `GotoController` are reached lazily via
// string module ids to avoid a value-level static-import cycle
// (api/containment → controller → ContainmentApi).

type ContainerStuff = Stuff & Container;
type ContainableStuff = Stuff & Containable;

const LOGIC_PATH = '/obj/api/containment';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/ContainmentLogic', import.meta.url)
);

/** Resolve the HMR-able ContainmentLogic singleton (sync). */
function logic(): ContainmentLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ContainmentLogic'
      ) as typeof ContainmentLogic | null) ?? ContainmentLogic)()
  );
}

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
export type MergeOnArrivalHook = (
  moved: Stuff,
  to: Stuff & Container
) => void;

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
    logic()._registerMergeOnArrivalHook(hook);
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
    logic().move(item, to);
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
    logic().forceMove(item, to);
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
    logic().placeDirect(item, env);
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
    logic().placeOn(item, surface);
  }

  /**
   * Check if an object is contained in a specific container
   */
  public static isContainedIn(item: Stuff, container: ContainerStuff): boolean {
    return logic().isContainedIn(item, container);
  }

  /**
   * Get the container that holds an item
   */
  public static getContainer(item: ContainableStuff): ContainerStuff | null {
    return logic().getContainer(item);
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
    return logic().getContents(container);
  }

  /**
   * Filter a contents snapshot to the **loose** (top-level) items — those
   * NOT resting on another item *in the same set*. Items resting on a listed
   * surface (the bottles on the back-bar) are represented by that surface and
   * discovered by examining it (`look <surface>`); listing them as room
   * contents is the clutter we avoid. Shared by every contents-presentation
   * surface — `look`, `sense`, and the inspection-pane projection — so they
   * agree. Pure: the containment walk is unchanged; this only shapes what's
   * presented at top level.
   */
  public static looseContents(items: readonly Stuff[]): Stuff[] {
    const ids = new Set(items.map((i) => i.stuffId));
    return items.filter((item) => {
      const surface = MixinApi.isContainable(item) ? item.getRestingOn() : null;
      return !(surface && ids.has(surface.stuffId));
    });
  }

  /**
   * Find the first reachable Stuff matching `predicate`, searched in
   * "on your person, then the room" order: installed augmentations
   * (slot occupants), then carried inventory, then the surrounding
   * location's contents. Returns null when nothing matches.
   *
   * The reach surface mirrors the `canReach` validator's criteria
   * (inventory + location contents), extended with slot occupants so
   * an installed implant counts as on-person, plus two legs for the
   * three-base capability model: the **self leg** (a capability
   * composed directly on the actor / its species) and the
   * **descend-into-host leg** (an incorporeal update Idea hosted on an
   * attunement host — the actor itself, an installed implant, or a
   * carried attuned Thing). No global index — scans only the actor and
   * the given location.
   *
   * Order (on-your-person first): self → self's hosted updates → slot
   * occupants (+ their hosted updates) → carried (+ carried hosts'
   * hosted updates) → location contents.
   *
   * Generalizes the old check-inventory-and-augs scans: fast travel
   * uses it to find a credential (card Thing, or hosted credential
   * update) or the node you're standing at, but it is deliberately
   * predicate-agnostic.
   *
   * **Guardrail — `findReachable` vs. MQL.** This answers exactly one
   * question: *is there a reachable bearer of capability-**type** X for
   * the engine to route behavior through?* — keyed on a mixin type,
   * first-match, returning a type-narrowed `Stuff & T`. It is NOT a
   * query engine. Anything keyed on identity / keywords / properties /
   * user input — argument resolution, choosing among matches,
   * filtering, live/subscribable results — belongs to MQL, never here.
   * The host-descent leg is bounded to a single concept and a single
   * level; do not teach this helper another leg.
   */
  public static findReachable<T>(
    actor: Stuff,
    location: ContainerStuff | null,
    predicate: (s: Stuff) => s is Stuff & T,
  ): (Stuff & T) | null {
    return logic().findReachable(actor, location, predicate);
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
    return logic().resolveLanding(ref);
  }
}

SecurityApi.decorateApiClass(ContainmentApi);
