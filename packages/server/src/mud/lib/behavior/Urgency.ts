/**
 * Urgency — **how much a candidate task wants the next beat**, and the
 * sentence that says why.
 *
 * A deliberating agent asks each of its candidate brains one question
 * per beat and gets back one of these. The arbiter then runs exactly one
 * winner. That is the whole of the model: the brain knows what its own
 * work is worth right now (only `nurses` can read a triage rank, only
 * `eats` can read a stomach), and the agent knows it may do one thing.
 *
 * ## The four bands, and why four
 *
 * ⭐ Each rung is a **distinct arbiter behaviour** — that is the test a
 * band vocabulary has to pass, and it is why there is no fifth:
 *
 * | band | what the arbiter does with it |
 * |---|---|
 * | `idle` | not a candidate this beat at all |
 * | `wanted` | runs if nothing outranks it |
 * | `pressing` | beats every `wanted`, whatever KIND it is |
 * | `critical` | beats everything, **preempts a running interruptible task**, and wakes the agent early |
 *
 * Competence has five bands and light has six; neither is a reason to
 * copy a count. Those are estimator thresholds and physical magnitudes.
 * This is a list of things an arbiter does.
 *
 * ## `because` IS the prose
 *
 * ⭐⭐ The reason string is not a debug label — it is the sentence a
 * watching player reads when the agent **changes its mind**, third
 * person with no subject, so the framework can put the actor in front of
 * it: *"glances at the near-empty gin bottle and heads for the cellar"*.
 * There is no second string anywhere. A brain that cannot say why it
 * wants the beat is a brain that should not have asked for it.
 *
 * ⚠ It is emitted **only on a switch**. An agent that keeps doing what it
 * was doing says nothing, which is what makes the line informative when
 * it comes.
 */

/** Ascending — the index IS the rank. */
export const URGENCY_BANDS = [
  "idle",
  "wanted",
  "pressing",
  "critical",
] as const;

export type UrgencyBand = (typeof URGENCY_BANDS)[number];

/**
 * What KIND of thing a brain's act is. Read by the arbiter only to break
 * a tie **within** a band — it is never a priority of its own, because a
 * pressing social beat really should beat a merely wanted meal.
 */
export const TASK_KINDS = [
  "threat",
  "body",
  "work",
  "social",
  "filler",
] as const;

export type TaskKind = (typeof TASK_KINDS)[number];

/**
 * Most-urgent-first, for the within-band tie-break. ⭐ Deliberately NOT
 * alphabetical and NOT the declaration order of `TASK_KINDS`' type — a
 * reader has to be able to see the ordering as an ordering.
 */
export const TASK_KIND_ORDER: readonly TaskKind[] = [
  "threat",
  "body",
  "work",
  "social",
  "filler",
];

/**
 * One candidate's answer for one beat: how much it wants to run, and the
 * sentence a watcher reads if it wins a switch.
 */
export class Urgency {
  readonly band: UrgencyBand;
  readonly because: string;

  constructor(band: UrgencyBand, because: string = "") {
    this.band = band;
    this.because = because;
  }

  // ⚠ No `static idle()` convenience, deliberately. `lint:lib-statics` is
  // a RATCHET at today's count, and a value object earning a public
  // static for tidiness is exactly the growth it exists to stop:
  // `new Urgency("idle")` is the same five characters longer and needs no
  // exemption. The gate caught this on its first run of the wave.

  /** The band's position in `URGENCY_BANDS`; higher wants it more. */
  rank(): number {
    return URGENCY_BANDS.indexOf(this.band);
  }

  /** Is this a candidate at all this beat? */
  isCandidate(): boolean {
    return this.band !== "idle";
  }

  /**
   * ⭐ Does this beat `other`? Band first; ⚠ the kind is consulted **only**
   * when the bands tie, so a pressing dinner never loses to a wanted
   * fight. Equal band and equal kind ⇒ `false`: the caller's hysteresis
   * (keep doing what you were doing) is what breaks a genuine tie, which
   * is the only tie-break that does not read authored order.
   */
  outranks(other: Urgency, kind: TaskKind, otherKind: TaskKind): boolean {
    const mine = this.rank();
    const theirs = other.rank();
    if (mine !== theirs) return mine > theirs;
    const k = TASK_KIND_ORDER.indexOf(kind);
    const ok = TASK_KIND_ORDER.indexOf(otherKind);
    if (k < 0 || ok < 0) return false;
    return k < ok;
  }
}
