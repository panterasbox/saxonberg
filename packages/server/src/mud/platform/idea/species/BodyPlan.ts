/**
 * BodyPlan — anatomical layout shared across species.
 *
 * A `BodyPlan` declares the physical anatomy: equipment / mount / hold
 * slots (`slots: SlotSpec[]`), locomotion modes, and sensory port
 * positions. **Anatomy only** — capability (vision range, hearing
 * acuity, etc.) lives on the Species, not here. So humans, dwarves,
 * elves, and orcs all share the canonical `biped` body plan even
 * though their visual profiles differ.
 *
 * Body plans are standalone `Idea`-shaped templates referenced by
 * Species via `_bodyPlanPath` (the locked cross-reference shape — path
 * string, lazy resolution, no instance cache). v1 ships three:
 * `biped`, `quadruped`, `sessile`. New body plans land when a genuinely
 * novel topology arrives (centaur, octopod humanoid).
 *
 * `sessile` is the stand-in for organisms with no agency anatomy — a
 * plant, a coral. Empty slots, zero locomotion modes, zero sensory
 * ports. Default plants reference it so code reading `species.bodyPlan`
 * never null-checks.
 *
 * **Slot vocabulary** is unified — a single `slots: SlotSpec[]`
 * supersedes the older `wornSlots` / `heldSlots` split. Each spec's
 * `accepts` declares the mixin its occupant must compose
 * (`'WearableMixin'`, `'WieldableMixin'`, `'SlottableMixin'`); slot
 * routing flows from there. See `lib/slot/Slotted.ts` for the SlotSpec
 * shape.
 */

import { Idea } from '../../../lib/stuff/Idea';
import { SingletonMixin } from '../../../lib/stuff/Singleton';
import type { SlotSpec } from '../../../lib/slot/Slotted';
// ⚠ VALUE imports of two `as const` tuples — no class, no cycle. `BodyPlan`
// stays free of `lib/vitals` CLASS imports (the `governs` comment's rule);
// validating a key against a closed vocabulary needs the vocabulary.
import { VITAL_SIGNS } from '../../../lib/vitals/Vitals';
import { BODY_CAPACITIES } from '../../../lib/vitals/BodyCapacity';

/**
 * What a part may legitimately claim to `governs`. A lung runs a RATE
 * (`respiratoryRate`) and a CAPACITY (`respiration`), and both are honest,
 * so the vocabulary is the union. A module-scope `const` over two frozen
 * tuples — a declaration, not initialization.
 */
const GOVERNABLE: ReadonlySet<string> = new Set<string>([
  ...VITAL_SIGNS,
  ...BODY_CAPACITIES,
]);
import type { SenseChannel } from '../../../lib/description/Perceiver';
import type { FieldMeta } from '../../../lib/mixin';

/**
 * Anatomy descriptor for a sensory apparatus. Capability (range,
 * acuity) does NOT belong here — that's species-side. Decomposes as
 * three flat scalars under default hydration; if it grows nested
 * fields a `SensoryPortMarshaller` handles serialization.
 */
export interface SensoryPort {
  /**
   * Sense-channel vocabulary — one of the five physical channels
   * declared by `SenseChannel`. The eyes-modality entry uses
   * `'vision'` (the channel/process word), not the legacy organ
   * word `'sight'`; the substrate's vocabulary is unified across
   * BodyPlan / Detail / `<sense>` MML / SenseChannel TS type.
   */
  modality: SenseChannel;
  /** How many of this port the body plan declares. */
  count: number;
  /** `'frontal'`, `'lateral'`, `'dorsal'`, `'forward'`, `'circumferential'`. */
  position: string;
}

