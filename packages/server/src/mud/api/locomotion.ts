/**
 * LocomotionApi — cross-cutting helpers for the locomotion subsystem.
 *
 * Holds mode resolution, eligibility predicates, enablement walks,
 * passthrough-chain resolution, emission resolution, and the
 * engageAround / isTransientEngagement framework-internal helpers.
 *
 * All inputs that reference a mode by name accept either the short
 * name (`'walk'`) or the full templatePath (`/obj/LocomotionMode/walk`).
 *
 * Thin, security-gated forwarding shell: the logic lives in the
 * hot-reloadable {@link LocomotionLogic} singleton at
 * `/obj/api/locomotion`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /obj/api/locomotion` reloads it
 * (HMR demo in hot-reload.md).
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Containable } from '../lib/spatial/Containable';
import type { Mobile } from '../lib/spatial/Mobile';
import type Exit from '../lib/boundary/Exit';
import type { TraversalGuard } from '../lib/boundary/Exit';
import type {
  LocomotionMode,
  BodyProfile,
  GroundContact,
  NoiseLevel,
} from '../obj/LocomotionMode';
import type { Enablement } from '../lib/locomotion/Enablement';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { LocomotionLogic } from '../obj/api/LocomotionLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

// Author-surface types ride this face (type-only re-exports — weightless).
export type {
  TraversalGuard,
  Enablement,
  BodyProfile,
  GroundContact,
  NoiseLevel,
};

/**
 * Aggregated emission data exposed to trap / detection / sound
 * consumers. `resolvedHostChain` lists the passthrough hosts walked
 * to reach the emitting mode (empty when the actor is the emitter
 * directly).
 */
export interface EmissionData {
  modeName: string;
  noiseLevel: NoiseLevel;
  bodyProfile: BodyProfile;
  groundContact: GroundContact;
  resolvedHostChain: Stuff[];
}

const LOGIC_PATH = '/obj/api/locomotion';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/LocomotionLogic', import.meta.url)
);

/** Resolve the HMR-able LocomotionLogic singleton (sync). */
function logic(): LocomotionLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'LocomotionLogic'
      ) as typeof LocomotionLogic | null) ?? LocomotionLogic)()
  );
}

export class LocomotionApi {
  // ── enablement validators ────────────────────────────────────────

  /**
   * Validate an Enablement axes list (Climbable / Swimmable / Flyable
   * `setAxes`). Throws `TypeError` on a duplicate or empty-string
   * entry. `where` labels the throw with the calling setter.
   */
  public static assertEnablementAxes(value: string[], where: string): void {
    logic().assertEnablementAxes(value, where);
  }

  /**
   * Validate an Enablement difficulty value (Climbable / Swimmable /
   * Flyable `setDifficulty`). Throws `RangeError` on a non-null,
   * non-positive, or non-finite value. `where` labels the throw with
   * the calling setter.
   */
  public static assertEnablementDifficulty(
    value: number | null,
    where: string,
  ): void {
    logic().assertEnablementDifficulty(value, where);
  }

  // ── mode resolution ──────────────────────────────────────────────

  /**
   * Resolve a `LocomotionMode` by short name (e.g. `'walk'`) or full
   * templatePath. Returns `null` when the singleton isn't loaded —
   * lazy resolution is intentional (avoids hard-pinning the nine
   * singletons in the bootstrap manifest).
   */
  public static modeOf(nameOrPath: string): LocomotionMode | null {
    return logic().modeOf(nameOrPath);
  }

  public static modeOfOrThrow(nameOrPath: string): LocomotionMode {
    return logic().modeOfOrThrow(nameOrPath);
  }

  /**
   * Async-lazy companion to `modeOf` / `modeOfOrThrow`. Awaits
   * `StuffApi.singleton` so the mode is cloned on first use, then
   * subsequent sync lookups (e.g., from `Mobile.getEngagedMode`,
   * `Drivable.getVehicularMode`) hit the cached singleton.
   *
   * Use this from async caller paths that need the mode for the
   * first time — verb controllers, `traverseWithDefault`, anywhere
   * the lazy-design's first-touch happens. Pure registry hits stay
   * with the sync `modeOf` family.
   */
  public static async loadMode(nameOrPath: string): Promise<LocomotionMode> {
    return logic().loadMode(nameOrPath);
  }

