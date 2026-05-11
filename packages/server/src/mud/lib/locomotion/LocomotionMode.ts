/**
 * LocomotionMode — singleton Idea describing one mode of locomotion.
 *
 * One canonical instance per templatePath at `/lib/locomotion/<name>`.
 * v1 ships nine modes: walk, climb, swim, fly, ride, drive, wheeled,
 * sailed, aerial.
 *
 * Mode references on actors / exits / drivables are STRINGS (the
 * templatePath); resolution via `LocomotionApi.modeOf(path)` returns
 * this singleton. See ref-shapes Pattern A (string-by-path).
 *
 * Two parallel vocabularies coexist:
 *   - Full templatePath (`/lib/locomotion/walk`) — what
 *     `_engagedModePath` / `_vehicularModePath` / `setTemplatePath`
 *     store.
 *   - Short name (`walk`) — what `Exit.media` (via mode-medium lookup),
 *     `BodyPlan.locomotionModes`, `LocomotionMode.requiresBodyPlanMode`,
 *     and Mml prose use. The short name lives on `name` and is read
 *     via `getName()`.
 *
 * `LocomotionApi.modeOf` accepts either form ergonomically.
 */

import { Idea } from '../stuff/Idea';
import { SingletonMixin } from '../stuff/Singleton';
import { PropertiedMixin } from '../stuff/Propertied';

export type NoiseLevel = 'silent' | 'quiet' | 'normal' | 'loud';

/**
 * Body-shape profile, used by future height-keyed traps and visual
 * detection / silhouette modeling.
 *
 *   - `prone`      — body flat on the ground (crawl-style).
 *   - `crouched`   — between upright and prone (sneak-style).
 *   - `upright`    — vertical body axis (walking, standing, climbing
 *                    a wall face).
 *   - `horizontal` — body flat OFF the ground (swimming at the surface,
 *                    flying with wings spread). Distinct from `prone`
 *                    because a tripwire at ankle height misses a
 *                    swimming fish but might catch a crawler — the
 *                    body is at a different height even though both
 *                    are flat.
 *   - `varied`     — context-dependent. The mode doesn't determine a
 *                    single profile; consumers query per-actor /
 *                    per-host data (a climbing actor's profile varies
 *                    by the Climbable axis they engage; a vehicle's
 *                    profile varies by its specific design).
 */
export type BodyProfile =
  | 'prone'
  | 'crouched'
  | 'upright'
  | 'horizontal'
  | 'varied';

export type GroundContact = 'none' | 'partial' | 'full';

const NOISE_LEVELS: readonly NoiseLevel[] = [
  'silent',
  'quiet',
  'normal',
  'loud',
];

const BODY_PROFILES: readonly BodyProfile[] = [
  'prone',
  'crouched',
  'upright',
  'horizontal',
  'varied',
];

const GROUND_CONTACTS: readonly GroundContact[] = ['none', 'partial', 'full'];

export class LocomotionMode extends SingletonMixin(PropertiedMixin(Idea)) {
  /** Short name (e.g. `'walk'`). The full templatePath is `/lib/locomotion/<name>`. */
  protected name: string = '';

  /** Relative-speed multiplier vs. baseline walking. */
  protected speed: number = 1.0;

  protected noiseLevel: NoiseLevel = 'normal';
  protected bodyProfile: BodyProfile = 'upright';
  protected groundContact: GroundContact = 'full';

  /**
   * Short names from `BodyPlan.locomotionModes` that the actor's body
   * plan must include (any-of semantics). Empty array means no
   * body-plan requirement.
   */
  protected requiresBodyPlanMode: string[] = [];

  /** Postures the actor must currently hold. Empty means no posture gate. */
  protected requiresPosture: string[] = [];

  /** Forward-looking knob for stamina / movement-point consumers. */
  protected costMultiplier: number = 1.0;

  /**
   * True for passthrough modes (ride / drive): the actor's engagement
   * doesn't traverse on its own — the conveyance host does.
   */
  protected passthrough: boolean = false;

  /**
   * For passthrough modes: the `Mixins`-registry mixin name a slot-host
   * must compose to be a valid conveyance for this mode. `'MountableMixin'`
   * for ride, `'DrivableMixin'` for drive. `null` for non-passthrough
   * modes.
   */
  protected conveyanceMixin: string | null = null;

  /**
   * For non-passthrough modes (climb / swim / fly): the `Mixins`-registry
   * enablement mixin name a host in the actor's scope must compose for
   * this mode to engage. `null` means no enablement-scope check (walk-shaped).
   *
   * Symmetric with `conveyanceMixin` on the passthrough side: both are
   * author-data on the template, read by `LocomotionApi` via
   * `getEnablementMixin()` / `getConveyanceMixin()` rather than switching
   * on the mode name.
   */
  protected enablementMixin: string | null = null;