/**
 * Named tissue + the **share of the whole body's mass** this tissue of
 * this part carries. The per-part substrate butchery reads (which muscle,
 * and how much of the animal it is) and a future physical-attribute
 * reading aggregates.
 *
 * ⭐⭐⭐ **A SHARE, not kilograms, and the reason is that one plan serves
 * every size of animal.** `quadruped` is named by sheep, cattle, dogs,
 * cats and horses; `avian` by a canary and a hen. Absolute masses made
 * that a lie — a bullock claimed the same 28 kg torso as a ewe, and
 * `avian`'s canary-sized 4 g of torso bone is why nothing else could
 * reuse it. A share is scale-free: part mass is `share × the
 * instance's own mass`, so the same topology serves a 20 g canary and a
 * 700 kg ox and neither figure is authored twice.
 *
 * ⚠ **Whole-body mass is NOT affected by this**, and that is deliberate:
 * `Creature.bodyMassIndex()` is `getMass() / stature²` and `getMass()` is
 * the species frame plus the flesh/lean reserve deltas. Fitness and BMI
 * never read part masses, so the share model cannot disturb them.
 *
 * **The invariant:** the shares of every tissue of every part sum to
 * **1** across a plan. Enforced on shipped rows by `lint:anatomy`
 * clause (a); the setter checks only the per-field range, because test
 * fixtures author one-part bodies on purpose and the resolver
 * normalises.
 */
export interface TissueComposition {
  /** Material templatePath, e.g. `/stuff/idea/material/tissue/muscle`. */
  tissuePath: string;
  /**
   * Share of the whole body's mass, in `(0, 1]`. Plain number, no
   * `Quantity` — it is dimensionless, and the descriptor stays flat.
   */
  share: number;
}

/**
 * Typed anatomical part descriptor — the model layer, declared ONCE on
 * the shared BodyPlan flyweight (not per-instance). Instances carry only
 * deltas (`VitalsMixin.bodyPartDeltas`); the anatomy resolver merges
 * instance-delta → BodyPlan-structure (the `getMaterial` / `getSpecies`
 * resolution shape).
 *
 * Stable dotted `body.*` keys are the identity anchor everything
 * downstream points at: trauma `site`, the slot/vital couplings, and
 * (deferred-with-seam) the innervation / vascular graph and
 * part-as-Stuff promotion.
 */
export interface BodyPart {
  /** Canonical dotted path, e.g. `'body.arm.left.hand'`. */
  key: string;
  /** Tree edge to the parent part, or `null` for the root. */
  parent: string | null;
  /** Named tissues + masses — NOT a single default material. */
  tissues: TissueComposition[];
  /**
   * ⭐⭐ **What this part is FOR** — the keys of the things it governs.
   * Vital-sign keys today (`heartRate`, `respiratoryRate`); capacity keys
   * later, which is physiology's axis. Typed `string[]` here deliberately
   * to keep `BodyPlan` free of any import from `lib/vitals`.
   *
   * ⚠ Was `governsVital?: string` — singular, and named for the only
   * thing it could point at. **Every read of it is an organ-exclusion
   * filter**: the surface-fraction walk and the four `Attired` walks all
   * ask "is this part internal?", none reads the value. Naming a field
   * for its first consumer is what blocks the second one, and physiology
   * needs a lung to govern a capacity as well as a rate — so this is the
   * rename that unblocks it, with the semantics untouched: a part with a
   * non-empty `governs` is internal.
   */
  governs?: string[];
  /**
   * ⭐⭐ **What this part is FOR** — the exterior twin of `governs`.
   *
   * `governs` says *this organ RUNS the thing* (one brain, and
   * consciousness goes with it). `serves` says *this limb is FOR the
   * thing* (two legs, and losing one is a hobble rather than a halt). The
   * distinction is not cosmetic: `governs` combines by **min** and
   * `serves` by **mean**, which is the whole difference between an organ
   * and a limb.
   *
   * ⚠⚠ **And it is the reason both fields exist.** Interiority is
   * `governs`-derived — a part that runs something is inside you — so
   * saying a leg `governs: [locomotion]` would make the leg an internal
   * organ, silently excluded from every covering, insulation and
   * concealment walk. A hand has to be able to be *for* manipulation
   * without being *inside* you.
   *
   * Values are validated against `BODY_CAPACITIES` at registration.
   */
  serves?: string[];
  /**
   * Can detach. ⭐ Read by `AVULSION_BEHAVIOR.onset` — an avulsion past
   * `HARM_DEFAULTS.SEVER_SEVERITY` on a severable part takes it off. A
   * torso avulsion is a terrible wound and stays a wound.
   */
  severable?: boolean;
  /**
   * ⭐ **The nerve supply** — which part(s) this one's control runs
   * through. Orthogonal to the containment tree: an arm hangs off the
   * torso structurally but is innervated by the upper spine, and cutting
   * the spine takes the arm without touching it.
   *
   * Authored **only where it diverges from the tree** — for limbs the
   * parent chain already IS the supply path, so an unauthored part simply
   * inherits the honest default. Naming a part here also makes that part
   * INTERIOR (a conduit is inside you), which is how the spine — which
   * governs nothing and conducts everything — earns its interiority
   * without a field nobody else needs.
   */
  innervatedBy?: string[];
  /** The blood supply — the same relation, the other conduit. */
  suppliedBy?: string[];
}

