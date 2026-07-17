// LocomotionLogic — the hot-reloadable logic singleton behind
// LocomotionApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Containable } from '../../lib/spatial/Containable';
import type { Mobile } from '../../lib/spatial/Mobile';
import type Exit from '../../lib/boundary/Exit';
import type { TraversalGuard } from '../../lib/boundary/Exit';
import { LocomotionMode } from '../../lib/locomotion/LocomotionMode';
import type { Enablement } from '../../lib/locomotion/Enablement';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { SpeciesApi } from '../../api/species';
import { SlotApi } from '../../api/slot';
import type { MixinName } from '../../lib/mixin';
import { LOAD_BEARING_DEFAULTS } from '../../lib/encumbrance/LoadBearing';
import { Postures } from '../../lib/slot/Postured';
import { ShellApi } from '../../api/shell';
import type { EmissionData } from '../../api/locomotion';

/** Hard depth cap for the passthrough chain walk; matches the conveyance ripple. */
const MAX_PASSTHROUGH_DEPTH = 16;

const LocomotionApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/locomotion#LocomotionApi'),
  SecurityPolicies.SelfOnly
);

/**
 * LocomotionLogic — the hot-reloadable logic singleton behind
 * {@link LocomotionApi}.
 *
 * Holds mode resolution, eligibility predicates, enablement walks,
 * passthrough-chain resolution, emission resolution, and the
 * engageAround / isTransientEngagement framework-internal helpers.
 * Lives at `/obj/api/locomotion`; `LocomotionApi`'s statics forward
 * here via `StuffApi.singletonSync`. `dest /obj/api/locomotion` reloads
 * it (see hot-reload.md for the in-game demo).
 *
 * All inputs that reference a mode by name accept either the short
 * name (`'walk'`) or the full templatePath (`/lib/locomotion/walk`).
 * Internally the logic normalizes to the full path via the
 * module-private `toModePath` free function so the singleton-cache
 * lookup uses the canonical key.
 *
 * Gating (the guts-variant recipe): every public method carries
 * `AnyOf(FromModule('/api/locomotion#LocomotionApi'), SelfOnly)`.
 * `FromModule` admits the Api facade; `SelfOnly` admits the many
 * intra-singleton `this.x()` self-calls (the caller and target are
 * both this singleton). Stateless helpers are module-private free
 * functions — off-class, ungated, un-callable from outside, and (since
 * `#`-private instance methods don't work through the call-security
 * proxy) the only correct home for them.
 *
 * @internal
 */
@Unshadowable
export class LocomotionLogic extends ApiLogic {
  // ── mode resolution ──────────────────────────────────────────────

  // ── enablement validators ────────────────────────────────────────

  /** See {@link LocomotionApi.assertEnablementAxes}. */
  @CallSecurity(LocomotionApiCallers)
  public assertEnablementAxes(value: string[], where: string): void {
    const seen = new Set<string>();
    for (const v of value) {
      if (typeof v !== 'string' || v.length === 0) {
        throw new TypeError(`${where}: entries must be non-empty strings`);
      }
      if (seen.has(v)) {
        throw new TypeError(`${where}: duplicate entry '${v}'`);
      }
      seen.add(v);
    }
  }

