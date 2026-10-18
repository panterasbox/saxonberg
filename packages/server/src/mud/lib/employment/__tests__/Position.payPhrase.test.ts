/**
 * What a seat PAYS, in words, by its basis — the help-wanted sign and
 * `clock on` both say it. ⚠ They read `wageRate` alone before, so the
 * cobbler's piece-rate seat advertised "4 zorkmids a game-hour" for work
 * paid by the pair (the repair build's browser walk).
 */
import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { Position } from '../Position';

describe('Position.payPhrase', () => {
  it('a time seat pays by the game-hour', () => {
    const p = Position.of({ key: 'clerk', label: 'clerk', wageRate: 4 });
    expect(p.payPhrase()).toMatch(/^4 \S+ a game-hour$/);
  });

  it('⭐ a piece-rate seat pays by the piece — never by the hour, whatever its wageRate', () => {
    const p = Position.of({
      key: 'cobbler',
      label: 'at the last',
      wageRate: 4,
      compensation: { basis: 'per-settlement', rate: 4 },
    });
    expect(p.payPhrase()).toMatch(/^4 \S+ a piece$/);
    expect(p.payPhrase()).not.toMatch(/hour/);
  });

  it('a share seat says its share', () => {
    const p = Position.of({
      key: 'broker',
      label: 'broker',
      wageRate: 0,
      compensation: { basis: 'share-of-flow', share: 0.1 },
    });
    expect(p.payPhrase()).toBe('a 10% share');
  });

  it('a seat that pays nothing says nothing', () => {
    expect(Position.of({ key: 'x', label: 'x', wageRate: 0 }).payPhrase()).toBe('');
  });
});
