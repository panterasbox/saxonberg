/**
 * CombatTerms — the consented rules of a fight (value-object).
 *
 * A combat session carries three orthogonal axes — **lethality**
 * (non-lethal / lethal), **stop-condition** (first-blood / yield /
 * incapacitation / death), and free-text **stakes** — plus the
 * consent/initiation record: who opened the fight, and whether both
 * parties actually agreed to these terms.
 *
 * Terms are consented the way introductions are (see combat-slate): a
 * defender's *standing* combat settings pre-answer the handshake
 * silently; an explicit prompt surfaces **only when terms conflict**
 * (someone brings lethal to your non-lethal). {@link CombatTerms.reconcile}
 * is the pure decision function that classifies a proposed pairing as
 * `agreed` (fold silently) or `conflict` (must prompt) — no Stuff, no
 * I/O, fully unit-testable.
 *
 * The `consented` flag on the resolved terms is what later drives the
 * three-case severity keying (Build 2): a sentient defender who did NOT
 * consent to lethal terms is the attributed-crime path; a consented duel
 * (or a non-sentient cull, where consent is irrelevant) is legitimate.
 */

export const LETHALITIES = ["non-lethal", "lethal"] as const;
export type Lethality = (typeof LETHALITIES)[number];

export const STOP_CONDITIONS = [
  "first-blood",
  "yield",
  "incapacitation",
  "death",
] as const;
export type StopCondition = (typeof STOP_CONDITIONS)[number];

/** Severity ordering of stop-conditions — milder (earlier) is lower. */
const STOP_SEVERITY: Record<StopCondition, number> = {
  "first-blood": 0,
  yield: 1,
  incapacitation: 2,
  death: 3,
};

/**
 * One party's desired terms (from standing settings or an explicit
 * proposal). Free of any initiation/consent context.
 */
export interface TermsProposal {
  lethality: Lethality;
  stopCondition: StopCondition;
  /** Free-text wager; '' when nothing is staked. */
  stakes: string;
}

/** The pure classification of a proposed pairing. */
export type TermsReconciliation =
  | { status: "agreed"; terms: TermsProposal }
  | { status: "conflict"; mine: TermsProposal; theirs: TermsProposal };

/** Neutral default terms — a frictionless bar scuffle. */
export const DEFAULT_TERMS: TermsProposal = {
  lethality: "non-lethal",
  stopCondition: "yield",
  stakes: "",
};

/**
 * Clamp a stop-condition so it can't outrun the lethality: a non-lethal
 * fight never terminates in `death`.
 */
function clampStop(
  lethality: Lethality,
  stop: StopCondition,
): StopCondition {
  if (lethality === "non-lethal" && stop === "death") return "incapacitation";
  return stop;
}

export class CombatTerms {
  constructor(
    /** The durable identifier of the party who opened the fight. */
    readonly initiator: string,
    readonly lethality: Lethality,
    readonly stopCondition: StopCondition,
    readonly stakes: string,
    /**
     * Whether both parties consented to these terms. True for a silent
     * fold and an accepted prompt; false when lethal terms were imposed
     * on a non-consenting sentient (the crime path). Irrelevant — but
     * conventionally true — for a non-sentient target.
     */
    readonly consented: boolean,
  ) {}

  /** Build the agreed terms from a reconciled proposal. */
  static agreed(
    initiator: string,
    terms: TermsProposal,
    consented: boolean,
  ): CombatTerms {
    return new CombatTerms(
      initiator,
      terms.lethality,
      clampStop(terms.lethality, terms.stopCondition),
      terms.stakes,
      consented,
    );
  }

  /** True iff killing is authorized (lethal terms + a death terminus). */
  isLethalAuthorized(): boolean {
    return this.lethality === "lethal";
  }

  /**
   * Classify a proposed pairing. Conflict iff the two sides disagree on
   * lethality (someone brings lethal to a non-lethal fight, or vice
   * versa) — that is the only difference worth a prompt. When they
   * agree on lethality, the fight folds silently at the **milder** of
   * the two stop-conditions (the earliest terminus both parties consent
   * to) with either side's stakes.
   */
  static reconcile(
    mine: TermsProposal,
    theirs: TermsProposal,
  ): TermsReconciliation {
    if (mine.lethality !== theirs.lethality) {
      return { status: "conflict", mine, theirs };
    }
    const stop =
      STOP_SEVERITY[mine.stopCondition] <= STOP_SEVERITY[theirs.stopCondition]
        ? mine.stopCondition
        : theirs.stopCondition;
    return {
      status: "agreed",
      terms: {
        lethality: mine.lethality,
        stopCondition: clampStop(mine.lethality, stop),
        stakes: mine.stakes || theirs.stakes,
      },
    };
  }
}
