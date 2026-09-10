/**
 * ⭐⭐ The floor and the above-band rule — the two invariants that make
 * "losing costs you something" survivable.
 *
 * ⚠⚠ **This is a bug fix, not a safety rail for a new feature.** The
 * fight engine already mints a `failure` row for the player side on
 * every whiff, at a difficulty derived from the *target's poise band* —
 * so a whiff against an opening opponent writes an **`easy` failure**,
 * which is the maximal-sting case the estimator has (Δθ ≈ −0.22
 * measured). Twenty exchanges of that per fight is a de-ranking machine,
 * and it has been running on the live world. The consequence build
 * retires the per-exchange mint at W3; these two invariants are what make
 * the *per-fight* verdict that replaces it safe to ship at all.
 *
 * Both are properties of the ESTIMATOR, not of any credit site:
 *
 *   - **The floor (D1)** — the surfaced band never falls more than one
 *     rung below the best this history ever warranted. A veteran who
 *     loses is rusty, not reset.
 *   - **The above-band rule (D2)** — a `failure` or `partial` against a
 *     check harder than your band is expected to meet is not evidence
 *     about you. The row is still written; the estimator declines to read
 *     it.
 *
 * ⚠ Neither touches the Transcript. `chronicle` and `transcriptEntries`
 * show every row that was ever appended, before and after.
 */

import { describe, it, expect } from 'vitest';
import { Competence, type Evidence } from '../Competence';
import { CompetenceBand } from '../CompetenceBand';
import { COMPETENCE_BANDS } from '../CompetenceBand';
import type { Difficulty, Outcome } from '../ActSignature';

let clock = 0;
function row(difficulty: Difficulty, outcome: Outcome): Evidence {
  return { difficulty, outcome, when: clock++ };
}
function run(
  difficulty: Difficulty,
  outcome: Outcome,
  n: number,
): Evidence[] {
  return Array.from({ length: n }, () => row(difficulty, outcome));
}

describe('Competence — the floor (D1)', () => {
  it('⭐ a long hard record survives a run of ordinary losses', () => {
    // The measured scenario from the design pass: twenty hard successes
    // then six standard failures. Before the floor this fell all the way
    // to `untrained` — a master swordsman reading as somebody who has
    // never held one.
    clock = 0;
    const peak = Competence.bandOf(run('hard', 'success', 20));
    expect(CompetenceBand.rank(peak)).toBeGreaterThanOrEqual(
      CompetenceBand.rank('proficient'),
    );

    const withLosses = [
      ...run('hard', 'success', 20),
      ...run('standard', 'failure', 6),
    ];
    const after = Competence.bandOf(withLosses);
    expect(CompetenceBand.rank(after)).toBeGreaterThanOrEqual(
      CompetenceBand.rank(CompetenceBand.oneBelow(peak)),
    );
    expect(after).not.toBe('untrained');
  });

  it('the floor is ONE band below best-ever, not best-ever', () => {
    // Rusty, not reset. Losing must still be able to cost you the band
    // you are standing on, or "winning pays" has no counterweight.
    clock = 0;
    const history = [
      ...run('hard', 'success', 20),
      ...run('standard', 'failure', 40),
    ];
    const peak = Competence.bandOf(run('hard', 'success', 20));
    clock = 0;
    const after = Competence.bandOf(history);
    expect(after).toBe(CompetenceBand.oneBelow(peak));
  });

  it('does not lift a history that never earned the band', () => {
    // The floor is a memory of a real peak, never a gift. A record of
    // nothing but easy failures reads exactly as it always did.
    clock = 0;
    expect(Competence.bandOf(run('easy', 'failure', 10))).toBe('untrained');
  });

  it('leaves theta raw — the floor is a property of the SURFACE', () => {
    clock = 0;
    const battered = [
      ...run('hard', 'success', 20),
      ...run('standard', 'failure', 40),
    ];
    const est = Competence.derive(battered);
    // The band is floored…
    expect(est.band).not.toBe('untrained');
    // …and the internal estimate is not, so nothing downstream that
    // re-derives from theta inherits a fiction.
    expect(est.theta).toBeLessThan(
      Competence.derive(run('hard', 'success', 20)).theta,
    );
  });
});