  /**
   * Ensure the actor's species + bodyplan singletons are live so the
   * sync eligibility cascade (`bodyPlanAllows`, `postureAllows`, etc.)
   * can read them via `findByTemplatePath`. Without this, a fresh
   * server's first organism-shaped `go` reports "Your body can't
   * walk." even for a Homo-sapiens-with-biped-bodyplan avatar — the
   * species is loaded by the `requiresAnimate` validator preload but
   * the bodyplan singleton was never touched.
   *
   * No-op for non-Organism actors and for Organisms with no
   * `_speciesPath` / `_bodyPlanPath` — those skip the bodyplan gate
   * naturally per `bodyPlanAllows`.
   *
   * Idiomatically paired with `loadMode` at locomotion entry points.
   */
  public static async preloadActorAnatomy(actor: Stuff): Promise<void> {
    return logic().preloadActorAnatomy(actor);
  }

  /**
   * Every live `LocomotionMode` singleton. O(N) over the global
   * registry; v1's universe is small enough that this is acceptable.
   */
  public static allModes(): readonly LocomotionMode[] {
    return logic().allModes();
  }

  /**
   * Pick the mode a host is currently moving under. Resolution:
   *   1. The host's `engagedMode` (when non-null).
   *   2. The host's `vehicularMode` (when Drivable). If the host IS
   *      Drivable but `vehicularMode` is `null`, throw — Drivables
   *      that ship without an authored vehicular mode are a content
   *      authoring bug (e.g., a cart with no idea how it moves). Fail
   *      loudly so the bug surfaces in dev rather than silently
   *      walk-traversing a wheeled vehicle.
   *   3. Walk (universe-default) for non-Drivable Mobile hosts that
   *      aren't engaged — covers idle NPCs, parked Mountables, etc.,
   *      where walk is the sensible neutral.
   */
  public static resolveHostMode(host: Stuff & Mobile): LocomotionMode {
    return logic().resolveHostMode(host);
  }

  // ── eligibility predicates ───────────────────────────────────────

  public static bodyPlanAllows(actor: Stuff, mode: LocomotionMode): boolean {
    return logic().bodyPlanAllows(actor, mode);
  }

  public static postureAllows(actor: Stuff, mode: LocomotionMode): boolean {
    return logic().postureAllows(actor, mode);
  }

  public static exitAllowsMode(exit: Exit, mode: LocomotionMode): boolean {
    return logic().exitAllowsMode(exit, mode);
  }

  /**
   * Bare body-plan + posture predicate. Doesn't consult exit /
   * enablement / conveyance — those live in `canTraverseExit`.
   */
  public static canEngage(actor: Stuff, mode: LocomotionMode): boolean {
    return logic().canEngage(actor, mode);
  }

  /**
   * Run the full mode-gate cascade against an actor + a pre-resolved
   * exit. Used by `LocomotionControllerBase` after MQL has resolved
   * the player's typed direction (or door alias) into `target.via.exit`.
   *
   * Gate order (first failure surfaces):
   *   1. body-plan eligibility
   *   2. posture eligibility
   *   3. exit-allowed-modes (`Exit.canTraverse`)
   *   4. enablement (per-mode, field-driven via `getEnablementMixin`)
   */
  public static canTraverseExit(
    actor: Stuff & Containable,
    exit: Exit,
    mode: LocomotionMode,
    direction: string,
  ): TraversalGuard {
    return logic().canTraverseExit(actor, exit, mode, direction);
  }

  // ── enablement walk ──────────────────────────────────────────────

  /**
   * Resolve the enablement gate for a mode. Three shapes:
   *   - Passthrough mode (`getPassthrough()`): walk the actor's slot
   *     occupations looking for a host that composes the mode's
   *     `conveyanceMixin`.
   *   - Mode with `enablementMixin` (climb / swim / fly): walk the
   *     actor's scope looking for a host that composes that mixin AND
   *     accepts the direction AND can be engaged by the actor.
   *   - No enablement (walk-shaped or vehicular host-engaged): no
   *     scope check; `{ ok: true }`.
   */
  public static checkEnablement(
    actor: Stuff & Containable,
    mode: LocomotionMode,
    direction: string,
  ): TraversalGuard {
    return logic().checkEnablement(actor, mode, direction);
  }

  // ── passthrough chain ────────────────────────────────────────────

  /**
   * Walk a single passthrough hop: given an actor engaged in a
   * passthrough mode, find the conveyance host they're slotted into.
   * Throws when called with a non-passthrough mode (programmatic
   * misuse).
   */
  public static findConveyanceHost(
    actor: Stuff,
    mode: LocomotionMode,
  ): Stuff | null {
    return logic().findConveyanceHost(actor, mode);
  }

