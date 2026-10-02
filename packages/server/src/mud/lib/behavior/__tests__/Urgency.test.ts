/**
 * Urgency — the four bands, and the one tie-break rule that matters:
 * ⭐ **kind is consulted only when the bands tie**, so a pressing dinner
 * never loses to a wanted fight.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import {
  Urgency,
  URGENCY_BANDS,
  TASK_KINDS,
  TASK_KIND_ORDER,
} from '../Urgency';

describe('the vocabularies', () => {
  it('⭐ the band list is ascending, so the index IS the rank', () => {
    expect([...URGENCY_BANDS]).toEqual([
      'idle',
      'wanted',
      'pressing',
      'critical',
    ]);
    expect(new Urgency('idle').rank()).toBe(0);
    expect(new Urgency('critical').rank()).toBe(3);
  });

  it('every kind has a position in the tie-break order', () => {
    for (const k of TASK_KINDS) {
      expect(TASK_KIND_ORDER).toContain(k);
    }
    expect(TASK_KIND_ORDER.length).toBe(TASK_KINDS.length);
  });

  it('`idle` is the only band that is not a candidate', () => {
    expect(new Urgency('idle').isCandidate()).toBe(false);
    for (const b of ['wanted', 'pressing', 'critical'] as const) {
      expect(new Urgency(b, 'because').isCandidate()).toBe(true);
    }
  });
});

describe('outranks', () => {
  it('a higher band wins whatever the kinds are', () => {
    const pressingFiller = new Urgency('pressing', 'x');
    const wantedThreat = new Urgency('wanted', 'y');
    expect(pressingFiller.outranks(wantedThreat, 'filler', 'threat')).toBe(
      true,
    );
    expect(wantedThreat.outranks(pressingFiller, 'threat', 'filler')).toBe(
      false,
    );
  });

  it('⭐⭐ a pressing meal beats a merely wanted fight — the whole reason kind is a tie-break', () => {
    const meal = new Urgency('pressing', 'sets off to find something to eat');
    const fight = new Urgency('wanted', 'eyes the stranger');
    expect(meal.outranks(fight, 'body', 'threat')).toBe(true);
  });

  it('within one band, the kind order decides', () => {
    const a = new Urgency('wanted', 'a');
    const b = new Urgency('wanted', 'b');
    expect(a.outranks(b, 'threat', 'filler')).toBe(true);
    expect(a.outranks(b, 'filler', 'threat')).toBe(false);
    expect(a.outranks(b, 'work', 'social')).toBe(true);
  });

  it('⚠ an exact tie is NOT a win — hysteresis breaks it, never authored order', () => {
    // This is the property that keeps the arbiter from reading declaration
    // order, which is the same defect `resolveMaker` shipped with when it
    // sorted candidates by identity path and served one bartender forever.
    const a = new Urgency('wanted', 'a');
    const b = new Urgency('wanted', 'b');
    expect(a.outranks(b, 'work', 'work')).toBe(false);
    expect(b.outranks(a, 'work', 'work')).toBe(false);
  });
});

describe('because', () => {
  it('⭐⭐ the reason IS the prose — third person, no subject', () => {
    const u = new Urgency(
      'pressing',
      'glances at the near-empty gin bottle and heads for the cellar',
    );
    expect(u.because).not.toMatch(/^(he|she|they|it|I)\b/i);
    expect(u.because[0]).toBe(u.because[0]?.toLowerCase());
  });

  it('`idle` needs no prose, because it is never narrated', () => {
    expect(new Urgency('idle').because).toBe('');
  });
});
