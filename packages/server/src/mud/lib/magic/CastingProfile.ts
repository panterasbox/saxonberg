/**
 * CastingProfile — the caster-assuming half of a spell, separated out so
 * a non-casting trigger can ignore it honestly.
 *
 * Of the authored `Spell` fields, `targeting`, `effects`, `family`,
 * `durationSeconds` and `cost` are already **trigger-neutral** (`cost`
 * once read as *energy required*, which the arcane science says it
 * literally is). Only two assume a person spending their own gift:
 *
 * - **`requiredBand`** — a competence gate. A wand deliberately bypasses
 *   it: the maker passed the gate at manufacture, and the user is
 *   spending stored labour, not their own competence.
 * - **`castSeconds`** — the time to *shape* a specification. A wand is
 *   fast because its specification is already formed.
 *
 * A wand therefore **ignores the profile** rather than silently ignoring
 * two fields that happened not to apply — the difference between a
 * modelled omission and an accident. See requirements D3.
 *
 * Pure immutable value + validation (the `Faculty.validateProfile`
 * shape). Persisted inside a Spell template's `data.castingProfile`
 * blob, plain scalars, no marshaller.
 */

import { CompetenceBand } from '../advancement/CompetenceBand';
import type { CompetenceBandName } from '../advancement/CompetenceBand';

/** The two caster-assuming fields, together. */
export interface CastingProfile {
  /** The band BOTH grid axes must reach — competence IS access. */
  readonly requiredBand: CompetenceBandName;
  /** Time to shape the specification, game-seconds. 0 = the dial default. */
  readonly castSeconds: number;
}

/** Thin static holder — validation + the neutral default. */
export class CastingProfiles {
  /** The profile an authored spell gets when it declares none. */
  public static readonly DEFAULT: CastingProfile = {
    requiredBand: 'novice',
    castSeconds: 0,
  };

  /**
   * Parse an authored `castingProfile` blob. A missing blob yields
   * {@link DEFAULT}; an unknown band or a negative cast time throws, so
   * the catalogue drops the spell and the seeds test fails loudly at
   * authoring time.
   */
  public static validate(raw: unknown): CastingProfile {
    if (raw == null) return CastingProfiles.DEFAULT;
    if (typeof raw !== 'object') {
      throw new TypeError('castingProfile: expected an object');
    }
    const p = raw as Record<string, unknown>;
    const band = p.requiredBand ?? CastingProfiles.DEFAULT.requiredBand;
    if (!CompetenceBand.isBand(band)) {
      throw new TypeError(
        `castingProfile: unknown requiredBand '${String(band)}'`,
      );
    }
    const seconds = p.castSeconds === undefined ? 0 : Number(p.castSeconds);
    if (!Number.isFinite(seconds) || seconds < 0) {
      throw new TypeError(
        `castingProfile: bad castSeconds '${String(p.castSeconds)}'`,
      );
    }
    return { requiredBand: band, castSeconds: seconds };
  }
}
