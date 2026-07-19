/**
 * Touch — immutable value object describing the tactile signal at a
 * location.
 *
 * Carries:
 *   - `temperature: Quantity<'K'>` — ambient temperature at the
 *     receiving scope.
 *   - `band: TouchBand` — coarse band the temperature maps into.
 *
 * Touch is a CONTACT modality: there's no propagation walk. The
 * value is produced by the verb / instrument at perception time.
 * Persistence: runtime-only.
 *
 * Band threshold table is calibrated against the universe baseline
 * 295 K (≈ room temperature → `comfortable`):
 *
 * | < 273 K   → cold (freezing or below)
 * | < 290 K   → cool
 * | < 305 K   → comfortable
 * | < 320 K   → warm
 * | < 345 K   → hot
 * | >= 345 K  → scalding
 */

import { Quantity } from '../quantity';

export type TouchBand =
  | 'cold'
  | 'cool'
  | 'comfortable'
  | 'warm'
  | 'hot'
  | 'scalding';

/**
 * Ordered list of bands; lowest threshold first. Used by `bandFor`
 * to walk the cutoffs.
 */
export const TOUCH_BANDS: readonly TouchBand[] = [
  'cold',
  'cool',
  'comfortable',
  'warm',
  'hot',
  'scalding',
];

/**
 * Per-band upper threshold in Kelvin. The band's name is the band a
 * temperature LESS THAN this threshold falls into. `'scalding'`
 * absorbs everything at or above the highest cutoff.
 */
const BAND_THRESHOLDS_K: Record<TouchBand, number> = {
  cold: 273,
  cool: 290,
  comfortable: 305,
  warm: 320,
  hot: 345,
  scalding: Number.POSITIVE_INFINITY,
};

export class Touch {
  public readonly temperature: Quantity<'K'>;
  public readonly band: TouchBand;

  protected constructor(temperature: Quantity<'K'>, band: TouchBand) {
    this.temperature = temperature;
    this.band = band;
  }

  /**
   * Map a Kelvin temperature to a TouchBand.
   */
  public static bandFor(temperatureK: number): TouchBand {
    for (const band of TOUCH_BANDS) {
      if (temperatureK < BAND_THRESHOLDS_K[band]) return band;
    }
    return 'scalding';
  }

  public static of(temperature: Quantity<'K'>): Touch {
    if (!(temperature instanceof Quantity) || temperature.unit !== 'K') {
      throw new TypeError(
        `Touch.of: temperature must be Quantity<'K'>`,
      );
    }
    return new Touch(temperature, Touch.bandFor(temperature.rawValue()));
  }

  /**
   * The **heat-channel energy** a bare-handed contact with a surface at
   * `temperatureK` delivers, or `null` when the surface isn't in the
   * `scalding` band (no burn). **Pure** — returns the value; the caller
   * routes it through `ConditionApi.inflict({mechanism:'heat', energy, site})`
   * so any covering on the hand insulates before the residual burns tissue.
   * The single home for the scalding-band contact rule the contact verbs
   * share (`feel`, `get`), so the threshold + energy ramp aren't duplicated
   * per controller. On an unarmored hand the residual equals this energy and,
   * with the default `response.severityPerResidual` = 1, reproduces the burn
   * severity the old direct-afflict produced (byte-compatible). Energy rises
   * with how far past the scalding floor the surface sits (a tuning detail).
   */
  public static contactBurnEnergy(temperatureK: number): number | null {
    if (Touch.bandFor(temperatureK) !== 'scalding') return null;
    const scaldingFloor = BAND_THRESHOLDS_K.hot; // < this is `hot`, ≥ scalds
    return Math.min(1, 0.5 + (temperatureK - scaldingFloor) / 80);
  }

  public toJSON(): {
    temperature: { value: number; unit: 'K' };
    band: TouchBand;
  } {
    return {
      temperature: this.temperature.toJSON(),
      band: this.band,
    };
  }
}