  /**
   * Walk the passthrough chain to the host whose engaged mode is
   * non-passthrough, and return its emission data. Returns `null` if
   * the mover isn't Mobile, isn't engaged in anything, or the chain
   * runs out of valid hosts.
   *
   * Cycle guard: `MAX_PASSTHROUGH_DEPTH` (16, mirrors `Mobile.traverse`'s
   * conveyance ripple guard). Cycles aren't possible from any *valid*
   * runtime state — slot occupancy is a tree by construction — but
   * authored content can goof and produce a circular shape: e.g., two
   * Stuff that are each both `Slotted` and `Slottable`, where A's
   * mount slot holds B and B's mount slot holds A, both engaged in
   * `ride`. `findConveyanceHost(A, ride) → B`, then `findConveyanceHost
   * (B, ride) → A`, etc. The guard caps the walk at 16 hops and
   * returns `null` rather than spinning forever — the legitimate
   * passthrough depths Saxonberg cares about (rider → horse → cart →
   * road, etc.) are nowhere near that bound.
   */
  public static emissionAt(mover: Stuff): EmissionData | null {
    return logic().emissionAt(mover);
  }

  // ── eligibility queries ──────────────────────────────────────────

  /**
   * Modes whose body-plan + posture gates an actor passes right now.
   * Backs future verb-help / UI surfaces; does NOT consult exit or
   * scope (those are per-traversal concerns).
   */
  public static eligibleModes(actor: Stuff): readonly LocomotionMode[] {
    return logic().eligibleModes(actor);
  }

  // ── engagement lifecycle ─────────────────────────────────────────

  /**
   * Run `action` with `actor.engagedMode` set to `mode`. After the
   * action resolves, clear engagedMode when the mode is transient
   * (per `isTransientEngagement`) — leave it set when persistent (the
   * actor is still in the engaged scope at the destination).
   *
   * Errors from `action` propagate; the finally clause clears
   * engagement for transient modes regardless, ensuring no stale
   * engagedMode survives a failed traversal.
   */
  public static async engageAround<T>(
    actor: Stuff & Mobile,
    mode: LocomotionMode,
    exit: Exit,
    action: () => Promise<T>,
  ): Promise<T> {
    return logic().engageAround(actor, mode, exit, action);
  }

  /**
   * "Should `engageAround` clear engagedMode after the traversal?"
   *
   *   - Passthrough modes (ride / drive): false — engagement persists
   *     while the actor remains in the conveyance host's slot. The
   *     `Slotted.vacate` witness clears it on dismount.
   *   - Modes with no enablement (walk / wheeled / sailed / aerial):
   *     true — nothing to remain "in" at the destination.
   *   - Modes with an enablement mixin (climb / swim / fly):
   *     persistent if the destination still composes the mixin OR
   *     contains a Containable that does; transient otherwise.
   */
  public static isTransientEngagement(
    mode: LocomotionMode,
    exit: Exit,
  ): boolean {
    return logic().isTransientEngagement(mode, exit);
  }

  // ── default-mode resolution ──────────────────────────────────────

  /**
   * Three-layer chain for "what mode should this actor default to?":
   *
   *   1. User-explicit `movement.defaultMode` setting (only for hosts
   *      composing `EnvironmentMixin` — players who've customized).
   *   2. The actor's body-plan default (`BodyPlan.defaultLocomotionMode`)
   *      — meaningful for NPCs (bird → fly, fish → swim, etc.). Skipped
   *      for non-Organism actors.
   *   3. Universe default `'walk'`.
   *
   * `ShellApi.resolveSetting('movement.defaultMode')` is deliberately
   * NOT used — its built-in schema-default fallback to `'walk'` would
   * short-circuit the bodyplan layer. the giver's own explicit `movement.defaultMode` override (via
   * `Environment.getOwnSetting`) returns the
   * explicit override only.
   */
  public static defaultModeFor(actor: Stuff): string {
    return logic().defaultModeFor(actor);
  }

  // ── default-mode convenience ─────────────────────────────────────

  /**
   * Resolve the actor's default mode (see `defaultModeFor` for the
   * chain) into the corresponding `LocomotionMode` singleton, then
   * traverse `exit` with full engagement bookkeeping via
   * `engageAround`. Convenience for programmatic callers that want
   * "use the actor's preferred mode" without resolving the singleton
   * themselves.
   *
   * Throws on mode-gate failure (mirrors `Mobile.traverse`'s contract).
   */
  public static async traverseWithDefault(
    actor: Stuff & Mobile & Containable,
    exit: Exit,
  ): Promise<void> {
    return logic().traverseWithDefault(actor, exit);
  }
}

SecurityApi.decorateApiClass(LocomotionApi);
