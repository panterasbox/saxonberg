/**
 * The dossier seeder — an authored history becomes evidence, once.
 *
 * ⭐ **D4, proved rather than asserted.** A competence claim is *seeded
 * evidence*, never a declared floor: the seeder appends `claim` rows
 * until the shipped estimator DERIVES the asserted band, so `bandOf`
 * stays a pure derivation and re-legislating it re-scores the seeds along
 * with everything else.
 *
 * ⚠⚠ Which is why the run is searched and not tabulated. Measured against
 * the shipped constants a run of `easy` successes saturates below
 * `proficient` — it can never reach it, however many you write — so a
 * fixed-difficulty ladder would have silently produced a character who
 * asserts `expert` and reads `competent`, with nothing anywhere to say
 * so. That is the exact failure `lint:dossiers` exists to catch, and this
 * is the half that stops it happening in the first place.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { Competence } from '../Competence';
import { COMPETENCE_BANDS } from '../CompetenceBand';
import type { Difficulty } from '../ActSignature';

function fold(difficulty: Difficulty, count: number): string {
  return Competence.bandOf(
    Array.from({ length: count }, () => ({
      difficulty,
      outcome: 'success' as const,
      when: null,
    })),
  );
}

describe('seedRunFor — an asserted band becomes evidence that derives it', () => {
  it('every band in the vocabulary is reachable', () => {
    for (const band of COMPETENCE_BANDS) {
      const run = Competence.seedRunFor(band);
      expect(run, band).not.toBeNull();
      expect(fold(run!.difficulty, run!.count), band).toBe(band);
    }
  });

  it('prefers the gentlest difficulty that honestly warrants the claim', () => {
    // A competent bartender has worked a great many ordinary shifts.
    expect(Competence.seedRunFor('competent')!.difficulty).toBe('easy');
  });

  it('⭐ you do not become an expert by doing ordinary things very often', () => {
    // Not a rule anybody wrote — the estimator's desirable-difficulty
    // design showing through. `easy` evidence saturates below
    // `proficient`, so the search is forced upward.
    expect(fold('easy', 40)).toBe('competent');
    expect(Competence.seedRunFor('expert')!.difficulty).toBe('hard');
  });

  it('the floor band needs no evidence at all', () => {
    expect(Competence.seedRunFor('untrained')!.count).toBe(0);
  });
});
