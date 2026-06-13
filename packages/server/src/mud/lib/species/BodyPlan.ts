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

import { Idea } from '../stuff/Idea';
import { SingletonMixin } from '../stuff/Singleton';
import { PropertiedMixin } from '../stuff/Propertied';
import type { SlotSpec } from '../slot/Slotted';
import type { SenseChannel } from '../description/Perceiver';

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
 * Named tissue + its mass (kg) within a body part. The per-part
 * substrate a future physical-attribute reading (strength = force over
 * muscle mass) aggregates. v1 authors muscle / bone / flesh.
 */
export interface TissueComposition {
  /** Material templatePath, e.g. `/lib/material/tissue/muscle`. */
  tissuePath: string;
  /** Mass in kg (plain number; no Quantity to keep the descriptor flat). */
  mass: number;
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
   * Organ → vital coupling. A `VitalSign` key (see `lib/vitals/Vitals.ts`);
   * typed `string` here deliberately to keep `BodyPlan` free of any
   * import from `lib/vitals`.
   */
  governsVital?: string;
  /** Can detach — future part-promotion seam. */
  severable?: boolean;
  // Deferred-with-seam (declared, no reader this build): the
  // innervation / vascular graph, orthogonal to the containment tree.
  innervatedBy?: string[];
  suppliedBy?: string[];
}

export default class BodyPlan extends SingletonMixin(PropertiedMixin(Idea)) {
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
   * Default whole-body mass in kg (plain number — mirrors
   * `TissueComposition.mass`, keeping `BodyPlan` a flat authoring
   * flyweight free of any `Quantity` / `lib/material` import). A
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

  static persistentFields = [
    'name',
    'slots',
    'locomotionModes',
    'defaultLocomotionMode',
    'sensoryPorts',
    'bodyParts',
    'baseMass',
  ];

  public getName(): string { return this.name; }
  public setName(value: string): void { this.name = value; }

  public getBaseMass(): number { return this.baseMass; }
  public setBaseMass(value: number): void {
    // Per-field invariant on the setter (the project rule): the
    // Hydrator's Phase-1 `setBaseMass` dispatch is the validation point.
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new RangeError(
        `BodyPlan.setBaseMass: must be a finite, non-negative number, ` +
          `got ${value}`,
      );
    }
    this.baseMass = value;
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
