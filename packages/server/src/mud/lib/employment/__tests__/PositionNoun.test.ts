/**
 * `Position.noun` and `Employed.getPositionNoun()` — the handle chain's
 * second rung.
 *
 * ⭐⭐ **The point is that it FOLLOWS the job.** A handle retyped onto the
 * NPC goes stale the moment they are dismissed — which is why a sacked
 * weaver still reads *"a weaver"* today. A handle read off the position
 * they currently hold cannot.
 *
 * ⚠ And it is a SECOND field rather than a transform of `label`, because
 * every shipped label is a gerund (*"tending bar"*, *"on the road"*,
 * *"sitting as Magistrate of Terminus"* — 40 rows, no exceptions) and
 * there is no honest gerund-to-noun transform. The requirements' *"drop
 * an NPC into a bakery and they are a baker — nobody typed that"* is
 * very nearly true: **the bakery's author typed it once**, on the job,
 * and every holder gets it free forever.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { Position } from '../Position';

describe('Position.noun round-trips', () => {
  it('survives serialize → fromData', () => {
    const p = Position.of({
      key: 'bartender',
      label: 'tending bar',
      wageRate: 4,
      confers: [],
      noun: 'bartender',
    });
    expect(p.noun).toBe('bartender');
    expect(Position.fromData(p.serialize()).noun).toBe('bartender');
  });

  it('⭐ absent stays ABSENT — never materialized to an empty string', () => {
    // `serialize` must round-trip a legacy blob byte-identically, which
    // is the same contract `compensation` carries.
    const p = Position.of({
      key: 'vionne',
      label: 'running Vionne',
      wageRate: 0,
      confers: [],
    });
    expect(p.noun).toBeUndefined();
    expect('noun' in p.serialize()).toBe(false);
  });

  it('an empty authored string reads as absent', () => {
    expect(Position.fromData({ key: 'x', label: 'y', noun: '' }).noun).toBeUndefined();
  });

  it('⚠ the label is NOT a fallback — a gerund is not a noun', () => {
    // "tending bar" does not contain "bartender", and a transform that
    // guessed would be wrong for all 40 shipped labels.
    const p = Position.fromData({ key: 'bartender', label: 'tending bar' });
    expect(p.noun).toBeUndefined();
  });

  it('⚠ the key is NOT a fallback either — half of them are firm names', () => {
    // `vionne`, `hollis`, `goodkin` are identifiers. Nobody is "a vionne".
    const p = Position.fromData({ key: 'vionne', label: 'running Vionne' });
    expect(p.noun).toBeUndefined();
  });
});