// ⭐⭐ **NOT `PropertiedMixin`, and it was here until the base-class
// narrowing (2026-09-30).** `Propertied` is a per-INSTANCE bag of
// runtime state — a quest flag, a buff, a circle membership — and this
// class is a `Singleton`: one instance for the whole world, shared by
// every holder of the thing it describes. A prop set on `oak` would be
// a prop on every oak there has ever been, which is not a per-instance
// store; it is a global with extra steps.
//
// ⭐ The tell was already written down. `race.md:280-290` records that
// it was composed for *"per-material damage resistance as
// content-defined prop keys … accessors removed until combat lands"* —
// and when combat landed, materials-response shipped resistance as
// FIRST-CLASS FIELDS instead. The mixin outlived the design that asked
// for it by two builds.
//
// ⚠ Verified empty, not merely unauthored: every `setProp` / `getProp`
// / `initProp` / `maskProp` receiver in the tree is a person
// (`BankingLogic`), an actor (`Climbable`/`Flyable`/`Swimmable`), a
// slot occupant (`Drivable`) or `EventRegistry` itself. None is a
// reference singleton.
export default class BodyPlan extends SingletonMixin(Idea) {
  /** Display name (e.g. `'biped'`, `'quadruped'`). */
  protected name: string = '';

  /**
   * Unified slot universe for this body plan. Each spec carries the
   * canonical slot name (e.g. `'hand:left'`, `'back:1'`), the mixin
   * an occupant must compose, optional capacity, optional posture
   * decoration, and optional user-facing detail keyword. See
   * `lib/slot/Slotted.ts` for the SlotSpec shape.
   *
   * Replaces the older `wornSlots: string[]` + `heldSlots: string[]`
   * pair (deleted outright per the no-shim policy). Migration script:
   * `packages/server/scripts/migrate-bodyplan-slots.ts`.
   */
  public slots: SlotSpec[] = [];

  /**
   * Derived, transient — the parts something else's `innervatedBy` /
   * `suppliedBy` names. Rebuilt by `setBodyParts`; never persisted (it is
   * a projection of the part list, and a second copy would drift).
   */
  private conduitKeys: Set<string> = new Set();

  /**
   * Locomotion modes the body plan supports: `['walk']`,
   * `['walk', 'fly']`, `[]` for sessile. Drives the
   * `Climbable`/`Swimmable`/`Flyable` traversal selection in Mobile.
   */
  protected locomotionModes: string[] = [];

  /**
   * Preferred default mode for organisms of this body plan, used by
   * `LocomotionApi.defaultModeFor` when an actor has no explicit
   * `movement.defaultMode` setting (NPCs without `EnvironmentMixin`,
   * players who haven't customized the setting). `null` for sessile
   * body plans (they have no locomotion at all). Resolution chain:
   * actor's explicit setting → bodyplan default → universe `'walk'`.
   *
   * Authoring should pick from `locomotionModes` — substrate doesn't
   * cross-check, but a default-mode not in the body plan's modes will
   * fail the body-plan gate at traversal time.
   */
  protected defaultLocomotionMode: string | null = null;

