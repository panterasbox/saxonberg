/**
 * LocomotionApi — cross-cutting helpers for the locomotion subsystem.
 *
 * Holds mode resolution, eligibility predicates, enablement walks,
 * passthrough-chain resolution, emission resolution, and the
 * engageAround / isTransientEngagement framework-internal helpers.
 *
 * All inputs that reference a mode by name accept either the short
 * name (`'walk'`) or the full templatePath (`/lib/locomotion/walk`).
 * Internally the API normalizes to the full path via `#toModePath` so
 * the singleton-cache lookup uses the canonical key.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Containable } from '../lib/spatial/Containable';
import type { Mobile } from '../lib/spatial/Mobile';
import type { Exit, TraversalGuard } from '../lib/boundary/Exit';
import {
  LocomotionMode,
  type BodyProfile,
  type GroundContact,
  type NoiseLevel,
} from '../lib/locomotion/LocomotionMode';
import type { Enablement } from '../lib/locomotion/Enablement';
import { StuffApi } from './stuff';
import { MixinApi } from './mixin';
import { SecurityApi } from './security';
import { SlotApi } from './slot';
import { Postures } from '../lib/slot/Postured';
import { ownSetting } from '../lib/shell/Environment';

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

/** Hard depth cap for the passthrough chain walk; matches the conveyance ripple. */
const MAX_PASSTHROUGH_DEPTH = 16;

export class LocomotionApi {
  // ── mode resolution ──────────────────────────────────────────────

  /**
   * Resolve a `LocomotionMode` by short name (e.g. `'walk'`) or full
   * templatePath. Returns `null` when the singleton isn't loaded —
   * lazy resolution is intentional (avoids hard-pinning the nine
   * singletons in the bootstrap manifest).
   */
  public static modeOf(nameOrPath: string): LocomotionMode | null {
    const path = LocomotionApi.toModePath(nameOrPath);
    return StuffApi.findByTemplatePath<LocomotionMode>(path) ?? null;
  }

  public static modeOfOrThrow(nameOrPath: string): LocomotionMode {
    const mode = LocomotionApi.modeOf(nameOrPath);
    if (!mode) {
      throw new Error(
        `LocomotionMode not loaded: ${LocomotionApi.toModePath(nameOrPath)}`,
      );
    }
    return mode;
  }

  /** Short name → full path; full path passes through. */
  private static toModePath(nameOrPath: string): string {
    if (nameOrPath.startsWith('/')) return nameOrPath;
    return `/lib/locomotion/${nameOrPath}`;
  }

  /**
   * Every live `LocomotionMode` singleton. O(N) over the global
   * registry; v1's universe is small enough that this is acceptable.
   */
  public static allModes(): readonly LocomotionMode[] {
    const out: LocomotionMode[] = [];
    for (const obj of StuffApi.getAllObjects()) {
      if (obj instanceof LocomotionMode) out.push(obj);
    }
    return out;
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
    const engaged = host.getEngagedMode();
    if (engaged) return engaged;
    if (MixinApi.isDrivable(host)) {
      const veh = host.getVehicularMode();
      if (veh) return veh;
      throw new Error(
        `LocomotionApi.resolveHostMode: Drivable host ${host.stuffId} has ` +
          `no vehicularMode authored — set one via setVehicularMode at ` +
          `template-time (e.g., wheeled for carts, sailed for boats)`,
      );
    }
    return LocomotionApi.modeOfOrThrow('walk');
  }

  // ── eligibility predicates ───────────────────────────────────────

  public static bodyPlanAllows(actor: Stuff, mode: LocomotionMode): boolean {
    const required = mode.getRequiresBodyPlanMode();
    if (required.length === 0) return true;
    // Non-Organism actors have no body-plan to consult. The body-plan
    // gate exists to model anatomy constraints (sessile plants can't
    // walk, fish can't fly, etc.); something without a body-plan
    // (vehicle, abstract entity, test fixture Mobile) is outside that
    // model — treat it as "no anatomy constraint applies" rather than
    // a blanket reject. The plan's Q12.3 sessile-plant case stays
    // covered: sessile plants ARE organisms with an empty
    // locomotionModes list.
    if (!MixinApi.isOrganism(actor)) return true;
    const species = actor.getSpecies();
    const bodyPlan = species?.getBodyPlan();
    const planModes = bodyPlan?.getLocomotionModes() ?? [];
    return required.some((m) => planModes.includes(m));
  }

