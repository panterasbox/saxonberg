/**
 * LandingContest — **the fight, as pure arithmetic** (fishing D5). No
 * randomness anywhere: the fish's state is three numbers, your two verbs
 * move them, the clock moves them, and the outcome is whichever bound is
 * crossed first. *Poker, not slots.*
 *
 *  - `line` — how much line is out, `1` at the take, landed at `0`;
 *  - `strain` — how hard the line is loaded, the line parts at
 *    `breakStrain`;
 *  - `stamina` — how much fight the fish has left.
 *
 * `reel` takes line in and loads the strain by the fish's remaining
 * fight; `slack` unloads the strain and gives the fish line. Every tick
 * the fish tires by how hard it is being held and pulls by how fresh it
 * is; a line held slack two ticks running lets it throw the hook.
 *
 * The dials are seeded so that **two reels inside one tick at full
 * stamina snap a fighter** and a patient alternation lands one in four
 * to eight ticks — which is the whole lesson: give when it runs, gain
 * when it rests.
 */

export interface ContestDials {
  reelGain: number;
  reelStrain: number;
  slackRelief: number;
  slackRun: number;
  tire: number;
  pull: number;
  breakStrain: number;
  landAt: number;
}

export const CONTEST_DEFAULTS: ContestDials = {
  reelGain: 0.25,
  reelStrain: 0.4,
  slackRelief: 0.4,
  slackRun: 0.08,
  tire: 0.35,
  pull: 0.2,
  breakStrain: 0.9,
  landAt: 0.35,
};

/** A line loaded no harder than this is slack; two ticks of it and the hook is thrown. */
const SLACK_FLOOR = 0.1;

export type ContestOutcome = 'fighting' | 'landed' | 'snapped' | 'thrown';

export class LandingContest {
  /** Line out, `0..1`. */
  public line: number;
  /** Load on the line, `0..1`. */
  public strain: number;
  /** Fight left in the fish, `0..1`. */
  public stamina: number;
  private slackTicks = 0;
  private outcome: ContestOutcome = 'fighting';

  constructor(
    /** The fish's fight, `0..1` — its stamina at the take. */
    fight: number,
    private readonly dials: ContestDials = CONTEST_DEFAULTS,
  ) {
    this.line = 1;
    this.strain = 0.3;
    this.stamina = Math.max(0.05, Math.min(1, fight));
  }

  public getOutcome(): ContestOutcome {
    return this.outcome;
  }

  /** Take line in, and load it by how much fight is left. */
  public reel(): ContestOutcome {
    if (this.outcome !== 'fighting') return this.outcome;
    this.line = Math.max(0, this.line - this.dials.reelGain);
    this.strain = Math.min(1, this.strain + this.dials.reelStrain * this.stamina);
    this.slackTicks = 0;
    return this.settle();
  }

  /** Unload the line, and let the fish run a little. */
  public slack(): ContestOutcome {
    if (this.outcome !== 'fighting') return this.outcome;
    this.strain = Math.max(0, this.strain - this.dials.slackRelief);
    this.line = Math.min(1, this.line + this.dials.slackRun * this.stamina);
    return this.settle();
  }

  /**
   * One game minute: a line found slack is counted (two running and the
   * hook is thrown), then the fish tires by the load and pulls by its
   * freshness.
   */
  public tick(): ContestOutcome {
    if (this.outcome !== 'fighting') return this.outcome;
    if (this.strain <= SLACK_FLOOR) {
      this.slackTicks += 1;
      if (this.slackTicks >= 2) {
        this.outcome = 'thrown';
        return this.outcome;
      }
    } else {
      this.slackTicks = 0;
    }
    this.stamina = Math.max(0, this.stamina - this.dials.tire * this.strain);
    this.strain = Math.min(1, this.strain + this.dials.pull * this.stamina);
    return this.settle();
  }

  private settle(): ContestOutcome {
    if (this.strain >= this.dials.breakStrain) this.outcome = 'snapped';
    else if (this.line <= 0 && this.stamina <= this.dials.landAt) this.outcome = 'landed';
    return this.outcome;
  }
}
