/**
 * scoreCandidate — the whole-word tier (fishing B8). A query word that
 * is a WORD of the name beats one that is merely a substring of it:
 * `net` finds "a net" over "a keepnet", `edge` finds "the river's edge"
 * over "a ledger rod". Before this tier both scored 50 and the tie fell
 * to pool order, so `haul net` with a keepnet in hand hauled the keepnet.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { scoreCandidate } from '../scope-walk';
import type { ScopeCandidate } from '../scope-walk';

const cand = (name: string, keywords: string[] = []): ScopeCandidate =>
  ({ stuff: {} as never, name, keywords }) as ScopeCandidate;

describe('scoreCandidate — whole words beat substrings', () => {
  it('⭐ `net`: "a net" (a whole word, 60) over "a keepnet" (a substring, 50)', () => {
    expect(scoreCandidate(cand('a net'), ['net'])).toBe(60);
    expect(scoreCandidate(cand('a keepnet'), ['net'])).toBe(50);
  });

  it('⭐ `edge`: "the river\'s edge" over "a ledger rod"', () => {
    expect(scoreCandidate(cand("the river's edge"), ['edge'])).toBeGreaterThan(scoreCandidate(cand('a ledger rod'), ['edge']));
  });

  it('an exact single-word name is still the top (100); every query word must be a whole word for 60', () => {
    expect(scoreCandidate(cand('net'), ['net'])).toBe(100);
    expect(scoreCandidate(cand('a cane rod'), ['cane', 'rod'])).toBe(60);
    expect(scoreCandidate(cand('a cane rod'), ['can', 'rod'])).toBe(50);
  });

  it('three rods still tie on `rod` — which is the prompt, and correct', () => {
    const rods = ['a cane rod', 'a float rod', 'a leger rod'].map((n) => scoreCandidate(cand(n), ['rod']));
    expect(new Set(rods).size).toBe(1);
  });
});
