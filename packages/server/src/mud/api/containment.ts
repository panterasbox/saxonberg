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

import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type { Containable } from '../lib/spatial/Containable';
import type { Placing } from '../lib/spatial/Placing';
import type Placement from '../platform/idea/Placement';
import type { Warren } from '../lib/location/Warren';
import { StuffApi } from './stuff';
import { MixinApi } from './mixin';
import { HotReloadApi } from './hot-reload';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { ContainmentLogic } from '../platform/idea/api/ContainmentLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';
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

  constructor(message: string, opts?: { cause?: unknown }) {
    super(message);
    this.name = 'ContainmentError';
    if (opts?.cause !== undefined) this.cause = opts.cause;
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
export class ContainmentApi {
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

  /**
   * Place `item` under the placement `name` on `host` — the placement
   * analogue of {@link move}. Containment stays hierarchical and
   * exclusive; where inside its container a thing sits is an orthogonal
   * auxiliary pair (the host, and the member's name).
   *
   * Pipeline:
   *   1. Resolve the target environment as the host's container.
   *      Placement hosts are themselves Containable; their environment
   *      is where the placed items live (the desk lives in the room;
   *      apples on the desk are also in the room).
   *   2. Run the host's `canPlace(item, name)` veto. Throws on
   *      programmatic-contract failure (validators upstream produce
   *      friendly user-input messages).
   *   3. `move(item, targetEnv)` — fires the usual container change
   *      hooks AND clears any prior placement as part of the
   *      change-of-container invariant.
   *   4. Set the placement pair. Order matters: move() in step 3 clears
   *      it; the `_setPlacement` after restamps to the new host.
   *
   * @throws ContainmentError when the host has no environment to place
   *   the item into, OR when `host.canPlace(item, name)` vetoes.
   */
  public static place(
    item: ContainableStuff,
    name: string,
    host: Stuff & Placing,
  ): void {
    logic().place(item, name, host);
  }

  /**
   * ⭐ The one **synchronous** door onto the ways-of-sitting vocabulary
   * — the live `Placement` member called `name`, or `null` when no
   * installed pack ships it.
   *
   * Sync because every reader is on a dispatch path: `put` resolving a
   * typed preposition, `look` labelling a drill-in list, a Containable
   * asking whether its member encloses. Null is the shipped default
   * everywhere, so a cold catalogue degrades to "the behaviour before
   * the vocabulary" rather than to a broken verb — and the catalogue
   * warms lazily on the first async miss.
   *
   * ⚠ A `lib/` mixin calls THIS, never the catalogue: the roster is a
   * platform singleton and `lib/` may not reach into `platform/`.
   */
  public static placement(name: string): Placement | null {
    return logic().placement(name);
  }

  /**
   * The member a typed preposition names — `onto` → `on`, `from` →
   * `from`. A member's primary word always wins its own key.
   */
  public static placementForWord(word: string): Placement | null {
    return logic().placementForWord(word);
  }

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
  // (api/mql/scope-walk.ts `candidatesForReachable` — self → own hosted
  // updates → slot occupants → carried → location → peers, on-person
  // first). Callers resolve the pool via `MqlApi.resolveMany('reachable',
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
  /**
   * ⭐⭐ **Land a NEWLY MINTED good** — `move` it, then do the two things a
   * minted good needs and a moved one already has: stamp its title to
   * `owner` (when it has none yet) and record where it is
   * (`followCustody`), then capture the hosts that now hold it.
   *
   * ⚠ Why this is not just `move`. A good minted onto a floor was moved by
   * NOBODY — `get`/`drop`/`put` call `followCustody` after their moves,
   * and a verb that clones a thing into the world does not. The room's
   * estate slice then skips a player's good with no recorded `place`, the
   * overlay never finds it, and the good is gone at the next restart. The
   * craft mint, `fell`, and every trade verb that clones its output land
   * through here, and `lint:mint-custody` holds the rest to a ratchet.
   *
   * `owner` defaults to nobody: the thing is placed and captured, and its
   * title is whatever it already had. Persistence failures are warned,
   * never thrown — the act that made the thing is not unmade by them.
   */
  public static async land(
    item: ContainableStuff,
    to: ContainerStuff,
    owner: Stuff | null = null,
  ): Promise<void> {
    return logic().land(item, to, owner);
  }

  public static async resolveLanding(
    ref: string
  ): Promise<{ container: Stuff & Container; warren: Warren | null }> {
    return logic().resolveLanding(ref);
  }
}

SecurityApi.decorateApiClass(ContainmentApi);