  /**
   * Locomotion medium — the surface / element a mode consumes (e.g.
   * `'ground'`, `'water'`, `'air'`, `'vertical'`). Exits declare which
   * media they admit via `Exit.media`; `Exit.allowsMode(name)` resolves
   * the mode and matches its medium against the exit's set. Grouping by
   * medium lets a corridor admit walk + run + crawl + sneak with a
   * single `media: ['ground']` rather than enumerating every mode.
   *
   * `null` for passthrough modes (ride / drive) — those don't consume a
   * medium directly; the conveyance host does, and the host's medium
   * applies via `resolveHostMode`.
   *
   * Open vocabulary (not enum-bounded) so content authors can introduce
   * new media without a substrate edit (`'plasma'`, `'web'`, etc.).
   */
  protected medium: string | null = null;

  static persistentFields = [
    'name',
    'speed',
    'noiseLevel',
    'bodyProfile',
    'groundContact',
    'requiresBodyPlanMode',
    'requiresPosture',
    'costMultiplier',
    'passthrough',
    'conveyanceMixin',
    'enablementMixin',
    'medium',
  ];

  public getName(): string {
    return this.name;
  }
  public setName(value: string): void {
    this.name = value;
  }

  public getSpeed(): number {
    return this.speed;
  }
  public setSpeed(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(
        `LocomotionMode.setSpeed: must be a finite positive number; got ${value}`
      );
    }
    this.speed = value;
  }

  public getNoiseLevel(): NoiseLevel {
    return this.noiseLevel;
  }
  public setNoiseLevel(value: NoiseLevel): void {
    if (!NOISE_LEVELS.includes(value)) {
      throw new TypeError(
        `LocomotionMode.setNoiseLevel: invalid value '${value}'; ` +
          `expected one of ${NOISE_LEVELS.join(', ')}`
      );
    }
    this.noiseLevel = value;
  }

  public getBodyProfile(): BodyProfile {
    return this.bodyProfile;
  }
  public setBodyProfile(value: BodyProfile): void {
    if (!BODY_PROFILES.includes(value)) {
      throw new TypeError(
        `LocomotionMode.setBodyProfile: invalid value '${value}'; ` +
          `expected one of ${BODY_PROFILES.join(', ')}`
      );
    }
    this.bodyProfile = value;
  }

  public getGroundContact(): GroundContact {
    return this.groundContact;
  }
  public setGroundContact(value: GroundContact): void {
    if (!GROUND_CONTACTS.includes(value)) {
      throw new TypeError(
        `LocomotionMode.setGroundContact: invalid value '${value}'; ` +
          `expected one of ${GROUND_CONTACTS.join(', ')}`
      );
    }
    this.groundContact = value;
  }

  public getRequiresBodyPlanMode(): readonly string[] {
    return this.requiresBodyPlanMode;
  }
  public setRequiresBodyPlanMode(value: string[]): void {
    assertUniqueNonEmpty(value, 'setRequiresBodyPlanMode');
    this.requiresBodyPlanMode = value;
  }

  public getRequiresPosture(): readonly string[] {
    return this.requiresPosture;
  }
  public setRequiresPosture(value: string[]): void {
    assertUniqueNonEmpty(value, 'setRequiresPosture');
    this.requiresPosture = value;
  }

  public getCostMultiplier(): number {
    return this.costMultiplier;
  }
  public setCostMultiplier(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(
        `LocomotionMode.setCostMultiplier: must be a finite positive ` +
          `number; got ${value}`
      );
    }
    this.costMultiplier = value;
  }

  public getPassthrough(): boolean {
    return this.passthrough;
  }
  public setPassthrough(value: boolean): void {
    this.passthrough = value;
  }

  public getConveyanceMixin(): string | null {
    return this.conveyanceMixin;
  }
  public setConveyanceMixin(value: string | null): void {
    this.conveyanceMixin = value;
  }

  public getEnablementMixin(): string | null {
    return this.enablementMixin;
  }
  public setEnablementMixin(value: string | null): void {
    this.enablementMixin = value;
  }

  public getMedium(): string | null {
    return this.medium;
  }
  public setMedium(value: string | null): void {
    if (value !== null) {
      if (typeof value !== 'string' || value.length === 0) {
        throw new TypeError(
          'LocomotionMode.setMedium: must be null or a non-empty string',
        );
      }
    }
    this.medium = value;
  }
}

function assertUniqueNonEmpty(value: string[], where: string): void {
  const seen = new Set<string>();
  for (const v of value) {
    if (typeof v !== 'string' || v.length === 0) {
      throw new TypeError(
        `LocomotionMode.${where}: entries must be non-empty strings`
      );
    }
    if (seen.has(v)) {
      throw new TypeError(
        `LocomotionMode.${where}: duplicate entry '${v}'`
      );
    }
    seen.add(v);
  }
}
