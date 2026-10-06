/**
 * ⭐⭐ The aroma reading — **competence resolves DETAIL, never access.**
 *
 * Everyone smells the matter. What differs by band is how much of it you
 * can name, which is the same rule the instrumentation ladder states and
 * the opposite of a gate: there is no band at which a dram becomes
 * unsmellable.
 *
 * Three facts under test, each a decision:
 *
 *   1. **Sub-threshold is invisible to EVERYONE.** A nose does not detect
 *      a compound below its detection threshold and competence does not
 *      change physics. An expert reads nothing where there is nothing to
 *      read.
 *   2. **The untrained nose gets the dominant aroma with no intensity.**
 *      You know it is smoky; you do not know how smoky. That is honestly
 *      what an untrained palate delivers.
 *   3. ⚠ **No digit ever renders.** The amounts are mg/L; the reading is
 *      words. A number in this output would be a gauge, and the no-gauge
 *      reading rules apply.
 */

import { describe, it, expect } from 'vitest';
import { AROMAS, DissolvedAromatics } from '../DissolvedAromatics';

/** `smoke`'s threshold, read from the vocabulary rather than hardcoded. */
const SMOKE = DissolvedAromatics.thresholdFor('smoke') ?? 0;
const OAK = DissolvedAromatics.thresholdFor('oak') ?? 0;

describe('the vocabulary', () => {
  it('is closed, and knows its own members', () => {
    expect(DissolvedAromatics.isAroma('smoke')).toBe(true);
    expect(DissolvedAromatics.isAroma('oak')).toBe(true);
    // ⛔ Not a word. A row naming it must fail at READ, not silently
    // produce matter that never smells of anything.
    expect(DissolvedAromatics.isAroma('tar')).toBe(false);
    expect(DissolvedAromatics.isAroma('')).toBe(false);
  });

  it('gives every member a positive detection threshold', () => {
    expect(AROMAS.length).toBeGreaterThan(0);
    for (const aroma of AROMAS) {
      expect(aroma.thresholdMgL, aroma.type).toBeGreaterThan(0);
    }
  });

  it('has no threshold for a word it does not know', () => {
    expect(DissolvedAromatics.thresholdFor('tar')).toBeNull();
  });
});

describe('DissolvedAromatics.render', () => {
  it('reads nothing when there is nothing over threshold — at ANY band', () => {
    const sub = [{ type: 'smoke', amount: SMOKE * 0.5 }];
    expect(DissolvedAromatics.render(sub, 'untrained')).toBeNull();
    expect(DissolvedAromatics.render(sub, 'competent')).toBeNull();
    // ⭐ The expert too. Competence is detail, not access, and a
    // sub-threshold compound is not detail — it is absent.
    expect(DissolvedAromatics.render(sub, 'expert')).toBeNull();
  });

  it('reads nothing for an empty or absent set', () => {
    expect(DissolvedAromatics.render(undefined, 'expert')).toBeNull();
    expect(DissolvedAromatics.render([], 'expert')).toBeNull();
  });

  it('ignores a word outside the vocabulary rather than rendering it', () => {
    expect(
      DissolvedAromatics.render([{ type: 'tar', amount: 1000 }], 'expert'),
    ).toBeNull();
  });

  it('gives an untrained nose the dominant aroma and NO intensity word', () => {
    const line = DissolvedAromatics.render(
      [
        { type: 'smoke', amount: SMOKE * 20 },
        { type: 'oak', amount: OAK * 2 },
      ],
      'untrained',
    );
    expect(line).toBe('It smells of smoke.');
    // The second aroma is simply not available to this nose.
    expect(line).not.toMatch(/oak/);
    // And no intensity: it does not say HOW smoky.
    expect(line).not.toMatch(/strongly|clearly|faintly/);
  });

  it('gives a novice the same reading as untrained', () => {
    const tags = [{ type: 'smoke', amount: SMOKE * 20 }];
    expect(DissolvedAromatics.render(tags, 'novice')).toBe(
      DissolvedAromatics.render(tags, 'untrained'),
    );
  });

  it('gives a competent nose every aroma over threshold, with intensity', () => {
    const line = DissolvedAromatics.render(
      [
        { type: 'smoke', amount: SMOKE * 20 },
        { type: 'oak', amount: OAK * 4 },
        { type: 'vanilla', amount: (DissolvedAromatics.thresholdFor('vanilla') ?? 0) * 1.5 },
      ],
      'competent',
    );
    expect(line).toMatch(/strongly of smoke/);
    expect(line).toMatch(/clearly of oak/);
    expect(line).toMatch(/faintly of vanilla/);
  });

  it('leads with the strongest aroma, not the authored order', () => {
    const line = DissolvedAromatics.render(
      [
        { type: 'oak', amount: OAK * 1.2 },
        { type: 'smoke', amount: SMOKE * 50 },
      ],
      'competent',
    );
    expect(line?.indexOf('smoke')).toBeLessThan(line?.indexOf('oak') ?? -1);
  });

  it('bands on the MULTIPLE of each threshold, not on raw mg/L', () => {
    // ⭐ The point of per-aroma thresholds. The same absolute figure is
    // "strongly" for a potent compound and below detection for a weak
    // one, which is why a few ppm of phenol reads as heavily peated.
    const amount = SMOKE * 10;
    expect(
      DissolvedAromatics.render([{ type: 'smoke', amount }], 'competent'),
    ).toMatch(/strongly/);
    const weak = AROMAS.reduce((a, b) => (a.thresholdMgL > b.thresholdMgL ? a : b));
    expect(
      DissolvedAromatics.render(
        [{ type: weak.type, amount: weak.thresholdMgL * 0.5 }],
        'competent',
      ),
    ).toBeNull();
  });

  it('⚠ never renders a digit, at any band', () => {
    for (const band of ['untrained', 'novice', 'competent', 'proficient', 'expert'] as const) {
      const line = DissolvedAromatics.render(
        [
          { type: 'smoke', amount: SMOKE * 37.4 },
          { type: 'oak', amount: OAK * 3.2 },
        ],
        band,
      );
      expect(line, band).not.toBeNull();
      expect(line, band).not.toMatch(/[0-9]/);
    }
  });

  it('joins three phrases as ordinary English', () => {
    const line = DissolvedAromatics.render(
      [
        { type: 'smoke', amount: SMOKE * 20 },
        { type: 'oak', amount: OAK * 20 },
        { type: 'char', amount: (DissolvedAromatics.thresholdFor('char') ?? 0) * 20 },
      ],
      'expert',
    );
    expect(line).toMatch(/, .* and /);
    expect(line?.endsWith('.')).toBe(true);
  });
});
