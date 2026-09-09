/**
 * ⭐⭐ Morale — **whether this fighter still wants to be in this fight.**
 *
 * A derived read, never a stored scalar. There is no morale gauge, nothing
 * to drain, nothing to buff, and nothing persists past the beat: this is a
 * pure function of the state the session already keeps, computed fresh
 * whenever anybody asks. That is the same shape as {@link Sharpness}, and
 * it is deliberate — "never stored morale points" is structural here, not
 * a convention somebody has to remember.
 *
 * ## Why it exists
 *
 * `DEFAULT_TERMS.stopCondition` has always been `"yield"`, and **nothing
 * in the engine ever enforced it.** No brain, no NPC, no content class
 * has ever called `yieldFight` or `offerBreak`; the only morale-shaped
 * behaviour anywhere was the `combatant` brain going passive at
 * `broken`/`open`, which is not the same thing as giving up. So every
 * fight ran to incapacitation, whatever the terms said — and the
 * non-fighter's only honest exit from violence was to win it.
 *
 * ## What it reads
 *
 * How badly the fight is going, which is **not** the same question as
 * what your poise band is right now:
 *
 *   - your poise band, and its **trend** (`bandSeen` — the cross-beat
 *     baseline the session already keeps, so a fighter who is reeling and
 *     recovering reads differently from one who is reeling and falling);
 *   - what you have **taken** this fight (`woundsTaken`) — a fighter with
 *     three deep wounds and momentarily steady footing is in trouble, and
 *     the poise band alone cannot say so;
 *   - **how outnumbered you are** right now, and whether your side is
 *     going down around you;
 *   - the foe's poise band — losing badly to somebody who is themselves
 *     reeling is not the same as losing to somebody untouched;
 *   - the **terms**. ⭐ Lethal terms lower a sentient's break point,
 *     because dying is worse than losing, and a person knows it. A beast
 *     does not read terms at all.
 *
 * ## What it does NOT do
 *
 * ⚠ It is **not** `Sharpness`'s `g(composure)`. That seam stays inert and
 * empty; it has two prior claimants (combat-experience T5, the mind
 * slate's `traits-stress`) and folding morale into it would settle their
 * question by accident. Morale is a separate function that answers a
 * separate question — *should I still be here* rather than *how well am I
 * fighting* — and the two must not be collapsed.
 *
 * ⚠⚠ And it **never seizes a player's decision.** A brain reads this and
 * acts on it; a player's morale is computed, narrated, and readable
 * through `assess`, and then the player decides. The engine models the
 * stakes; the choice stays theirs.
 */

import type { CombatSession, CombatantState } from "./CombatSession";
import type { PoiseBand } from "./Poise";

/** The readout. Three bands, because a fourth would be a gauge. */
export const MORALE_BANDS = ["resolute", "shaken", "breaking"] as const;
export type MoraleBand = (typeof MORALE_BANDS)[number];

/** Thresholds, injected by the session from `combat.morale.*`. */
export interface MoraleConfig {
  /** Pressure at/above which a fighter reads `shaken`. */
  shakenAt: number;
  /** Pressure at/above which a fighter reads `breaking`. */
  breakingAt: number;
  /** Extra pressure a sentient feels when the terms authorize a kill. */
  lethalTermsWeight: number;
}

export const DEFAULT_MORALE_CONFIG: MoraleConfig = {
  shakenAt: 0.45,
  breakingAt: 0.75,
  lethalTermsWeight: 0.2,
};

/** How much each poise band contributes on its own. */
const POISE_PRESSURE: Record<PoiseBand, number> = {
  steady: 0,
  pressed: 0.1,
  reeling: 0.3,
  broken: 0.45,
  open: 0.5,
};

const POISE_ORDER: Record<PoiseBand, number> = {
  steady: 0,
  pressed: 1,
  reeling: 2,
  broken: 3,
  open: 4,
};

/** What a wound already taken contributes, by the band of the blow. */
const WOUND_PRESSURE: Record<string, number> = {
  turned: 0,
  grazes: 0.03,
  bites: 0.1,
  "bites-deep": 0.2,
};

export interface MoraleInputs {
  /** Whether the fight's terms authorize killing this fighter. */
  lethal: boolean;
  /** Whether this fighter is the kind of thing that reads terms at all. */
  sentient: boolean;
  /** Live foes pressing this fighter (1 = a fair fight). */
  foes: number;
  /** Allies of this fighter who are already down. */
  alliesDown: number;
  /** The worst-off live foe's poise band, or null when unknown. */
  foeBand: PoiseBand | null;
}

export class Morale {
  private constructor() {}

  /**
   * The morale band for one combatant, from the session's live state.
   *
   * `foeState` is the single foe to read when there is an obvious one;
   * otherwise the read derives the crowd from the session.
   */
  static bandFor(
    state: CombatantState,
    session: CombatSession,
    inputs: MoraleInputs,
    config: MoraleConfig = DEFAULT_MORALE_CONFIG,
  ): MoraleBand {
    return Morale.forPressure(
      Morale.pressure(state, session, inputs, config),
      config,
    );
  }

  /**
   * The accumulated pressure in `[0, ~1.5]`. Exposed for tests and for
   * the narration seam, which needs to know *which way* a fighter is
   * moving as well as where they are.
   */
  static pressure(
    state: CombatantState,
    _session: CombatSession,
    inputs: MoraleInputs,
    config: MoraleConfig = DEFAULT_MORALE_CONFIG,
  ): number {
    const band = state.poise.band();
    let p = POISE_PRESSURE[band] ?? 0;

    // ⭐ The TREND. A fighter at `reeling` who was `broken` last beat is
    // climbing out and knows it; one who was `steady` is falling and
    // knows that too. The session already keeps this baseline for
    // `onPoiseBandChanged`, so the read costs nothing.
    const seen = state.bandSeen as PoiseBand | null;
    if (seen && seen !== band) {
      p += POISE_ORDER[band] > POISE_ORDER[seen] ? 0.1 : -0.1;
    }

    // What you have taken. Poise says how the *moment* is going; wounds
    // say how the *fight* has gone, and a fighter cut three times over
    // knows the difference even while their footing is briefly fine.
    for (const w of state.woundsTaken) p += WOUND_PRESSURE[w] ?? 0;

    // Outnumbered, and watching your side fall.
    if (inputs.foes > 1) p += 0.15 * (inputs.foes - 1);
    p += 0.1 * Math.max(0, inputs.alliesDown);

    // Losing to somebody who is themselves in trouble is less
    // frightening than losing to somebody untouched.
    if (inputs.foeBand) p -= 0.08 * (POISE_ORDER[inputs.foeBand] ?? 0);

    // ⭐ The terms. Dying is worse than losing, and a person knows it; a
    // beast does not read terms and this contributes nothing to one.
    if (inputs.lethal && inputs.sentient) p += config.lethalTermsWeight;

    return Math.max(0, p);
  }

  /** Band a pressure value. */
  static forPressure(
    pressure: number,
    config: MoraleConfig = DEFAULT_MORALE_CONFIG,
  ): MoraleBand {
    if (pressure >= config.breakingAt) return "breaking";
    if (pressure >= config.shakenAt) return "shaken";
    return "resolute";
  }

  /** Ascending rank (0 = resolute) — for comparisons and narration. */
  static rank(band: MoraleBand): number {
    return MORALE_BANDS.indexOf(band);
  }
}
