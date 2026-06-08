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

/**
 * Map a Kelvin temperature to a TouchBand.
 */
export function bandFor(temperatureK: number): TouchBand {
  for (const band of TOUCH_BANDS) {
    if (temperatureK < BAND_THRESHOLDS_K[band]) return band;
  }
  return 'scalding';
}

export class Touch {
  public readonly temperature: Quantity<'K'>;
  public readonly band: TouchBand;

  protected constructor(temperature: Quantity<'K'>, band: TouchBand) {
    this.temperature = temperature;
    this.band = band;
  }

  public static of(temperature: Quantity<'K'>): Touch {
    if (!(temperature instanceof Quantity) || temperature.unit !== 'K') {
      throw new TypeError(
        `Touch.of: temperature must be Quantity<'K'>`,
      );
    }
    return new Touch(temperature, bandFor(temperature.rawValue()));
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