  public static postureAllows(actor: Stuff, mode: LocomotionMode): boolean {
    const required = mode.getRequiresPosture();
    if (required.length === 0) return true;
    const posture = MixinApi.isPosed(actor)
      ? actor.getPosture()
      : Postures.Stand;
    return required.includes(posture);
  }

  public static exitAllowsMode(exit: Exit, mode: LocomotionMode): boolean {
    return exit.allowsMode(mode.getName());
  }

  /**
   * Bare body-plan + posture predicate. Doesn't consult exit /
   * enablement / conveyance — those live in `canTraverseExit`.
   */
  public static canEngage(actor: Stuff, mode: LocomotionMode): boolean {
    return (
      LocomotionApi.bodyPlanAllows(actor, mode) &&
      LocomotionApi.postureAllows(actor, mode)
    );
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
    if (!LocomotionApi.bodyPlanAllows(actor, mode)) {
      return {
        ok: false,
        gate: 'bodyPlan',
        mode: mode.getName(),
        reason: `Your body can't ${mode.getName()}.`,
      };
    }
    if (!LocomotionApi.postureAllows(actor, mode)) {
      return {
        ok: false,
        gate: 'posture',
        mode: mode.getName(),
        reason: `You can't ${mode.getName()} from this posture.`,
      };
    }
    const exitGuard = exit.canTraverse(actor, mode.getName());
    if (!exitGuard.ok) return exitGuard;
    return LocomotionApi.checkEnablement(actor, mode, direction);
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
    if (mode.getPassthrough()) {
      return LocomotionApi.checkConveyance(actor, mode);
    }
    const mixinName = mode.getEnablementMixin();
    if (!mixinName) return { ok: true };
    return LocomotionApi.checkEnablementScope(
      actor,
      mode,
      direction,
      mixinName,
    );
  }

  private static checkEnablementScope(
    actor: Stuff & Containable,
    mode: LocomotionMode,
    direction: string,
    mixinName: string,
  ): TraversalGuard {
    const host = LocomotionApi.findEnablementHost(
      actor,
      mixinName,
      direction,
    );
    if (!host) {
      return {
        ok: false,
        gate: 'enablement',
        mode: mode.getName(),
        reason: `There's no way to ${mode.getName()} ${direction}.`,
        context: { missing: mixinName },
      };
    }
    if (!host.canBeEngagedBy(actor)) {
      return {
        ok: false,
        gate: 'capability',
        mode: mode.getName(),
        reason: `That's too hard for you.`,
        context: { difficulty: host.getDifficulty() },
      };
    }
    return { ok: true };
  }

  /**
   * Generic scope walk: find any host in the actor's container (or any
   * Containable inside that container) that composes `mixinName` and
   * accepts `direction`. No mode name appears — dispatch is by mixin
   * registry constant, per the substrate-uniform shape.
   */
  private static findEnablementHost(
    actor: Stuff & Containable,
    mixinName: string,
    direction: string,
  ): (Stuff & Enablement) | null {
    const container = actor.getContainer();
    if (!container) return null;
    const candidates: Stuff[] = [container];
    if (MixinApi.isContainer(container)) {
      for (const item of container.getContents()) candidates.push(item);
    }
    for (const c of candidates) {
      const enablement = LocomotionApi.asEnablement(c, mixinName);
      if (enablement && enablement.canEngageAxis(direction)) {
        return enablement;
      }
    }
    return null;
  }

  /**
   * Runtime-checked narrow from `Stuff` to `Stuff & Enablement`.
   * The check (`MixinApi.hasMixin(c, mixinName)`) is the runtime
   * guard; the cast is safe by construction because the only mixin
   * names passed here come from `LocomotionMode.getEnablementMixin()`
   * — a field whose values are guaranteed (by spec) to name mixins
   * that implement the `Enablement` interface (Climbable / Swimmable
   * / Flyable today; future enablement mixins must as well).
   */
  private static asEnablement(
    c: Stuff,
    mixinName: string,
  ): (Stuff & Enablement) | null {
    // The mixin name comes from LocomotionMode authoring; narrow via
    // structural cast since the registry's MixinName branding is
    // checked by setEnablementMixin validation at template-load time.
    if (!MixinApi.hasMixin(c, mixinName as never)) return null;
    return c as Stuff & Enablement;
  }

