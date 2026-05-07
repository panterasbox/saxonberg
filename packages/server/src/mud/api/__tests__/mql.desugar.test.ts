/**
 * MQL desugar tests — article stripping, ordinal rewriting, and the
 * formal-MQL guard.
 */

import { describe, it, expect } from 'vitest';
import { desugar, looksFormal } from '../mql/desugar';

describe('looksFormal', () => {
  it('returns true for queries containing :', () => {
    expect(looksFormal('me:i')).toBe(true);
  });

  it('returns true for queries containing [', () => {
    expect(looksFormal('rose:[5]')).toBe(true);
  });

  it('returns true for queries containing ,', () => {
    expect(looksFormal('a, b')).toBe(true);
  });

  it("returns true for queries containing '", () => {
    expect(looksFormal("'rose'")).toBe(true);
  });

  it('returns false for plain English-like queries', () => {
    expect(looksFormal('the second rose')).toBe(false);
    expect(looksFormal('flower')).toBe(false);
    expect(looksFormal('oak-door')).toBe(false);
  });
});

describe('desugar', () => {
  describe('article stripping', () => {
    it('drops leading the', () => {
      expect(desugar('the rose')).toBe('rose');
    });

    it('drops leading a', () => {
      expect(desugar('a sword')).toBe('sword');
    });

    it('drops leading an', () => {
      expect(desugar('an apple')).toBe('apple');
    });

    it('is case-insensitive', () => {
      expect(desugar('The rose')).toBe('rose');
      expect(desugar('AN apple')).toBe('apple');
    });

    it('drops only the leading article (interior the stays)', () => {
      expect(desugar('a man with the plan')).toBe('man with the plan');
    });

    it('does not drop articles in non-leading positions', () => {
      expect(desugar('flower')).toBe('flower');
    });
  });

  describe('ordinal-word prefix', () => {
    it('rewrites first rose', () => {
      expect(desugar('first rose')).toBe('rose:[1]');
    });

    it('rewrites second rose', () => {
      expect(desugar('second rose')).toBe('rose:[2]');
    });

    it('rewrites tenth rose', () => {
      expect(desugar('tenth rose')).toBe('rose:[10]');
    });

    it('rewrites last rose to negative index', () => {
      expect(desugar('last rose')).toBe('rose:[-1]');
    });

    it('strips article and rewrites ordinal together', () => {
      expect(desugar('the second rose')).toBe('rose:[2]');
    });

    it('preserves multi-word tail', () => {
      expect(desugar('first red rose')).toBe('red rose:[1]');
    });

    it('passes through standalone ordinal as literal keyword', () => {
      // Can't tell what the ordinal indexes into — leave as-is so
      // bareword keyword search applies.
      expect(desugar('second')).toBe('second');
    });

    it('strips article before standalone ordinal', () => {
      expect(desugar('the second')).toBe('second');
    });
  });

  describe('numeric-suffix ordinal prefix', () => {
    it('rewrites 1st rose', () => {
      expect(desugar('1st rose')).toBe('rose:[1]');
    });

    it('rewrites 2nd rose', () => {
      expect(desugar('2nd rose')).toBe('rose:[2]');
    });

    it('rewrites 3rd rose', () => {
      expect(desugar('3rd rose')).toBe('rose:[3]');
    });

    it('rewrites 4th rose', () => {
      expect(desugar('4th rose')).toBe('rose:[4]');
    });

    it('rewrites 100th rose', () => {
      expect(desugar('100th rose')).toBe('rose:[100]');
    });

    it('does not match a plain number', () => {
      // Plain `5 rose` is not a recognized form; pass through.
      expect(desugar('5 rose')).toBe('5 rose');
    });
  });

  describe('formal-MQL guard', () => {
    it('passes through queries containing :', () => {
      expect(desugar('me:i')).toBe('me:i');
    });

    it('passes through queries containing brackets', () => {
      expect(desugar('rose:[5]')).toBe('rose:[5]');
    });

    it('passes through queries containing commas', () => {
      expect(desugar('rose, daisy')).toBe('rose, daisy');
    });

    it("passes through queries containing single quotes", () => {
      expect(desugar("the 'rose'")).toBe("the 'rose'");
    });

    it('does not strip articles when formal-MQL signal is present', () => {
      // Even though `the` is a leading article, the presence of `:`
      // means the author opted out of desugaring.
      expect(desugar('the rose:[1]')).toBe('the rose:[1]');
    });
  });

  describe('edge cases', () => {
    it('returns empty input unchanged', () => {
      expect(desugar('')).toBe('');
    });

    it('returns whitespace-only input unchanged', () => {
      expect(desugar('   ')).toBe('   ');
    });

    it('returns plain bareword unchanged', () => {
      expect(desugar('flower')).toBe('flower');
    });

    it('passes hyphenated words through', () => {
      expect(desugar('oak-door')).toBe('oak-door');
    });

    it('passes hyphenated words through with leading article', () => {
      expect(desugar('the oak-door')).toBe('oak-door');
    });

    it('does not match next as ordinal (deferred per req §9.2)', () => {
      // `next rose` is a punted case — falls through as a regular
      // multi-keyword query.
      expect(desugar('next rose')).toBe('next rose');
    });
  });
});
