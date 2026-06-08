/**
 * Modality — singleton Idea describing one category of perception.
 *
 * One canonical instance per templatePath at
 * `/lib/perception/modalities/<name>`. v1 ships seven modalities:
 * vision, smell, sound, touch, taste, verbal-esp, emotive-esp.
 *
 * Modeled exactly on `LocomotionMode`: a templated `Idea` singleton
 * hierarchy. Each concrete modality is a subclass with its own seed
 * YAML; subclasses override `signalAt` / `perceiveFor` as needed
 * (contact + network modalities inherit the null defaults).
 *
 * `Modality.modality` carries the BodyPlan organ key. Physical
 * modalities use the `SenseChannel` literals (`'vision'`, `'hearing'`,
 * `'smell'`, `'touch'`, `'taste'`); ESP modalities use plain strings
 * (`'verbal-esp'`, `'emotive-esp'`). `Modality.name` is the modality's
 * own canonical name and is what `PerceptionApi.modalityByName`
 * resolves against. Note: for sound, the organ key is `'hearing'` but
 * the modality name is `'sound'`.
 *
 * `family` distinguishes the propagation physics shape: `'field'`
 * modalities walk space (vision, smell, sound, and — substrate-wise
 * — ESP); `'contact'` modalities require direct contact (touch,
 * taste); `'network'` is reserved for future routed-only modalities.
 * Data, not a class hierarchy — no `FieldModality` intermediate
 * subclass.
 */

import { Idea } from '../stuff/Idea';
import { SingletonMixin } from '../stuff/Singleton';
import { PropertiedMixin } from '../stuff/Propertied';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Sensor } from '../message/Sensor';

/**
 * Propagation physics shape. `'field'` = walks containment + Boundary
 * conduits + exits (vision, smell, sound, future ESP local field).
 * `'contact'` = direct contact only (touch, taste). `'network'` =
 * reserved for future routing-only modalities (no current consumer).
 */
export type ModalityFamily = 'field' | 'contact' | 'network';

const MODALITY_FAMILIES: readonly ModalityFamily[] = [
  'field',
  'contact',
  'network',
];

/**
 * Marker type — each modality returns its own value-object shape from
 * `signalAt`. Vision returns `Light`, smell returns `Smell`, sound
 * returns `Sound`, touch returns `Touch`. Callers narrow at the call
 * site. Per the requirements doc's "No premature substrate widening"
 * rule, no shared `Signal` base class.
 */
export type Signal = unknown;

/**
 * Marker type — each modality returns its own percept shape from
 * `perceiveFor`. Vision returns a band-tagged percept; future
 * modalities define their own. No shared base.
 */
export type Percept = unknown;

/**
 * Shared propagation-walk constants for the `'field'` modalities
 * (vision, smell, sound, and future ESP). Vision was the original
 * exporter — the walk relocated from the retired `LightApi` —
 * but the constants are substrate-shared, not vision-owned. Per
 * the requirements doc's "Per-modality walks, not a generic
 * walker" decision, the modalities each implement their own walk
 * body; what they share is the depth-budget + per-exit attenuation
 * tuning, which lives here on the substrate's neutral home.
 *
 * `MAX_HOPS = 2` — maximum recursion depth. Smell / sound / vision
 * each guard with `if (depth > MAX_HOPS) return acc`.
 *
 * `EXIT_TAU = 1.0` — per-doorless-exit linear attenuation factor.
 * `1.0` means "no extra dimming on exit traversal" — the boundary's
 * own conduit transmissivity does the work for doored / shuttered
 * cases.
 *
 * A per-modality override knob hasn't earned its place yet; if a
 * future modality needs different depth or attenuation, add a
 * `maxHops()` / `exitTau()` accessor on the modality singleton with
 * these as defaults.
 */
export const MAX_HOPS = 2;
export const EXIT_TAU = 1.0;

export class Modality extends SingletonMixin(PropertiedMixin(Idea)) {
  /** Canonical modality name (e.g. `'vision'`, `'sound'`). */
  protected name: string = '';

  /** Propagation physics shape. */
  protected family: ModalityFamily = 'field';

  /**
   * BodyPlan organ key — the string used by
   * `BodyPlan.sensoryPorts.modality` to declare which organ
   * instantiates this modality. Physical modalities use the
   * `SenseChannel` literals; ESP modalities use plain strings.
   */
  protected modality: string = '';

  static persistentFields = ['name', 'family', 'modality'];

  public getName(): string {
    return this.name;
  }
  public setName(value: string): void {
    if (typeof value !== 'string' || value.length === 0) {
      throw new TypeError(
        'Modality.setName: must be a non-empty string',
      );
    }
    this.name = value;
  }

  public getFamily(): ModalityFamily {
    return this.family;
  }
  public setFamily(value: ModalityFamily): void {
    if (!MODALITY_FAMILIES.includes(value)) {
      throw new TypeError(
        `Modality.setFamily: invalid value '${value}'; ` +
          `expected one of ${MODALITY_FAMILIES.join(', ')}`,
      );
    }
    this.family = value;
  }

  public getModality(): string {
    return this.modality;
  }
  public setModality(value: string): void {
    if (typeof value !== 'string' || value.length === 0) {
      throw new TypeError(
        'Modality.setModality: must be a non-empty string',
      );
    }
    this.modality = value;
  }

  /**
   * Compute the modality's signal at `loc`. Contact and network
   * modalities (taste, ESP-network) inherit this null default; field
   * modalities (vision / smell / sound) override with their
   * propagation walk; contact modalities that read ambient
   * environment (touch) override with a non-propagating read.
   *
   * Callers narrow the return type at the call site. e.g.
   * `PerceptionApi.signalAt(loc, vision) as Light | null`.
   */
  public signalAt(_loc: Stuff & Container): Signal | null {
    return null;
  }

  /**
   * Convert a signal into a viewer-specific percept (band-shift,
   * acuity threshold, shadow-seam overrides). Default returns null
   * (the raw signal is the percept). Vision overrides to apply the
   * band-shift + canSee gates; the `loc` argument is the location
   * the signal was read from, threaded through for shadow seams
   * that need scope context (e.g. `viewer.perceivedBandModifier`).
   */
  public perceiveFor(
    _viewer: Stuff & Sensor,
    _loc: Stuff & Container,
    _signal: Signal,
  ): Percept | null {
    return null;
  }
}