  /** See {@link LocomotionApi.assertEnablementDifficulty}. */
  @CallSecurity(LocomotionApiCallers)
  public assertEnablementDifficulty(
    value: number | null,
    where: string,
  ): void {
    if (value === null) return;
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(
        `${where}: must be null or a finite positive number; got ${value}`,
      );
    }
  }

  // ── mode resolution ──────────────────────────────────────────────

  /** See {@link LocomotionApi.modeOf}. */
  @CallSecurity(LocomotionApiCallers)
  public modeOf(nameOrPath: string): LocomotionMode | null {
    const path = toModePath(nameOrPath);
    return StuffApi.findByTemplatePath<LocomotionMode>(path) ?? null;
  }

  /** See {@link LocomotionApi.modeOfOrThrow}. */
  @CallSecurity(LocomotionApiCallers)
  public modeOfOrThrow(nameOrPath: string): LocomotionMode {
    const mode = this.modeOf(nameOrPath);
    if (!mode) {
      throw new Error(
        `LocomotionMode not loaded: ${toModePath(nameOrPath)}`,
      );
    }
    return mode;
  }

  /** See {@link LocomotionApi.loadMode}. */
  @CallSecurity(LocomotionApiCallers)
  public async loadMode(nameOrPath: string): Promise<LocomotionMode> {
    const path = toModePath(nameOrPath);
    return await StuffApi.singleton<LocomotionMode>(path);
  }

  /** See {@link LocomotionApi.preloadActorAnatomy}. */
  @CallSecurity(LocomotionApiCallers)
  public async preloadActorAnatomy(actor: Stuff): Promise<void> {
    // Thin delegate — kept as a locomotion-domain entry point but the
    // anatomy-load itself lives on `SpeciesApi.preloadAnatomy` (the
    // home where species + clade + body plan are the substrate it
    // serves). Sense / ESP validators call `SpeciesApi.preloadAnatomy`
    // directly; locomotion verbs still go through here so the
    // `loadMode` / `preloadActorAnatomy` pairing at locomotion entry
    // points reads cleanly.
    await SpeciesApi.preloadAnatomy(actor);
  }

  /** See {@link LocomotionApi.allModes}. */
  @CallSecurity(LocomotionApiCallers)
  public allModes(): readonly LocomotionMode[] {
    const out: LocomotionMode[] = [];
    for (const obj of StuffApi.getAllObjects()) {
      if (obj instanceof LocomotionMode) out.push(obj);
    }
    return out;
  }

  /** See {@link LocomotionApi.resolveHostMode}. */
  @CallSecurity(LocomotionApiCallers)
  public resolveHostMode(host: Stuff & Mobile): LocomotionMode {
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
    return this.modeOfOrThrow('walk');
  }

  // ── eligibility predicates ───────────────────────────────────────

  /** See {@link LocomotionApi.bodyPlanAllows}. */
  @CallSecurity(LocomotionApiCallers)
  public bodyPlanAllows(actor: Stuff, mode: LocomotionMode): boolean {
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

  /** See {@link LocomotionApi.postureAllows}. */
  @CallSecurity(LocomotionApiCallers)
  public postureAllows(actor: Stuff, mode: LocomotionMode): boolean {
    const required = mode.getRequiresPosture();
    if (required.length === 0) return true;
    const posture = MixinApi.isPosed(actor)
      ? actor.getPosture()
      : Postures.Stand;
    return required.includes(posture);
  }

  /** See {@link LocomotionApi.exitAllowsMode}. */
  @CallSecurity(LocomotionApiCallers)
  public exitAllowsMode(exit: Exit, mode: LocomotionMode): boolean {
    return exit.allowsMode(mode.getName());
  }

  /** See {@link LocomotionApi.canEngage}. */
  @CallSecurity(LocomotionApiCallers)
  public canEngage(actor: Stuff, mode: LocomotionMode): boolean {
    return (
      this.bodyPlanAllows(actor, mode) && this.postureAllows(actor, mode)
    );
  }

  /** See {@link LocomotionApi.canTraverseExit}. */
  @CallSecurity(LocomotionApiCallers)
  public canTraverseExit(
    actor: Stuff & Containable,
    exit: Exit,
    mode: LocomotionMode,
    direction: string,
  ): TraversalGuard {
    if (!this.bodyPlanAllows(actor, mode)) {
      return {
        ok: false,
        gate: 'bodyPlan',
        mode: mode.getName(),
        reason: `Your body can't ${mode.getName()}.`,
      };
    }
    if (!this.postureAllows(actor, mode)) {
      return {
        ok: false,
        gate: 'posture',
        mode: mode.getName(),
        reason: `You can't ${mode.getName()} from this posture.`,
      };
    }
    const exitGuard = exit.canTraverse(actor, mode.getName());
    if (!exitGuard.ok) return exitGuard;
    const enablement = this.checkEnablement(actor, mode, direction);
    if (!enablement.ok) return enablement;
    return this.checkHaulage(actor, exit, mode);
  }

  /**
   * Haulage gate — refuses a move when the traverser's hitched cart can't
   * follow. The hauler is the **actual traverser** (`actor`): a person
   * pulling a handcart, or — for a ridden move — the conveyance host (the
   * horse) whose own traverse is gated with its own mode (passthrough
   * modes never reach here; `exit.canTraverse` rejects ride/drive at the
   * media gate first, so the gate that fires for a ridden move is the
   * host's self-powered traverse, where the host IS the actor). Two
   * sub-gates:
   *   - **terrain** — the cart's passage mode (`wheeled`) must be admitted
   *     by the exit's `media`, AND the exit must be wheel-passable (the
   *     stairs residue). The ladder / ford / air case is refused for free
   *     by `exitAllowsMode` (wheeled's medium is `ground`).
   *   - **breakaway** — the cart's draft load must not exceed the hauler's
   *     strain ceiling ("the cart won't budge"). Exhaustion shaves the
   *     ceiling (via the endurance margin), so a tiring hauler can hit it.
   * This is the veto layer explicitly allowed to read encumbrance; the raw
   * move (`Mobile.traverse`) stays encumbrance-free.
   */
  private checkHaulage(
    actor: Stuff & Containable,
    exit: Exit,
    mode: LocomotionMode,
  ): TraversalGuard {
    if (!MixinApi.isHauling(actor) || !actor.isHitched()) {
      return { ok: true };
    }
    const hauledCart = actor.getHauledCart();
    if (!hauledCart) return { ok: true };

    const passage = hauledCart.getPassageMode();
    const passable =
      passage !== null && this.exitAllowsMode(exit, passage);
    if (!passable || !exit.isWheelPassable()) {
      return {
        ok: false,
        gate: 'terrain',
        mode: mode.getName(),
        reason: `You can't drag the cart that way.`,
      };
    }

    if (MixinApi.isLoadBearing(actor)) {
      const draft = hauledCart.getDraftLoad().rawValue();
      const ceiling = actor.getStrainCeiling().rawValue();
      if (draft > ceiling) {
        return {
          ok: false,
          gate: 'breakaway',
          mode: mode.getName(),
          reason: `The cart won't budge.`,
        };
      }
    }
    return { ok: true };
  }

  // ── enablement walk ──────────────────────────────────────────────

  /** See {@link LocomotionApi.checkEnablement}. */
  @CallSecurity(LocomotionApiCallers)
  public checkEnablement(
    actor: Stuff & Containable,
    mode: LocomotionMode,
    direction: string,
  ): TraversalGuard {
    if (mode.getPassthrough()) {
      return checkConveyance(actor, mode);
    }
    const mixinName = mode.getEnablementMixin();
    if (!mixinName) return { ok: true };
    return checkEnablementScope(actor, mode, direction, mixinName);
  }

  // ── passthrough chain ────────────────────────────────────────────

  /** See {@link LocomotionApi.findConveyanceHost}. */
  @CallSecurity(LocomotionApiCallers)
  public findConveyanceHost(
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
      if (MixinApi.hasMixin(host, mixinName as MixinName)) return host;
    }
    return null;
  }

  /** See {@link LocomotionApi.emissionAt}. */
  @CallSecurity(LocomotionApiCallers)
  public emissionAt(mover: Stuff): EmissionData | null {
    if (!MixinApi.isMobile(mover)) return null;
    const chain: Stuff[] = [];
    let cursor: Stuff & Mobile = mover;
    let mode = cursor.getEngagedMode();
    let guard = MAX_PASSTHROUGH_DEPTH;
    while (mode && mode.getPassthrough() && guard-- > 0) {
      chain.push(cursor);
      const host = this.findConveyanceHost(cursor, mode);
      if (!host || !MixinApi.isMobile(host)) return null;
      cursor = host;
      mode = cursor.getEngagedMode() ?? this.resolveHostMode(cursor);
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

  /** See {@link LocomotionApi.eligibleModes}. */
  @CallSecurity(LocomotionApiCallers)
  public eligibleModes(actor: Stuff): readonly LocomotionMode[] {
    return this.allModes().filter((mode) => this.canEngage(actor, mode));
  }

  // ── engaged-mode introspection (untyped-safe) ────────────────────

  /** See {@link LocomotionApi.engagedMode}. */
  @CallSecurity(LocomotionApiCallers)
  public engagedMode(actor: Stuff): LocomotionMode | null {
    if (!MixinApi.isMobile(actor)) return null;
    return actor.getEngagedMode();
  }

  // ── engagement lifecycle ─────────────────────────────────────────

  /** See {@link LocomotionApi.engageAround}. */
  @CallSecurity(LocomotionApiCallers)
  public async engageAround<T>(
    actor: Stuff & Mobile,
    mode: LocomotionMode,
    exit: Exit,
    action: () => Promise<T>,
  ): Promise<T> {
    actor.setEngagedMode(mode);
    try {
      const result = await action();
      // Loaded-traversal endurance drain — fires only after a *successful*
      // self-powered traverse (a throw skips this and falls to `finally`).
      // This is the universal self-powered chokepoint: every player
      // command, NPC brain, and follow/lead automation routes a self-
      // powered move through here, so a loaded body tires whatever
      // initiated the step. Conveyance riders (repositioned by the
      // vehicle's ripple) and raw/dev/`forceMove` traverses don't reach
      // `engageAround`, so they never drain — the walked-vs-rode exclusion
      // is structural, not a coded check. Light loads cost nothing
      // (guarded inside `drainForTraversal`).
      if (MixinApi.isLoadBearing(actor)) {
        actor.drainForTraversal();
      }
      // Wound limp — a severity-gated endurance drain from a locomotor
      // laceration/avulsion, composed at the same universal self-powered
      // chokepoint (conveyance riders + raw/forceMove skip it structurally,
      // exactly as with the encumbrance drain). Cheap sync narrowed read;
      // a no-op for an unwounded / non-Vitals actor.
      if (MixinApi.isVitals(actor)) {
        actor.drainForLimp();
      }
      return result;
    } finally {
      if (this.isTransientEngagement(mode, exit)) {
        actor.setEngagedMode(null);
      }
    }
  }

  /** See {@link LocomotionApi.isTransientEngagement}. */
  @CallSecurity(LocomotionApiCallers)
  public isTransientEngagement(mode: LocomotionMode, exit: Exit): boolean {
    if (mode.getPassthrough()) return false;
    const mixinName = mode.getEnablementMixin();
    if (!mixinName) return true;
    const dest = exit.getDestination();
    if (MixinApi.hasMixin(dest, mixinName as MixinName)) return false;
    if (MixinApi.isContainer(dest)) {
      for (const item of dest.getContents()) {
        if (MixinApi.hasMixin(item, mixinName as MixinName)) return false;
      }
    }
    return true;
  }

  // ── default-mode resolution ──────────────────────────────────────

  /** See {@link LocomotionApi.defaultModeFor}. */
  @CallSecurity(LocomotionApiCallers)
  public defaultModeFor(actor: Stuff): string {
    // The care↔speed pace (Phase 5) rides this same setting: a player sets
    // `movement.defaultMode sneak`/`run` for a standing pace, exactly as
    // they'd default to any locomotion mode. No separate `movement.pace`
    // knob — it was redundant with this one.
    const explicit = ShellApi.ownSetting<string>(actor, 'movement.defaultMode');
    if (explicit) return explicit;
    if (MixinApi.isOrganism(actor)) {
      const planDefault =
        actor.getSpecies()?.getBodyPlan()?.getDefaultLocomotionMode();
      if (planDefault) return planDefault;
    }
    return 'walk';
  }

  // ── default-mode convenience ─────────────────────────────────────

  /** See {@link LocomotionApi.traverseWithDefault}. */
  @CallSecurity(LocomotionApiCallers)
  public async traverseWithDefault(
    actor: Stuff & Mobile & Containable,
    exit: Exit,
  ): Promise<void> {
    // Lazy-load the actor's anatomy (species + bodyplan) and the
    // locomotion mode singleton before the sync eligibility cascade
    // runs. Both `getBodyPlan()` and `modeOf` are sync registry
    // lookups; on a fresh server the first `go` would otherwise
    // fail at the body-plan gate (null bodyplan ⇒ empty planModes)
    // or at the mode resolution (LocomotionMode not loaded).
    await this.preloadActorAnatomy(actor);
    const mode = await this.loadMode(this.defaultModeFor(actor));
    await this.engageAround(actor, mode, exit, () =>
      actor.traverse(exit, mode.getName()),
    );
  }
}

// ── module-private helpers (stateless; off-class so un-callable from
//    outside the module — see the class docstring) ─────────────────

/** Short name → full path; full path passes through. */
function toModePath(nameOrPath: string): string {
  if (nameOrPath.startsWith('/')) return nameOrPath;
  return `/lib/locomotion/${nameOrPath}`;
}

function checkEnablementScope(
  actor: Stuff & Containable,
  mode: LocomotionMode,
  direction: string,
  mixinName: string,
): TraversalGuard {
  const host = findEnablementHost(actor, mixinName, direction);
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
  // Load-aware veto — an overloaded body can't engage climb/swim/fly
  // (the modes with an `enablementMixin`, the only ones this scope
  // runs for; walk has no enablement mixin so it is never gated). This
  // is *alongside* the capability check (placed after it so a too-hard
  // host still reports the difficulty reason first if both fail), and
  // lives at this LocomotionApi layer rather than `Mobile.traverse` —
  // a raw/dev traverse skips the veto entirely (the agnostic-substrate
  // guarantee). Open seam: relocate to `ExitableMixin`/boundary if
  // desired — the predicate moves unchanged.
  if (
    MixinApi.isLoadBearing(actor) &&
    actor.getLoadRatio() >= LOAD_BEARING_DEFAULTS.HEAVY_LOAD_THRESHOLD
  ) {
    return {
      ok: false,
      gate: 'encumbrance',
      mode: mode.getName(),
      reason: `You're carrying too much to ${mode.getName()}.`,
      context: { loadRatio: actor.getLoadRatio() },
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
function findEnablementHost(
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
    const enablement = asEnablement(c, mixinName);
    if (enablement && enablement.canEngageAxis(direction)) {
      return enablement;
    }
  }
  return null;
}

/**
 * Runtime-checked narrow from `Stuff` to `Stuff & Enablement`.
 * The runtime check is `MixinApi.hasMixin(c, mixinName)`; the cast
 * is safe by construction because the only mixin names passed here
 * come from `LocomotionMode.getEnablementMixin()` — a field whose
 * values are guaranteed (by spec) to name mixins that implement the
 * `Enablement` interface (Climbable / Swimmable / Flyable today;
 * future enablement mixins must as well).
 *
 * Cast on `mixinName`: the stored value is plain `string`, but
 * `MixinName` is a union of registry-branded literals. Casting to
 * the union is the conventional way to bridge that gap; the runtime
 * check still rejects strings that don't name a real mixin.
 */
function asEnablement(
  c: Stuff,
  mixinName: string,
): (Stuff & Enablement) | null {
  if (!MixinApi.hasMixin(c, mixinName as MixinName)) return null;
  return c as Stuff & Enablement;
}

// Passthrough conveyance check (ride / drive).
function checkConveyance(actor: Stuff, mode: LocomotionMode): TraversalGuard {
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
    if (MixinApi.hasMixin(host, conveyance as MixinName)) return { ok: true };
  }
  return {
    ok: false,
    gate: 'noConveyance',
    mode: mode.getName(),
    reason: `You're not ${mode.getName()}ing anything.`,
  };
}
