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

/**
 * Anatomy descriptor for a sensory apparatus. Capability (range,
 * acuity) does NOT belong here — that's species-side. Decomposes as
 * three flat scalars under default hydration; if it grows nested
 * fields a `SensoryPortMarshaller` handles serialization.
 */
export interface SensoryPort {
  /** `'sight'`, `'hearing'`, `'smell'`, `'taste'`, `'touch'`. */
  modality: string;
  /** How many of this port the body plan declares. */
  count: number;
  /** `'frontal'`, `'lateral'`, `'dorsal'`, `'forward'`, `'circumferential'`. */
  position: string;
}

export class BodyPlan extends SingletonMixin(PropertiedMixin(Idea)) {
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

  static persistentFields = [
    'name',
    'slots',
    'locomotionModes',
    'defaultLocomotionMode',
    'sensoryPorts',
  ];

  public getName(): string { return this.name; }
  public setName(value: string): void { this.name = value; }

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
}
