/**
 * Poise — the fast, session-scoped, banded tactical gauge (value-object).
 *
 * Poise is the **one genuinely-new subsystem** of the combat cycle. Each
 * combatant carries a single poise gauge for the life of a fight; it is
 * the tactical contest that sits *above* the slow vitals/trauma layer. It
 * lives on the session, never on the `Creature`, and evaporates at
 * session end.
 *
 * The model (combat-slate + requirements):
 *
 *   - Base autocombat **erodes** both sides every exchange.
 *   - Committing a gambit **spends** the actor's own poise (overextend) —
 *     aggression has a price.
 *   - A break (poise crossing the floor) opens a **binary, timed
 *     window**: the combatant is `open`, exploitable for a bounded number
 *     of ticks, after which — unexploited — it lapses and poise recovers.
 *   - Exploiting an opening is cheap; **defensive/reactive** play
 *     **restores** poise, but recovery is **capped by endurance** (a
 *     gassed fighter can't buy poise back).
 *
 * **Bands, not numbers** is enforced at the surface: the raw scalar is
 * `private`, and the only readout is {@link Poise.band} (the
 * `steady | pressed | reeling | broken | open` vocabulary) plus the
 * binary {@link Poise.isOpen}. The magnitudes of erode/spend/restore and
 * the band thresholds are supplied by the caller (the session, from
 * `combat.*` AppSettings) so this class stays a pure, tunable state
 * machine with no I/O — unit-testable without booting settings.
 */

/**
 * The poise readout vocabulary. `open` supersedes `broken` while an
 * exploitable window is live — it is the "earned crit" state a gambit
 * cashes in.
 */
export const POISE_BANDS = [
  "steady",
  "pressed",
  "reeling",
  "broken",
  "open",
] as const;
export type PoiseBand = (typeof POISE_BANDS)[number];

/**
 * Band thresholds + window length. All fractions of the 0..1 gauge;
 * defaults are sane literals (the `response.*` seeded-literal-fallback
 * precedent) so the class works standalone, but the session overrides
 * them from `combat.*` AppSettings.
 */
export interface PoiseConfig {
  /** Below this, poise reads `pressed`. */
  pressedBelow: number;
  /** Below this, poise reads `reeling`. */
  reelingBelow: number;
  /** At/below this, poise **breaks** and an opening is armed. */
  brokenAt: number;
  /** How many ticks an unexploited opening stays live. */
  openingTicks: number;
}

export const DEFAULT_POISE_CONFIG: PoiseConfig = {
  pressedBelow: 0.75,
  reelingBelow: 0.5,
  brokenAt: 0.25,
  openingTicks: 2,
};

/** The armed-opening record — binary, with a tick deadline. */
interface Opening {
  open: boolean;
  expiresAtTick: number;
}

export class Poise {
  /**
   * The raw gauge in [0,1], 1 = fully steady. Private: the whole point
   * of the bands-not-numbers doctrine is that nothing outside reads this.
   */
  private value = 1;

  private opening: Opening = { open: false, expiresAtTick: 0 };

  constructor(private readonly config: PoiseConfig = DEFAULT_POISE_CONFIG) {}

  /* ─────────────────────────── readouts ─────────────────────────── */

  /**
   * The banded readout. `open` while a live exploitable window is
   * armed; otherwise the gauge's band.
   */
  band(): PoiseBand {
    if (this.opening.open) return "open";
    if (this.value <= this.config.brokenAt) return "broken";
    if (this.value < this.config.reelingBelow) return "reeling";
    if (this.value < this.config.pressedBelow) return "pressed";
    return "steady";
  }

  /** True while an exploitable opening window is live. */
  isOpen(): boolean {
    return this.opening.open;
  }

  /** Whether the gauge is at/below the break floor (window aside). */
  isBroken(): boolean {
    return this.value <= this.config.brokenAt;
  }

  /* ───────────────────────── mutations ───────────────────────── */

  /**
   * Base per-exchange erosion (both sides). Arms an opening if this
   * crosses the break floor. `currentTick` stamps the window deadline.
   */
  erode(amount: number, currentTick: number): void {
    this.lower(amount, currentTick);
  }

  /**
   * Overextend: committing a gambit spends the actor's own poise. Same
   * lowering path as erosion — aggression can break you.
   */
  spend(amount: number, currentTick: number): void {
    this.lower(amount, currentTick);
  }

  /**
   * Defensive/reactive recovery, **capped by endurance**. `enduranceRatio`
   * in [0,1] is the ceiling: a fully-gassed fighter (ratio 0) buys
   * nothing back; a fresh one can climb to full. Recovering above the
   * break floor disarms any live opening.
   */
  restore(amount: number, enduranceRatio: number): void {
    const ceiling = clamp01(enduranceRatio);
    if (this.value >= ceiling) return;
    this.value = Math.min(ceiling, this.value + Math.max(0, amount));
    if (this.value > this.config.brokenAt) {
      this.opening.open = false;
    }
  }

  /**
   * Advance the opening clock. Called once per tick by the session; an
   * unexploited window past its deadline lapses (and the combatant is no
   * longer `open`, though still `broken` until it recovers).
   */
  tick(currentTick: number): void {
    if (this.opening.open && currentTick >= this.opening.expiresAtTick) {
      this.opening.open = false;
    }
  }

  /**
   * Cash in an opening — the session calls this when a gambit exploits
   * the window, so it can't be double-spent. Returns whether a window
   * was live to consume.
   */
  consumeOpening(): boolean {
    if (!this.opening.open) return false;
    this.opening.open = false;
    return true;
  }

  private lower(amount: number, currentTick: number): void {
    const before = this.value;
    this.value = clamp01(this.value - Math.max(0, amount));
    // Arm a fresh opening only on the *crossing* into broken, not on
    // every erode while already broken — a break is one earned window.
    if (before > this.config.brokenAt && this.value <= this.config.brokenAt) {
      this.opening = {
        open: true,
        expiresAtTick: currentTick + this.config.openingTicks,
      };
    }
  }
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
