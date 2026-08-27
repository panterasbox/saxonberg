/**
 * NavigationApi tests — direction normalization, inversion, offsets.
 *
 * NavigationApi is a pure data table with light helpers; no Stuff or
 * security setup needed. Tests cover all 10 cardinals via each alias,
 * the non-cardinal "not a direction" branch (semantic labels like
 * 'office' / 'out'), and trivia like trim/case-normalization.
 */

import "../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { NavigationApi } from '../navigation';
import { NavigationLogic } from '../../platform/idea/api/NavigationLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';

describe('NavigationApi.normalizeDirection', () => {
  it.each([
    ['north', 'north'],
    ['n', 'north'],
    ['south', 'south'],
    ['s', 'south'],
    ['east', 'east'],
    ['e', 'east'],
    ['west', 'west'],
    ['w', 'west'],
    ['northeast', 'northeast'],
    ['ne', 'northeast'],
    ['northwest', 'northwest'],
    ['nw', 'northwest'],
    ['southeast', 'southeast'],
    ['se', 'southeast'],
    ['southwest', 'southwest'],
    ['sw', 'southwest'],
    ['up', 'up'],
    ['u', 'up'],
    ['down', 'down'],
    ['d', 'down'],
  ])('normalizes %s → %s', (input, expected) => {
    expect(NavigationApi.normalizeDirection(input)).toBe(expected);
  });

  it('is case-insensitive', () => {
    expect(NavigationApi.normalizeDirection('NORTH')).toBe('north');
    expect(NavigationApi.normalizeDirection('Ne')).toBe('northeast');
    expect(NavigationApi.normalizeDirection('SW')).toBe('southwest');
  });

  it('trims whitespace', () => {
    expect(NavigationApi.normalizeDirection('  north  ')).toBe('north');
    expect(NavigationApi.normalizeDirection('\tn\n')).toBe('north');
  });

  it('returns undefined for semantic labels and gibberish', () => {
    expect(NavigationApi.normalizeDirection('office')).toBeUndefined();
    expect(NavigationApi.normalizeDirection('out')).toBeUndefined();
    expect(NavigationApi.normalizeDirection('kitchen')).toBeUndefined();
    expect(NavigationApi.normalizeDirection('nope')).toBeUndefined();
    expect(NavigationApi.normalizeDirection('')).toBeUndefined();
  });
});

describe('NavigationApi.invertDirection', () => {
  it.each([
    ['north', 'south'],
    ['south', 'north'],
    ['east', 'west'],
    ['west', 'east'],
    ['northeast', 'southwest'],
    ['southwest', 'northeast'],
    ['northwest', 'southeast'],
    ['southeast', 'northwest'],
    ['up', 'down'],
    ['down', 'up'],
  ])('inverts %s → %s', (input, expected) => {
    expect(NavigationApi.invertDirection(input)).toBe(expected);
  });

  it('accepts aliases (e.g. n → south)', () => {
    expect(NavigationApi.invertDirection('n')).toBe('south');
    expect(NavigationApi.invertDirection('sw')).toBe('northeast');
    expect(NavigationApi.invertDirection('u')).toBe('down');
  });

  it('returns undefined for non-cardinals', () => {
    expect(NavigationApi.invertDirection('office')).toBeUndefined();
    expect(NavigationApi.invertDirection('out')).toBeUndefined();
    expect(NavigationApi.invertDirection('')).toBeUndefined();
  });

  it('every cardinal inverts to a cardinal that inverts back', () => {
    for (const dir of NavigationApi.cardinalDirections()) {
      const inv = NavigationApi.invertDirection(dir);
      expect(inv).toBeDefined();
      expect(NavigationApi.invertDirection(inv!)).toBe(dir);
    }
  });
});

describe('NavigationApi.directionOffset', () => {
  it('returns [0, 1, 0] for north (y grows north)', () => {
    expect(NavigationApi.directionOffset('north')).toEqual([0, 1, 0]);
  });

  it('returns [0, 0, 1] for up (z grows up)', () => {
    expect(NavigationApi.directionOffset('up')).toEqual([0, 0, 1]);
  });

  it('returns [1, 1, 0] for northeast (combined x+y)', () => {
    expect(NavigationApi.directionOffset('northeast')).toEqual([1, 1, 0]);
  });

  it('inverses produce negated offsets', () => {
    // Normalize -0 → 0 so `toEqual` doesn't choke on signed-zero differences.
    const norm = (n: number) => (n === 0 ? 0 : n);
    for (const dir of NavigationApi.cardinalDirections()) {
      const fwd = NavigationApi.directionOffset(dir)!;
      const back = NavigationApi.directionOffset(
        NavigationApi.invertDirection(dir)!,
      )!;
      expect(back.map(norm)).toEqual([-fwd[0]!, -fwd[1]!, -fwd[2]!].map(norm));
    }
  });

  it('accepts aliases', () => {
    expect(NavigationApi.directionOffset('n')).toEqual([0, 1, 0]);
    expect(NavigationApi.directionOffset('ne')).toEqual([1, 1, 0]);
    expect(NavigationApi.directionOffset('d')).toEqual([0, 0, -1]);
  });

  it('returns undefined for non-cardinals', () => {
    expect(NavigationApi.directionOffset('office')).toBeUndefined();
    expect(NavigationApi.directionOffset('')).toBeUndefined();
  });
});

describe('NavigationApi.isCardinalDirection', () => {
  it('returns true for every canonical name', () => {
    for (const dir of NavigationApi.cardinalDirections()) {
      expect(NavigationApi.isCardinalDirection(dir)).toBe(true);
    }
  });

  it('returns true for aliases', () => {
    for (const alias of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'u', 'd']) {
      expect(NavigationApi.isCardinalDirection(alias)).toBe(true);
    }
  });

  it('returns false for semantic labels and gibberish', () => {
    expect(NavigationApi.isCardinalDirection('office')).toBe(false);
    expect(NavigationApi.isCardinalDirection('out')).toBe(false);
    expect(NavigationApi.isCardinalDirection('north-by-northeast')).toBe(false);
    expect(NavigationApi.isCardinalDirection('')).toBe(false);
  });
});

describe('NavigationApi.cardinalDirections', () => {
  it('lists all 10 canonical cardinals', () => {
    const dirs = NavigationApi.cardinalDirections();
    expect(dirs).toHaveLength(10);
    expect([...dirs].sort()).toEqual(
      [
        'down',
        'east',
        'north',
        'northeast',
        'northwest',
        'south',
        'southeast',
        'southwest',
        'up',
        'west',
      ].sort(),
    );
  });

  it('every entry round-trips through normalizeDirection', () => {
    for (const dir of NavigationApi.cardinalDirections()) {
      expect(NavigationApi.normalizeDirection(dir)).toBe(dir);
    }
  });
});

describe('NavigationLogic singleton encapsulation', () => {
  it('lives at /platform/idea/api/navigation once the facade has materialized it', () => {
    NavigationApi.normalizeDirection('n');
    const logic = StuffApi.findByTemplatePath('/platform/idea/api/navigation');
    expect(logic).toBeDefined();
  });

  it('denies a direct logic-method call from a non-NavigationApi caller', () => {
    NavigationApi.normalizeDirection('n');
    const logic = StuffApi.findByTemplatePath<NavigationLogic>(
      '/platform/idea/api/navigation'
    );
    expect(logic).toBeDefined();
    expect(() => logic!.normalizeDirection('n')).toThrow(SecurityError);
  });
});
