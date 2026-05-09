/**
 * BodyPlan — anatomical layout shared across species.
 *
 * A `BodyPlan` declares the physical anatomy: equipment slots
 * (`wornSlots`, `heldSlots`), locomotion modes, and sensory port
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
 * plant, a coral. Zero held slots, zero locomotion modes, zero sensory
 * ports. Default plants reference it so code reading `species.bodyPlan`
 * never null-checks.
 */

import { Idea } from '../stuff/Idea';
import { SingletonMixin } from '../stuff/Singleton';
import { PropertiedMixin } from '../stuff/Propertied';

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
   * Worn slot names for this body plan: `'head'`, `'torso'`,
   * `'finger:left'`, etc. The set is the universe of equipment
   * positions a wearer of this body plan can fill.
   */
  protected wornSlots: string[] = [];

  /**
   * Prehensile slot names: `'hand:left'`, `'hand:right'`, `'tentacle:1'`.
   * Drives `Wieldable` capacity. Sessile plans have zero.
   */
  protected heldSlots: string[] = [];

  /**
   * Locomotion modes the body plan supports: `['walk']`,
   * `['walk', 'fly']`, `[]` for sessile. Drives the
   * `Climbable`/`Swimmable`/`Flyable` traversal selection in Mobile.
   */
  protected locomotionModes: string[] = [];

  /**
   * Sensory port anatomy. Position, count, modality only — capability
   * is species-side.
   */
  protected sensoryPorts: SensoryPort[] = [];

  static persistentFields = [
    'name',
    'wornSlots',
    'heldSlots',
    'locomotionModes',
    'sensoryPorts',
  ];

  public getName(): string { return this.name; }
  public setName(value: string): void { this.name = value; }

  public getWornSlots(): readonly string[] { return this.wornSlots; }
  public setWornSlots(value: string[]): void { this.wornSlots = value; }

  public getHeldSlots(): readonly string[] { return this.heldSlots; }
  public setHeldSlots(value: string[]): void { this.heldSlots = value; }

  public getLocomotionModes(): readonly string[] { return this.locomotionModes; }
  public setLocomotionModes(value: string[]): void {
    this.locomotionModes = value;
  }

  public getSensoryPorts(): readonly SensoryPort[] { return this.sensoryPorts; }
  public setSensoryPorts(value: SensoryPort[]): void {
    this.sensoryPorts = value;
  }
}