  /**
   * Sensory port anatomy. Position, count, modality only — capability
   * is species-side.
   */
  protected sensoryPorts: SensoryPort[] = [];

  /**
   * Typed anatomical structure — the body's parts as a tree, shared
   * across every organism of this body plan. Parallel to `slots`.
   * Instances carry only deltas; see {@link BodyPart}.
   */
  public bodyParts: BodyPart[] = [];

  /**
   * Default whole-body mass in kg (plain number, keeping `BodyPlan` a
   * flat authoring flyweight free of any `Quantity` / `lib/material`
   * import).
   *
   * ⭐⭐ **This is the ONE absolute mass on the plan, and it is what makes
   * the tissue shares work.** A tissue states a share of the body
   * (`TissueComposition.share`); this states what a body of this plan
   * weighs by default, which a species' `massAt` or an instance's own
   * mass then overrides. Part mass is the product of the two, so the
   * topology is reusable and the scale is the animal's own. ⚠ It used to
   * be documented as *"mirroring `TissueComposition.mass`"*, which is
   * exactly backwards now: the shares mirror nothing, they divide this. A
   * `Creature` of this plan seeds its `getMass()` from this default
   * unless the instance authors its own mass deviation (see
   * `Creature.getMass`). `0` means "no body-grounded default" (the
   * sessile plan, a test stub) — readers fall back gracefully.
   *
   * **Shared body-size signal, not capacity-private.** Encumbrance
   * reads it for carry capacity; the metabolism build reads it for
   * basal drain (Kleiber `mass^0.75`) and thermal for thermal mass —
   * so author it as a general body property and expect sibling body
   * fields (e.g. `thermalStrategy`) here later.
   */
  protected baseMass: number = 0;

  /**
   * Reference **stature** in metres for a typical adult of this plan —
   * the linear scale beside {@link baseMass}'s bulk. `0` means "no
   * body-grounded default" (the sessile plan, a test stub); readers
   * fall back gracefully.
   *
   * ⭐ Deliberately a SCALAR, not two axes. Lineage's body budget
   * already owns *build* via the fat/muscle/bone split at one mass, so
   * a second build axis here would duplicate it. What stature buys is
   * the other half of a fit measurement: with mass it yields a ponderal
   * index (`√(mass / stature)`), and those two numbers are what a
   * garment is cut to.
   *
   * Species override it (`Species.stature`); an individual's variance
   * arrives later through `Creature.getMass()` alone, which is why this
   * is the plan's default rather than anyone's actual height.
   */
  protected baseStature: number = 0;

  /**
   * Thermoregulatory strategy. `endotherm` (the default) defends a
   * setpoint by spending metabolism's reserves (the mammal/bird path);
   * `ectotherm` lets its core float to the effective ambient (the
   * reptile/amphibian path — cold → torpor, hot → critical-thermal-max
   * death). Read by the Phase-2 `ThermalRegulationMixin` strategy branch
   * and by metabolism's Q10 `thermalMultiplier`. A robot / construct /
   * unset body is a passive drifter regardless.
   */
  protected thermalStrategy: 'endotherm' | 'ectotherm' = 'endotherm';

  /**
   * The atmosphere tags this body plan exchanges gas in — the
   * respiration driver's medium-trigger determinant. Default
   * `['air']` (the air-breathing biped); a species **inverts** by
   * authoring `['water']` (a fish drowns in air, breathes water).
   * Sibling of {@link locomotionModes}. An empty array is the
   * crisis-everywhere trap, NOT an opt-out — {@link respires} is the
   * opt-out. Read via `getBreathableMedia()`; the engine resolves the
   * surrounding medium against this set.
   */
  protected breathableMedia: string[] = ['air'];

  /**
   * Whether a body of this plan respires at all — the respiration
   * opt-out. Default `true` (a body breathes unless authored
   * otherwise). A `respires: false` plan (construct, undead, a corpse
   * archetype) makes the respiration engine never engage a drain: no
   * medium ever threatens it. Boolean noun-form field per the project
   * rule (`isRespiring()` predicate getter, `setRespires()` setter).
   */
  protected respires: boolean = true;

