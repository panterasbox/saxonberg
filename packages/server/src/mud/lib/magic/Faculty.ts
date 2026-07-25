/**
 * Faculty — the anatomical casting faculty's profile vocabulary +
 * derive-on-read scaling.
 *
 * Casting is a bodily capability, not a flat stat. A species'
 * `facultyProfile` (the `vitalProfile` field precedent on `Species`)
 * carries three banded attributes:
 *
 * - **depth** — capacity: derives the mana pool's size in `pt`
 *   (`magic.depthCapacity.<band>`). A deep mage has a bigger tank.
 * - **serenity** — recovery: scales the absolute pt/game-min refill
 *   rate. Depth × serenity are orthogonal (a deep-slow mage and a
 *   shallow-fast mage are genuinely different casters).
 * - **composure** — the mental-axis resist substrate, read *live* as
 *   `composureBase(band) × (floor + (1−floor) × manaFraction)` — a
 *   drained, frayed mage resists fear worse; a rested one shrugs it.
 *   Composure exists without the casting faculty (a non-caster species
 *   reads the authored neutral default band).
 *
 * All three are **bands + derive-on-read factors, never stored scalars
 * on the creature** — the slate's binding "no CON-style scalar"
 * obligation. Magnitudes ride `magic.*` dials with seeded-literal
 * fallbacks (pre-warm / test safe, the fire-dial idiom).
 */

import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';

/** The faculty band scale (dial-key suffixes). */
export const FACULTY_BANDS = ['low', 'mid', 'high'] as const;

/** A faculty band — one of {@link FACULTY_BANDS}. */
export type FacultyBand = (typeof FACULTY_BANDS)[number];

/** The per-species faculty profile (persisted flat on `Species`). */
export interface FacultyProfile {
  readonly depth: FacultyBand;
  readonly serenity: FacultyBand;
  readonly composure: FacultyBand;
}

/** Seeded-literal fallbacks for the `magic.*` dials (pre-warm safe). */
const FACULTY_DEFAULTS = {
  depthCapacity: { low: 80, mid: 120, high: 180 },
  recoveryPerMinBase: 1.5,
  serenityFactor: { low: 0.6, mid: 1, high: 1.6 },
  composureBase: { low: 0.7, mid: 1, high: 1.4 },
  composureFloorFactor: 0.4,
} as const;

/** Per-band dial keys (AppSettingKeys enumerates each key fully). */
const DEPTH_CAPACITY_KEYS: Record<FacultyBand, string> = {
  low: AppSettingKeys.magicDepthCapacityLow,
  mid: AppSettingKeys.magicDepthCapacityMid,
  high: AppSettingKeys.magicDepthCapacityHigh,
};
const SERENITY_FACTOR_KEYS: Record<FacultyBand, string> = {
  low: AppSettingKeys.magicSerenityFactorLow,
  mid: AppSettingKeys.magicSerenityFactorMid,
  high: AppSettingKeys.magicSerenityFactorHigh,
};
const COMPOSURE_BASE_KEYS: Record<FacultyBand, string> = {
  low: AppSettingKeys.magicComposureBaseLow,
  mid: AppSettingKeys.magicComposureBaseMid,
  high: AppSettingKeys.magicComposureBaseHigh,
};

/** Numeric AppSetting read, falling back to the seeded literal. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/** Thin static holder — band predicates + the derive-on-read scaling. */
export class Faculty {
  /** Is `b` a faculty band? */
  public static isBand(b: unknown): b is FacultyBand {
    return (
      typeof b === 'string' && (FACULTY_BANDS as readonly string[]).includes(b)
    );
  }

  /** Parse an authored profile blob; `null` when absent (non-caster). */
  public static validateProfile(raw: unknown): FacultyProfile | null {
    if (raw == null) return null;
    const p = raw as Record<string, unknown>;
    if (
      !Faculty.isBand(p.depth) ||
      !Faculty.isBand(p.serenity) ||
      !Faculty.isBand(p.composure)
    ) {
      throw new TypeError(
        `facultyProfile: bands must each be one of ${FACULTY_BANDS.join('|')}`,
      );
    }
    return { depth: p.depth, serenity: p.serenity, composure: p.composure };
  }

  /** The mana pool capacity (pt) a depth band derives. */
  public static capacityFor(depth: FacultyBand): number {
    return dial(
      DEPTH_CAPACITY_KEYS[depth],
      FACULTY_DEFAULTS.depthCapacity[depth],
    );
  }

  /** The absolute recovery rate (pt per game-minute) a serenity band derives. */
  public static recoveryPerMinFor(serenity: FacultyBand): number {
    return (
      dial(
        AppSettingKeys.magicRecoveryPerMinBase,
        FACULTY_DEFAULTS.recoveryPerMinBase,
      ) *
      dial(
        SERENITY_FACTOR_KEYS[serenity],
        FACULTY_DEFAULTS.serenityFactor[serenity],
      )
    );
  }

  /**
   * The live Composure substrate factor for the mental resist gate.
   * `manaFraction` is `current/capacity` in `[0,1]`; a missing pool
   * (non-caster) reads as full (the profile band alone carries them).
   */
  public static composureFactor(
    composure: FacultyBand,
    manaFraction: number,
  ): number {
    const base = dial(
      COMPOSURE_BASE_KEYS[composure],
      FACULTY_DEFAULTS.composureBase[composure],
    );
    const floor = dial(
      AppSettingKeys.magicComposureFloorFactor,
      FACULTY_DEFAULTS.composureFloorFactor,
    );
    const frac = Math.min(1, Math.max(0, manaFraction));
    return base * (floor + (1 - floor) * frac);
  }

  /** The neutral composure band a species without a profile reads. */
  public static defaultComposureBand(): FacultyBand {
    return 'mid';
  }
}