  // Passthrough conveyance check (ride / drive).
  private static checkConveyance(
    actor: Stuff,
    mode: LocomotionMode,
  ): TraversalGuard {
    const conveyance = mode.getConveyanceMixin();
    if (!conveyance) return { ok: true };
    if (!MixinApi.isSlottable(actor)) {
      return {
        ok: false,
        gate: 'noConveyance',
        mode: mode.getName(),
        reason: `You're not ${mode.getName()}ing anything.`,
      };
    }
    const occupied = SlotApi.findOccupiedSlots(actor);
    for (const [host] of occupied.entries()) {
      if (MixinApi.hasMixin(host, conveyance as never)) return { ok: true };
    }
    return {
      ok: false,
      gate: 'noConveyance',
      mode: mode.getName(),
      reason: `You're not ${mode.getName()}ing anything.`,
    };
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
    if (!mode.getPassthrough()) {
      throw new Error(
        `LocomotionApi.findConveyanceHost: '${mode.getName()}' is not a ` +
          `passthrough mode (programmatic misuse)`,
      );
    }
    if (!MixinApi.isSlottable(actor)) return null;
    const mixinName = mode.getConveyanceMixin();
    if (!mixinName) return null;
    const occupied = SlotApi.findOccupiedSlots(actor);
    for (const [host] of occupied.entries()) {
      if (MixinApi.hasMixin(host, mixinName as never)) return host;
    }
    return null;
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
    if (!MixinApi.isMobile(mover)) return null;
    const chain: Stuff[] = [];
    let cursor: Stuff = mover;
    let mode = (cursor as Stuff & Mobile).getEngagedMode();
    let guard = MAX_PASSTHROUGH_DEPTH;
    while (mode && mode.getPassthrough() && guard-- > 0) {
      chain.push(cursor);
      const host = LocomotionApi.findConveyanceHost(cursor, mode);
      if (!host || !MixinApi.isMobile(host)) return null;
      cursor = host;
      mode =
        (cursor as Stuff & Mobile).getEngagedMode() ??
        LocomotionApi.resolveHostMode(cursor as Stuff & Mobile);
    }
    if (!mode) return null;
    return {
      modeName: mode.getName(),
      noiseLevel: mode.getNoiseLevel(),
      bodyProfile: mode.getBodyProfile(),
      groundContact: mode.getGroundContact(),
      resolvedHostChain: chain,
    };
  }

  // ── eligibility queries ──────────────────────────────────────────

  /**
   * Modes whose body-plan + posture gates an actor passes right now.
   * Backs future verb-help / UI surfaces; does NOT consult exit or
   * scope (those are per-traversal concerns).
   */
  public static eligibleModes(actor: Stuff): readonly LocomotionMode[] {
    return LocomotionApi.allModes().filter((mode) =>
      LocomotionApi.canEngage(actor, mode),
    );
  }

  // ── engaged-mode introspection (untyped-safe) ────────────────────

  /**
   * Type-safe convenience for non-Mobile callers ("what mode is X
   * engaged in, if any?"). Returns `null` for non-Mobile Stuff.
   */
  public static engagedMode(actor: Stuff): LocomotionMode | null {
    if (!MixinApi.isMobile(actor)) return null;
    return actor.getEngagedMode();
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
    actor.setEngagedMode(mode);
    try {
      return await action();
    } finally {
      if (LocomotionApi.isTransientEngagement(mode, exit)) {
        actor.setEngagedMode(null);
      }
    }
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
    if (mode.getPassthrough()) return false;
    const mixinName = mode.getEnablementMixin();
    if (!mixinName) return true;
    const dest = exit.getDestination();
    if (MixinApi.hasMixin(dest, mixinName as never)) return false;
    if (MixinApi.isContainer(dest)) {
      for (const item of dest.getContents()) {
        if (MixinApi.hasMixin(item, mixinName as never)) return false;
      }
    }
    return true;
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
   * `resolveSetting('movement.defaultMode')` is deliberately NOT used —
   * its built-in schema-default fallback to `'walk'` would short-
   * circuit the bodyplan layer. `ownSetting` returns the explicit
   * override only.
   */
  public static defaultModeFor(actor: Stuff): string {
    const explicit = ownSetting<string>(actor, 'movement.defaultMode');
    if (explicit) return explicit;
    if (MixinApi.isOrganism(actor)) {
      const planDefault =
        actor.getSpecies()?.getBodyPlan()?.getDefaultLocomotionMode();
      if (planDefault) return planDefault;
    }
    return 'walk';
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
    const mode = LocomotionApi.modeOfOrThrow(
      LocomotionApi.defaultModeFor(actor),
    );
    await LocomotionApi.engageAround(actor, mode, exit, () =>
      actor.traverse(exit, mode.getName()),
    );
  }
}

SecurityApi.decorateApiClass(LocomotionApi);