  static fieldMeta: FieldMeta = {
    name: { persistent: true },
    slots: { persistent: true },
    locomotionModes: { persistent: true },
    defaultLocomotionMode: { persistent: true },
    sensoryPorts: { persistent: true },
    bodyParts: { persistent: true },
    baseMass: { persistent: true },
    baseStature: { persistent: true },
    thermalStrategy: { persistent: true },
    breathableMedia: { persistent: true },
    respires: { persistent: true },
  };

  public getName(): string { return this.name; }
  public setName(value: string): void { this.name = value; }

  public getThermalStrategy(): 'endotherm' | 'ectotherm' {
    return this.thermalStrategy;
  }
  public setThermalStrategy(value: 'endotherm' | 'ectotherm'): void {
    if (value !== 'endotherm' && value !== 'ectotherm') {
      throw new RangeError(
        `BodyPlan.setThermalStrategy: expected 'endotherm' | 'ectotherm', ` +
          `got ${String(value)}`,
      );
    }
    this.thermalStrategy = value;
  }

  public getBaseMass(): number { return this.baseMass; }
  public setBaseMass(value: number): void {
    // Per-field invariant on the setter (the project rule): the
    // applier's Phase-1 `setBaseMass` dispatch is the validation point.
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new RangeError(
        `BodyPlan.setBaseMass: must be a finite, non-negative number, ` +
          `got ${value}`,
      );
    }
    this.baseMass = value;
  }

  public getBaseStature(): number { return this.baseStature; }
  public setBaseStature(value: number): void {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new RangeError(
        `BodyPlan.setBaseStature: must be a finite, non-negative number, ` +
          `got ${value}`,
      );
    }
    this.baseStature = value;
  }

  public getSlots(): readonly SlotSpec[] { return this.slots; }
  public setSlots(value: SlotSpec[]): void {
    // Per-field invariant: each spec must carry name + accepts. The
    // `accepts` mixin-name validation against the Mixins registry lives
    // on `SlottedMixin.setStaticSlots` — when a Slotted host pulls
    // these specs through `BodyPlanSlotsMixin`, the host's own
    // canOccupy / occupy machinery surfaces typos at use time. We
    // do the cheap shape check here.
    for (const spec of value) {
      if (!spec.name || typeof spec.name !== 'string') {
        throw new Error(
          `BodyPlan.setSlots: spec missing 'name' (${JSON.stringify(spec)})`
        );
      }
      if (!spec.accepts || typeof spec.accepts !== 'string') {
        throw new Error(
          `BodyPlan.setSlots: spec '${spec.name}' missing 'accepts'`
        );
      }
    }
    // Referential integrity: any anatomical reference (bodyPart / covers)
    // must name a real part. Checked against whichever set is already
    // populated, so it fires regardless of hydration order.
    this.validateSlotPartRefs(value, this.bodyParts);
    this.slots = value;
  }

  public getLocomotionModes(): readonly string[] { return this.locomotionModes; }
  public setLocomotionModes(value: string[]): void {
    this.locomotionModes = value;
  }

  public getBreathableMedia(): readonly string[] {
    return this.breathableMedia;
  }
  public setBreathableMedia(value: string[]): void {
    // Per-field invariant (the project rule): non-empty strings, no
    // duplicates — the `assertUniqueNonEmpty` shape from LocomotionMode.
    // (An EMPTY array is permitted and meaningful: a body that breathes
    // *nothing*. The opt-out is `respires: false`, not `[]`.)
    const seen = new Set<string>();
    for (const v of value) {
      if (typeof v !== 'string' || v.length === 0) {
        throw new TypeError(
          'BodyPlan.setBreathableMedia: entries must be non-empty strings',
        );
      }
      if (seen.has(v)) {
        throw new TypeError(
          `BodyPlan.setBreathableMedia: duplicate entry '${v}'`,
        );
      }
      seen.add(v);
    }
    this.breathableMedia = value;
  }

  public isRespiring(): boolean { return this.respires; }
  public setRespires(value: boolean): void {
    if (typeof value !== 'boolean') {
      throw new TypeError(
        `BodyPlan.setRespires: must be a boolean, got ${typeof value}`,
      );
    }
    this.respires = value;
  }

  public getDefaultLocomotionMode(): string | null {
    return this.defaultLocomotionMode;
  }
  public setDefaultLocomotionMode(value: string | null): void {
    if (value !== null) {
      if (typeof value !== 'string' || value.length === 0) {
        throw new TypeError(
          'BodyPlan.setDefaultLocomotionMode: must be null or a non-empty string',
        );
      }
    }
    this.defaultLocomotionMode = value;
  }

  public getSensoryPorts(): readonly SensoryPort[] { return this.sensoryPorts; }
  public setSensoryPorts(value: SensoryPort[]): void {
    this.sensoryPorts = value;
  }

  public getBodyParts(): readonly BodyPart[] { return this.bodyParts; }
  public setBodyParts(value: BodyPart[]): void {
    const keys = new Set<string>();
    for (const part of value) {
      if (!part.key || typeof part.key !== 'string') {
        throw new Error(
          `BodyPlan.setBodyParts: part missing 'key' (${JSON.stringify(part)})`,
        );
      }
      if (keys.has(part.key)) {
        throw new Error(`BodyPlan.setBodyParts: duplicate key '${part.key}'`);
      }
      keys.add(part.key);
      if (!Array.isArray(part.tissues)) {
        throw new Error(
          `BodyPlan.setBodyParts: part '${part.key}' missing 'tissues' array`,
        );
      }
      // ⭐⭐ **A tissue states a SHARE of the body, and a `mass` key is
      // refused BY NAME.** Same reasoning as the `governs` typo below: a
      // row still authoring kilograms would otherwise be read as a share
      // of 6 or 12 — silently enormous — and a plan that looked authored
      // would be wrong everywhere it was read. Naming the dead key in the
      // error is what turns a mystifying range failure into a one-line
      // fix.
      for (const tissue of part.tissues) {
        if ('mass' in (tissue as object)) {
          throw new Error(
            `BodyPlan.setBodyParts: part '${part.key}' tissue ` +
              `'${tissue.tissuePath}' authors 'mass' — tissues state a ` +
              `'share' of the whole body's mass now (0,1]; absolute ` +
              `kilograms cannot serve one plan across species sizes`,
          );
        }
        if (!Number.isFinite(tissue.share) || tissue.share <= 0 || tissue.share > 1) {
          throw new Error(
            `BodyPlan.setBodyParts: part '${part.key}' tissue ` +
              `'${tissue.tissuePath}' share '${tissue.share}' is not a ` +
              `finite number in (0, 1]`,
          );
        }
      }
      // ⭐⭐ **A typo in `governs` is a throw at registration, not an inert
      // organ.** Before this, `governs: [hartRate]` produced a part that
      // ran nothing, looked authored, and failed silently forever — the
      // closed-and-silent class this repo keeps paying for. The vocabulary
      // is `VITAL_SIGNS ∪ BODY_CAPACITIES`: a lung governs a rate AND a
      // capacity, and both are legitimate.
      for (const key of part.governs ?? []) {
        if (!GOVERNABLE.has(key)) {
          throw new Error(
            `BodyPlan.setBodyParts: part '${part.key}' governs unknown ` +
              `key '${key}' — expected a vital sign or a body capacity`,
          );
        }
      }
      for (const key of part.serves ?? []) {
        if (!(BODY_CAPACITIES as readonly string[]).includes(key)) {
          throw new Error(
            `BodyPlan.setBodyParts: part '${part.key}' serves unknown ` +
              `capacity '${key}'`,
          );
        }
      }
    }
    // Parent edges must reference a known key (or null/undefined for a root).
    for (const part of value) {
      if (
        part.parent !== null &&
        part.parent !== undefined &&
        !keys.has(part.parent)
      ) {
        throw new Error(
          `BodyPlan.setBodyParts: part '${part.key}' parent ` +
            `'${part.parent}' is not a known part`,
        );
      }
    }
    // Re-validate the slot→part references against the new part set (the
    // other half of the order-independent integrity check in setSlots).
    this.validateSlotPartRefs(this.slots, value);
    this.bodyParts = value;
    this.rebuildConduits(value);
  }

  /**
   * The set of parts some other part's control or supply runs THROUGH —
   * recomputed whenever the part list changes (a lifecycle, never module
   * scope). Half of the interiority predicate; see {@link isInterior}.
   */
  private rebuildConduits(parts: readonly BodyPart[]): void {
    const conduits = new Set<string>();
    for (const part of parts) {
      for (const key of part.innervatedBy ?? []) conduits.add(key);
      for (const key of part.suppliedBy ?? []) conduits.add(key);
    }
    this.conduitKeys = conduits;
  }

  /**
   * ⭐⭐ **Is this part INSIDE the body?** — the one predicate, replacing
   * five copies of `if (part.governs?.length) continue;`.
   *
   * Two ways to be interior, and the second is why this is a method:
   *
   * 1. **It governs something.** An organ runs a sign or a capacity, and
   *    organs are inside you. This is the shipped rule, unchanged.
   * 2. ⭐ **Something's control or supply runs through it.** A conduit is
   *    inside you. This is what lets the **spine** — which governs nothing
   *    and conducts everything — be interior without inventing a field
   *    nobody else would ever read. Without it the spine would be an
   *    exterior part: counted in the surface-fraction walk, expected to be
   *    covered by a garment, and colder for having no sleeve.
   *
   * Interior parts are excluded from every covering / insulation /
   * concealment walk, which is exactly right: you cannot put a coat on a
   * liver.
   */
  public isInterior(partKey: string): boolean {
    if (this.conduitKeys.has(partKey)) return true;
    const part = this.bodyParts.find((p) => p.key === partKey);
    return (part?.governs?.length ?? 0) > 0;
  }

  /**
   * The slot↔part relations are typed references on the slot side
   * (`SlotSpec.bodyPart` / `covers`). This enforces referential
   * integrity: every reference must name a real `BodyPart`. Lenient when
   * either set is empty (nothing to check yet — covers the hydration
   * window where slots load before bodyParts).
   */
  private validateSlotPartRefs(
    slots: readonly SlotSpec[],
    parts: readonly BodyPart[],
  ): void {
    if (slots.length === 0 || parts.length === 0) return;
    const keys = new Set(parts.map((p) => p.key));
    for (const spec of slots) {
      if (spec.bodyPart !== undefined && !keys.has(spec.bodyPart)) {
        throw new Error(
          `BodyPlan: slot '${spec.name}' bodyPart '${spec.bodyPart}' ` +
            `is not a known part`,
        );
      }
      for (const covered of spec.covers ?? []) {
        if (!keys.has(covered)) {
          throw new Error(
            `BodyPlan: slot '${spec.name}' covers unknown part '${covered}'`,
          );
        }
      }
    }
  }

  /** Slots located at (attached to / enabled by) the given part key. */
  public getSlotsAt(partKey: string): readonly SlotSpec[] {
    return this.slots.filter((s) => s.bodyPart === partKey);
  }

  /** Slots whose occupant covers the given part key (coverage relation). */
  public getSlotsCovering(partKey: string): readonly SlotSpec[] {
    return this.slots.filter((s) => (s.covers ?? []).includes(partKey));
  }

  /**
   * The share of this body's **external surface** that `partKey`
   * carries, as a fraction summing to 1 across the plan.
   *
   * ⭐ Derived by **Meeh's law** — surface scales as `mass^(2/3)` — over
   * the tissue masses `bodyParts` already authors. There is no new
   * authored field and there is not going to be one: a per-part surface
   * number would be a second copy of a fact the tissue masses already
   * carry, and the two would drift.
   *
   * ⚠ **Organs are excluded.** A part with a non-empty `governs` is internal
   * (the heart, the lungs) and has no external surface at all; counting
   * it would dilute every other part's share by a body nobody can put a
   * coat on. That signal is already in the data, so the exclusion is
   * principled rather than a hand-picked list.
   *
   * This is what lets *"an uncovered part is colder"* mean something
   * proportionate: a bare hand costs exactly its surface share (~2.7% of
   * a biped, each), and a cloak beats a shirt because it covers more.
   * A plan with no authored tissue masses returns `0` for everything
   * and the caller falls back to a body-wide read.
   */
  public getPartSurfaceFraction(partKey: string): number {
    let total = 0;
    let own = 0;
    for (const part of this.bodyParts) {
      // Exterior parts only — you cannot put a coat on a liver. (Was an
      // inline `governs?.length`; the predicate is now one method, and it
      // knows about conduits too.)
      if (this.isInterior(part.key)) continue;
      const area = this.partArea(part.key);
      if (!(area > 0)) continue;
      total += area;
      if (part.key === partKey) own = area;
    }
    if (!(total > 0)) return 0;
    return own / total;
  }

  /**
   * ⭐⭐ **A part's cross-sectional area**, by Meeh's law —
   * `(Σ share)^(2/3)` over its authored tissue shares. `0` for an unknown
   * or shareless part.
   *
   * ⭐ **A proportion, and that changes nothing here.** Both readers
   * below are ratio-only — one divides by the exterior total, the other
   * only ORDERS parts — so taking the law over shares instead of
   * kilograms leaves every shipped answer identical (the hand's 2.7 % of
   * a biped, liver before heart on the depth ladder) while making the
   * number mean the same thing on a canary and an ox.
   *
   * Two readers, and they want the same number for different reasons:
   * {@link getPartSurfaceFraction} normalises it across the exterior to
   * answer *"how much of the skin is this"*, and the depth ladder orders
   * organs by it to answer *"what does a blow through here meet first"* —
   * a bigger organ presents more cross-section to whatever is coming
   * through, which is **why** it is reached first.
   *
   * ⚠⚠ **An organ must call THIS, never `getPartSurfaceFraction`.** That
   * walk skips interior parts by construction (it is exterior-only on
   * purpose), so it returns 0 for every organ — a caller reaching for the
   * fraction would get a silently empty ladder.
   *
   * ⚠ There is no authored `area` field and there is not going to be one:
   * it would be a second copy of a fact the tissue masses already carry,
   * and the two would drift.
   */
  public partArea(partKey: string): number {
    const part = this.bodyParts.find((p) => p.key === partKey);
    if (!part) return 0;
    let share = 0;
    for (const t of part.tissues ?? []) share += t.share;
    if (!(share > 0)) return 0;
    return Math.pow(share, 2 / 3);
  }

  /**
   * The interior parts sitting immediately under `partKey` — what a blow
   * through that site can reach. Ordered **largest cross-section first**,
   * which is the depth ladder's order.
   */
  public interiorChildrenOf(partKey: string): readonly BodyPart[] {
    return this.bodyParts
      .filter((p) => p.parent === partKey && this.isInterior(p.key))
      .slice()
      .sort((a, b) => this.partArea(b.key) - this.partArea(a.key));
  }

  /**
   * Derived helper — the deduped list of sense channels this body
   * plan instantiates. Built from `sensoryPorts` in insertion order
   * (a Set preserves first-insertion order). A sessile body plan
   * with no ports returns `[]`.
   *
   * Used by the `senseStripAugmenter` to determine a viewer's
   * sensorium and by the `requires*` verb-level validators to
   * decide whether the giver can drive a single-sense verb.
   *
   * ESP / alien channels are NOT included — `SenseChannel`'s union
   * is physical-senses only. When ESP-as-channel registration
   * lands (Wave 2+), a sibling helper on the ESP organ surface
   * extends the sensorium with non-physical channels.
   */
  public getModalities(): SenseChannel[] {
    return Array.from(new Set(this.sensoryPorts.map((p) => p.modality)));
  }
}