describe('Competence — the above-band rule (D2)', () => {
  it('⭐ being beaten by your betters is not evidence against you', () => {
    // Ten standard successes, then ten formidable failures. Before the
    // rule this read `untrained`: fighting up was strictly punished,
    // which inverts the whole desirable-difficulty design.
    clock = 0;
    const baseline = Competence.bandOf(run('standard', 'success', 10));
    clock = 0;
    const afterLosingUp = Competence.bandOf([
      ...run('standard', 'success', 10),
      ...run('formidable', 'failure', 10),
    ]);
    expect(afterLosingUp).toBe(baseline);
  });

  it('a failure AT your band still costs you', () => {
    // The rule must not become "failure never counts". A competent
    // character failing standard checks is exactly the evidence the
    // estimator should read.
    clock = 0;
    const baseline = Competence.derive(run('standard', 'success', 10));
    clock = 0;
    const after = Competence.derive([
      ...run('standard', 'success', 10),
      ...run('standard', 'failure', 6),
    ]);
    expect(after.theta).toBeLessThan(baseline.theta);
  });

  it('a SUCCESS above your band is kept — that is the point of fighting up', () => {
    clock = 0;
    const baseline = Competence.derive(run('standard', 'success', 4));
    clock = 0;
    const withUpset = Competence.derive([
      ...run('standard', 'success', 4),
      row('formidable', 'success'),
    ]);
    expect(withUpset.theta).toBeGreaterThan(baseline.theta);
  });

  it('the rule re-legislates as the history plays forward', () => {
    // The band compared against is the one the fold has reached AT THAT
    // ROW. A formidable failure that meant nothing to a novice means
    // something once the same character is an expert — so ORDER matters,
    // and the same multiset of rows folds differently.
    clock = 0;
    const lossFirst = Competence.derive([
      row('formidable', 'failure'),
      ...run('formidable', 'success', 6),
    ]);
    clock = 0;
    const lossLast = Competence.derive([
      ...run('formidable', 'success', 6),
      row('formidable', 'failure'),
    ]);
    expect(lossLast.theta).toBeLessThan(lossFirst.theta);
  });

  it('a trivial failure counts against everybody', () => {
    // `trivial` maps to `untrained`, which no band is below, so the rule
    // never excuses fumbling something anyone could do.
    clock = 0;
    const baseline = Competence.derive(run('hard', 'success', 10));
    clock = 0;
    const after = Competence.derive([
      ...run('hard', 'success', 10),
      ...run('trivial', 'failure', 5),
    ]);
    expect(after.theta).toBeLessThan(baseline.theta);
  });
});

describe('Competence — what must NOT have changed', () => {
  it('grinding easy successes still saturates below proficient', () => {
    clock = 0;
    expect(Competence.bandOf(run('easy', 'success', 200))).toBe('competent');
  });

  it('seedRunFor returns a run for every band, unchanged in shape', () => {
    for (const band of COMPETENCE_BANDS) {
      const seed = Competence.seedRunFor(band);
      expect(seed, `no seed run for ${band}`).not.toBeNull();
      // …and folding it back lands exactly on the claimed band, which is
      // the invariant `lint:dossiers` depends on.
      clock = 0;
      const folded = Competence.bandOf(
        run(seed!.difficulty, 'success', seed!.count),
      );
      expect(folded, `seed for ${band} folds to ${folded}`).toBe(band);
    }
  });

  it('one loss against a long winning record is very nearly free', () => {
    clock = 0;
    const before = Competence.derive(run('hard', 'success', 50));
    clock = 0;
    const after = Competence.derive([
      ...run('hard', 'success', 50),
      row('hard', 'failure'),
    ]);
    expect(Math.abs(after.theta - before.theta)).toBeLessThan(0.02);
    expect(after.band).toBe(before.band);
  });
});

describe('CompetenceBand — the arithmetic the two rules need', () => {
  it('lowered floors at untrained and is a no-op at n ≤ 0', () => {
    expect(CompetenceBand.lowered('expert', 2)).toBe('competent');
    expect(CompetenceBand.lowered('novice', 5)).toBe('untrained');
    expect(CompetenceBand.lowered('proficient', 0)).toBe('proficient');
  });

  it('difficultyAgainst maps the rank gap onto the difficulty ladder', () => {
    expect(CompetenceBand.difficultyAgainst('competent', 'competent')).toBe(
      'standard',
    );
    expect(CompetenceBand.difficultyAgainst('novice', 'expert')).toBe(
      'formidable',
    );
    expect(CompetenceBand.difficultyAgainst('expert', 'untrained')).toBe(
      'trivial',
    );
    // Clamped, never off the end.
    expect(CompetenceBand.difficultyAgainst('untrained', 'expert')).toBe(
      'formidable',
    );
  });

  it('bandFor is the identity map onto the five rungs', () => {
    expect(CompetenceBand.bandFor('trivial')).toBe('untrained');
    expect(CompetenceBand.bandFor('standard')).toBe('competent');
    expect(CompetenceBand.bandFor('formidable')).toBe('expert');
  });
});
