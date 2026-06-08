/**
 * PerceptionMixin — the subjective-interpretation layer of perception.
 *
 * Saxonberg's perception splits into two orthogonal axes:
 *
 *   - **Sensor** (`message/Sensor.ts`) — the *channel* layer. You
 *     receive perceptual input as `MessageFrame`s through the
 *     messaging subsystem. Vision, hearing, ESP, all flow through
 *     `Sensor.onMessage`; channel-level filtering rides
 *     `filterMessage`.
 *   - **Perception** (this file) — the *interpretation* layer. When
 *     a query Api like `VisionModality.perceivedBand(viewer, loc)` asks
 *     "what does this entity perceive?", PerceptionMixin's seam
 *     methods are where curses, species vision profiles, blindfolds,
 *     night vision, magical darkness — anything that modulates
 *     subjective experience — get a vote on the answer.
 *
 * Composition profile:
 *
 *   - Anything queryable as a viewer composes both Sensor AND
 *     Perception. Avatars and Characters compose this for free
 *     through the Character chain.
 *   - A passive recording device might compose only Sensor.
 *   - Inert Stuff (rooms, items) composes neither.
 *
 * Seam methods are real host methods with no-op identity defaults.
 * Shadows on the host (BlindfoldShadow, NightVisionShadow,
 * DarknessCurseShadow, …) intercept these methods through standard
 * Stuff Shadow dispatch — `@Shadowing`, `callDown` for chaining,
 * security gates per the framework. The proxy pipeline routes
 * `viewer.perceivedBandModifier(raw, loc)` through the shadow stack
 * naturally; VisionModality just calls the host method.
 *
 * The cross-cutting viewer-aware-query pattern is documented in
 * [docs/subsystems/perception.md](../../../../../../docs/subsystems/perception.md).
 *
 * Forward-looking: when sound / hearing lands, this mixin grows
 * `perceivedVolumeModifier` / `canHearOverride` / `getHearingProfile`
 * the same way. Each sense modality adds its seams here; they don't
 * fragment across per-channel mixins.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { LightBand, VisibilityDetail, VisionProfile } from './Light';

/**
 * Public shape provided by PerceptionMixin. Each seam returns the
 * raw answer unchanged in the default identity implementation;
 * Shadows override to modulate.
 */
export interface Perception {
  /**
   * Modulate the perceived light band at a location. `raw` is the
   * band the framework has already computed (with size scale and
   * vision profile applied). Identity default: `raw`. A
   * `BlindfoldShadow` returns `'pitch-black'`. A magical-light
   * shadow could shift it up.
   */
  perceivedBandModifier(raw: LightBand, loc: Stuff & Container): LightBand;

  /**
   * Override the framework's `canSee` answer for a specific
   * `(target, detail)` pair. `raw` is what the framework computed
   * from `perceivedBand` against the detail-level threshold. The
   * shadow can yes/no the answer outright. Identity default: `raw`.
   */
  canSeeOverride(
    target: Stuff,
    detail: VisibilityDetail,
    raw: boolean
  ): boolean;

  /**
   * Per-viewer vision profile (scotopic minimum, photopic maximum,
   * band shift). Identity default: `null` — caller falls back to
   * the framework's default human-shaped profile. The Organism
   * subsystem will populate this from species data later via a
   * shadow that reads the species template's vision parameters.
   */
  getVisionProfile(): VisionProfile | null;
}

export function PerceptionMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class PerceptionMixin extends Base {
    static _mixinName = 'PerceptionMixin';

    /**
     * Identity default — the raw band passes through unchanged.
     * Shadows that intercept this method modulate the answer.
     */
    perceivedBandModifier(
      raw: LightBand,
      _loc: Stuff & Container
    ): LightBand {
      return raw;
    }

    /**
     * Identity default — the framework's `canSee` answer passes
     * through unchanged. XRay / Blindfold shadows override.
     */
    canSeeOverride(
      _target: Stuff,
      _detail: VisibilityDetail,
      raw: boolean
    ): boolean {
      return raw;
    }

    /**
     * Identity default — return `null` so `VisionModality.viewerVisionProfile`
     * falls back to its constant human-shaped profile. The Organism
     * subsystem populates per-species profiles via a shadow.
     */
    getVisionProfile(): VisionProfile | null {
      return null;
    }
  };
}
