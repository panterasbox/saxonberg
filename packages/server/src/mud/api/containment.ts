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
 * `/platform/idea/api/containment`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /platform/idea/api/containment` reloads it. The
 * narrow-entry guards on `forceMove` (FromController) and `placeDirect`
 * (ApiOnly) stay on these face statics — the face is the security
 * boundary.
 */

import type { ArrivalRefusal } from '../lib/spatial/Container';
import type { ApiNeed } from './security';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type { Containable } from '../lib/spatial/Containable';
import type { Placing } from '../lib/spatial/Placing';
import type { Warren } from '../lib/location/Warren';
import type { ActPlan } from '../lib/craft/ActPlan';
import { StuffApi } from './stuff';
import { MixinApi } from './mixin';
import { HotReloadApi } from './hot-reload';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { ContainmentLogic } from '../platform/idea/api/ContainmentLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';
import PlacementCatalogue from '../platform/idea/PlacementCatalogue';
import { Placements } from '../lib/spatial/Placement';
// `GotoController` is reached lazily via a string module id to avoid a
// value-level static-import cycle (api/containment → controller →
// ContainmentApi).

type ContainerStuff = Stuff & Container;
type ContainableStuff = Stuff & Containable;

const LOGIC_PATH = '/platform/idea/api/containment';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/ContainmentLogic', import.meta.url)
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
  /**
   * The refusal's reason when a destination refused the arrival (size and
   * carrying W8: `nowhere-to-carry`, `too-heavy`, …) — for a caller that
   * catches and words it. The message is for the author.
   */
  public readonly reason?: string;
  /** The refusal's facts (the item, what the hands hold, what was tried). */
  public readonly facts?: unknown;

  constructor(message: string, opts?: { cause?: unknown; reason?: string; facts?: unknown }) {
    super(message);
    this.name = 'ContainmentError';
    if (opts?.cause !== undefined) this.cause = opts.cause;
    if (opts?.reason !== undefined) this.reason = opts.reason;
    if (opts?.facts !== undefined) this.facts = opts.facts;
  }
}

/**
 * Late-bound merge-on-arrival hook. `StackableApi` registers a
 * function at module load that handles the "moved Stackable arrived
 * in a container holding a mergeable sibling" ripple. Lives here as
 * a slot rather than a direct import to avoid the
 * containment → stack → containment cycle.
 *
 * The hook fires AFTER post-move `on*` witnesses so subscribers see
 * the arrival before the absorbed Stuff destructs. Hook implementor
 * is responsible for the `MixinApi.isStackable` skip path.
 */
export type MergeOnArrivalHook = (
  moved: Stuff,
  to: Stuff & Container
) => void;

/**
 * Static API for containment and movement operations.
 */
/**
 * Where a `put` goes (controller-liquidity W8): an open SLOT the item fits (a
 * slot is more specific than a container), the container's own interior
 * (region zero), or a placement region the host offers (`on`, `from`, …).
 */
export type PutRoute =
  | { kind: 'slot'; slot: string }
  | { kind: 'zero' }
  | { kind: 'region'; name: string; word: string };

/**
 * ⭐ Every reason a `put` will not go — the closed union `put` words.
 * `wrong-preposition` / `preposition-ambiguous`: the word against what the
 * host offers (`takes`, and what was typed); `slot-host-not-container`: the
 * item fits a slot on something with nowhere for it to sit; `shut`;
 * `refused-by-container`: the container says what it is for (`said` is its
 * own sentence — `canAddContainable`'s veto); `cannot-rest`: the region
 * will not hold it; `cursed-will-not-release`: it will not leave the
 * putter's body; `wont-fit`: the tape measure says no (size and carrying
 * D4 — through the mouth, along the closed sides, or no room left).
 */
export type PlaceRefusal =
  | {
      ok: false;
      reason: 'wrong-preposition' | 'preposition-ambiguous';
      facts: { takes: readonly string[]; got?: string; regions?: readonly string[] };
    }
  | { ok: false; reason: 'slot-host-not-container'; facts?: undefined }
  | { ok: false; reason: 'shut'; facts?: undefined }
  | { ok: false; reason: 'refused-by-container'; facts: { said: string | null } }
  /** A person handed it and their body refused (size and carrying W8) — facts for the verb to word. */
  | { ok: false; reason: 'refused-by-carrier'; facts: { carry: ArrivalRefusal } }
  | { ok: false; reason: 'cannot-rest'; facts: { word: string; why: string } }
  | { ok: false; reason: 'cursed-will-not-release'; facts: { dumpedTau: number } }
  | {
      ok: false;
      reason: 'wont-fit';
      facts: { why: 'too-big-for-mouth' | 'too-big-inside' | 'no-room' | 'not-shaped-for' };
    };

/**
 * A `put` that will go: the route, and the move at once (`durationMs: 0`).
 * The completion lets the item go from the putter's body first (the release
 * gate a curse can refuse), then moves it; `named` is the item's name read
 * before the move (a stack that lands on its like merges and is gone).
 */
export type PutPlan = ActPlan<
  { route: PutRoute },
  { route: PutRoute; named: string },
  PlaceRefusal
>;

export class ContainmentApi {
  /** ⭐ The kernel's placement words, stood by the boot routine (no host readies them). */
  static readonly needs: readonly ApiNeed[] = [() => ContainmentApi.placements().ensureKernel()];

  /**
   * ⭐ The placements — the ways a thing sits in its container (`on` a
   * desk, `in` a drawer, `from` a hook), any pack's `content/placements/`,
   * served by {@link PlacementCatalogue}. Every place loads the kernel's;
   * a host's `placements` setter loads its own; a typed `put X on Y` is
   * resolved against the host's own.
   */
  public static placements(): PlacementCatalogue {
    return StuffApi.singletonSync('/platform/idea/PlacementCatalogue', () => new PlacementCatalogue());
  }

  /**
   * Install (or replace) the merge-on-arrival hook. Called once by
   * `StackableApi` at module load. The `_` prefix marks it
   * framework-internal — same shape as `SecurityApi._registerShadowApi`.
   *
   * @internal
   */
  public static _registerMergeOnArrivalHook(hook: MergeOnArrivalHook): void {
    logic()._registerMergeOnArrivalHook(hook);
  }

  /**
   * ⭐⭐ **The movement primitive — the one way a thing is put somewhere.**
   * `move(item, dest)` moves it into `dest`; `move(item, desk)` puts it ON
   * a placing host (into the host's environment, with the placement pair);
   * `move(item, loft, Placements.IN)` names the placement (by path, or a
   * typed word the host resolves) when a host offers more
   * than one. `null` detaches it.
   *
   * Everything a move implies beyond geometry is DERIVED here, so no
   * caller has to remember it:
   *   - **custody** — an owned good records where it now is, so it is
   *     where it was left after a restart;
   *   - **title** — a FRESH good (arriving from nowhere: just made) is
   *     titled by derivation: to whoever owned what it was MADE FROM
   *     (`StuffApi.clone`'s `madeFrom`); else the person whose hands it
   *     lands in; else the acting person, in a live command, where they
   *     stand; else its recorded maker. A good that already exists is
   *     never retitled by being moved — taking one is theft.
   *
   * ⭐⭐ **A body is a destination that places what arrives** (size and
   * carrying W8). `move(item, person)` just works: the body decides where
   * on it the thing goes — a free hand, else a pocket, a hook on the belt,
   * a worn bag, else the pack on its back (`Container.arrivalFor`). When
   * the body has no honest place for it (hands full and nothing it fits; a
   * fish, which has no pocket), `move` THROWS a `ContainmentError` naming
   * why — it never lands the thing anywhere but where you asked. To get a
   * refusal instead of a throw, ask `dest.canReceive(item)` first.
   *
   * The other layer is a thing moving ITSELF ({@link MobileMixin}'s
   * `traverse`), which crosses exits and arrives through this primitive.
   *
   * Pipeline: pre-flight invariants (Exitable layering, zone crossing,
   * attached adornments) → `can*` witnesses (first veto throws) →
   * `setContainer` → `on*` witnesses → stack merge-on-arrival → custody.
   * A move within the same container is a no-op (a placement change is
   * not). Zone is never restamped on move.
   *
   * @throws ContainmentError on invariant violations, hook vetoes, or a
   *   placement the host does not offer or refuses.
   */
  public static move(
    item: ContainableStuff,
    to: ContainerStuff | (Stuff & Placing) | null,
    placement?: string,
  ): void {
    logic().move(item, to, placement);
  }

  /**
   * ⭐ **`put` asked of the world** (controller-liquidity W8): where `item`
   * would go in or on `target` for the word `prep`, and every refusal
   * before any write — the slot rule first (a slot is more specific than a
   * container), the word against the host's offers, a shut lid (refused
   * HERE, never in `move`, which brains and restocks use to fill closed
   * cupboards), the container's own say, the region's `canPlace`. The plan's
   * completion releases the item from `by`'s body and moves it. `region`
   * names one of a placing host's own regions (`inner pocket` — the
   * binder's `via.region`, size and carrying D26); several regions sharing
   * the word, unnamed, refuse `preposition-ambiguous` with their `regions`.
   *
   * Orchestration across three hosts (the putter, the item, the target), so
   * it is the Api's — the one movement case the act convention routes here.
   */
  public static putPlanFor(
    item: ContainableStuff,
    target: Stuff,
    opts: { prep?: string; by: Stuff; region?: string },
  ): PutPlan | PlaceRefusal {
    return logic().putPlanFor(item, target, opts);
  }

  /**
   * Force-bypass variant of `move()`. Pre-flight invariants still
   * fire (those are programmatic-contract guards, not policy);
   * `canMove` / `canRemoveContainable` / `canAddContainable`
   * witnesses still fire (so observers / audit hooks see the call)
   * but their veto results are ignored. Post-move `on*` hooks fire
   * identically.
   *
   * Gated to `GotoController` — the **narrow-entry pattern**. Only the
   * one author verb can reach this entry point, and it does the
   * `AccessApi.can(giver, 'force-goto' | 'force-teleport', ...)` check
   * before invoking. Combined, the mutation has exactly one legitimate
   * entry path AND that path enforces who is authorized.
   *
   * ⓘ It used to be an `AnyOf` over `GotoController` and
   * `TeleportController`. The TPA reform (P13) moved object relocation
   * onto `goto --subject` and `teleport` into the tpa capability pack,
   * which narrowed this gate to one arm — and a kernel gate could not
   * have named the pack's controller anyway.
   *
   * The controller is cloned per execution (`goto --force`), and
   * `FromModule` matches it by its class module id (code provenance), so
   * the cloned instance is admitted directly — no `FromTemplate` arm.
   * Direct calls from any other module throw `SecurityError`.
   */
  @CallSecurity(
    SecurityPolicies.FromModule('/platform/idea/cmd/author/GotoController'),
  )
  public static forceMove(
    item: ContainableStuff,
    to: ContainerStuff | null
  ): void {
    logic().forceMove(item, to);
  }

  /**
   * Place `item` in `env` without firing movement witnesses, running
   * capacity validators, or triggering the stack merge-on-arrival
   * ripple. The matter is treated as if it were already in `env`;
   * this call just records the topological fact.
   *
   * **Precondition**: `item.getContainer() === null`. This is NOT a
   * relocation primitive — existing-env Stuffs go through
   * `ContainmentApi.move`. Throws when violated.
   *
   * Use when the placement is semantically NOT an arrival:
   *   - Stack split (splitoff is freshly cloned, has no container).
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
   *   - Merge-on-arrival ripple for stacks.
   *   - Recency-stack bookkeeping (no command-contribution delta —
   *     the matter is treated as already-present).
   *
   * @internal — framework bookkeeping (a stack's split-off, a hot
   * reload), never an author's call: an author has `move`.
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

  // The `getContainer`/`getContents` read-wrappers were removed: those
  // reads live on the objects themselves — call `item.getContainer()` /
  // `container.getContents()` directly (narrow with MixinApi as needed).
  // The same rule is why `looseContents` became
  // `Container.getLooseContents()`: it read one container's own list and
  // had no business being a free Api function.


  // The old `findReachable` / `findHostedUpdate` finders were removed:
  // the reachable walk now lives in MQL's `reachable` seed
  //
  // ⚠⚠ …and removing it without leaving a signposted replacement cost
  // ELEVEN hand-rolled copies of the two-leg walk (see
  // docs/antipatterns.md § Rebuilding the two-leg reach by hand). A
  // controller uses `CommandController.reachableMarks(giver)`; anything
  // else calls `reachableFrom` below, which is the door this deletion
  // should have left open in the first place. Deleting a finder is only
  // half the job — the other half is making the replacement findable
  // from where the callers are.
  // (`PerceptionApi.reach`, filtered by api/mql/scope-walk.ts
  // `candidatesForReachable` — self → own hosted updates → slot occupants
  // → carried → the place's surface → peers, on-person first). Callers resolve the pool via `MqlApi.resolveMany('reachable',
  // …)` and narrow locally; identity-bound (own-attunement) reads scan
  // `actor.getHostedUpdates()` directly.

  /**
   * ⭐⭐ **Everything `actor` can act on**, on-person-first: what they
   * wear or wield, what they carry, then what shares their location.
   *
   * ⚠⚠ **Restoring a door that was closed without one.** The old
   * `findReachable` was deleted into MQL's `reachable` seed, which lives
   * behind a sealed subdir only `api/mql.ts` may import from and is
   * reachable only as a **viewer-gated query**. So a brain or a logic
   * singleton that wanted the plain pool had no sanctioned route and
   * wrote the two hops by hand — eleven did (docs/antipatterns.md
   * § Rebuilding the two-leg reach by hand). This is the code-side
   * answer; the seed is the query-side one.
   *
   * ⚠ The two are NOT interchangeable and the difference is the point:
   * the seed applies perception (honest fog), recognition-relative
   * naming and via-attribution, because a *player* asking "what can I
   * reach" must not be told about what they cannot see. This applies
   * none of that — it is engine bookkeeping, the same license
   * `system mode` takes. Prefer the query whenever a viewer is involved.
   *
   * ⭐ **On-person before floor**, so a first-match consumer prefers your
   * own gear over what happens to be lying about — the same contract the
   * seed keeps, and the reason a hand-rolled copy is never equivalent.
   *
   * ⚠ **Excludes the actor**, like `CommandController.reachableMarks`.
   * Only the `reachable:[…]` seed includes self, and only it reaches
   * through a passable exit — see docs/antipatterns.md
   * § Rebuilding the two-leg reach by hand for the three-way table.
   */
  static reachableFrom(actor: Stuff): Stuff[] {
    const out: Stuff[] = [];
    const seen = new Set<string>();
    const push = (s: Stuff): void => {
      if (seen.has(s.stuffId)) return;
      seen.add(s.stuffId);
      out.push(s);
    };
    // Worn and wielded first — the closest thing to hand.
    if (MixinApi.isSlotted(actor)) {
      for (const occupants of actor.getAllOccupants().values()) {
        for (const occ of occupants) push(occ);
      }
    }
    if (MixinApi.isContainer(actor)) {
      for (const c of actor.getContents()) push(c);
    }
    if (MixinApi.isContainable(actor)) {
      const env = actor.getContainer();
      if (env && MixinApi.isContainer(env)) {
        for (const c of env.getContents()) {
          if (c.stuffId !== actor.stuffId) push(c);
        }
      }
    }
    return out;
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
