/**
 * MQL desugar tests — article stripping, ordinal rewriting, quantity
 * prefix, the formal-MQL guard, and quantity + ordinal collision
 * detection.
 *
 * The post-globbable signature of `desugar` returns
 * `{ rewritten, quantityHint?, error? }`. Most existing assertions
 * only care about the `rewritten` string, so the local `rewrittenOf`
 * helper keeps the spelling tight; quantity-bearing cases assert on
 * the full result shape.
 */

import { describe, it, expect } from 'vitest';
import { desugar, looksFormal } from '../mql/desugar';

function rewrittenOf(input: string): string {
  return desugar(input).rewritten;
}

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

  it('returns true for queries containing { (quantity)', () => {
    expect(looksFormal('coin:{5}')).toBe(true);
  });

  it('returns false for plain English-like queries', () => {
    expect(looksFormal('the second rose')).toBe(false);
    expect(looksFormal('flower')).toBe(false);
    expect(looksFormal('oak-door')).toBe(false);
    expect(looksFormal('5 coins')).toBe(false);
    expect(looksFormal('all coins')).toBe(false);
  });
});

describe('desugar', () => {
  describe('article stripping', () => {
    it('drops leading the', () => {
      expect(rewrittenOf('the rose')).toBe('rose');
    });

    it('drops leading a', () => {
      expect(rewrittenOf('a sword')).toBe('sword');
    });

    it('drops leading an', () => {
      expect(rewrittenOf('an apple')).toBe('apple');
    });

    it('is case-insensitive', () => {
      expect(rewrittenOf('The rose')).toBe('rose');
      expect(rewrittenOf('AN apple')).toBe('apple');
    });

    it('drops only the leading article (interior the stays)', () => {
      expect(rewrittenOf('a man with the plan')).toBe('man with the plan');
    });

    it('does not drop articles in non-leading positions', () => {
      expect(rewrittenOf('flower')).toBe('flower');
    });

    it('returns no quantity hint when only stripping articles', () => {
      expect(desugar('the rose').quantityHint).toBeUndefined();
    });
  });

  describe('ordinal-word prefix', () => {
    it('rewrites first rose', () => {
      expect(rewrittenOf('first rose')).toBe('rose:[1]');
    });

    it('rewrites second rose', () => {
      expect(rewrittenOf('second rose')).toBe('rose:[2]');
    });

    it('rewrites tenth rose', () => {
      expect(rewrittenOf('tenth rose')).toBe('rose:[10]');
    });

    it('rewrites last rose to negative index', () => {
      expect(rewrittenOf('last rose')).toBe('rose:[-1]');
    });

    it('strips article and rewrites ordinal together', () => {
      expect(rewrittenOf('the second rose')).toBe('rose:[2]');
    });

    it('preserves multi-word tail', () => {
      expect(rewrittenOf('first red rose')).toBe('red rose:[1]');
    });

    it('passes through standalone ordinal as literal keyword', () => {
      // Can't tell what the ordinal indexes into — leave as-is so
      // bareword keyword search applies.
      expect(rewrittenOf('second')).toBe('second');
    });

    it('strips article before standalone ordinal', () => {
      expect(rewrittenOf('the second')).toBe('second');
    });

    it('returns no quantity hint when only rewriting ordinals', () => {
      expect(desugar('second rose').quantityHint).toBeUndefined();
    });
  });

  describe('numeric-suffix ordinal prefix', () => {
    it('rewrites 1st rose', () => {
      expect(rewrittenOf('1st rose')).toBe('rose:[1]');
    });

    it('rewrites 2nd rose', () => {
      expect(rewrittenOf('2nd rose')).toBe('rose:[2]');
    });

    it('rewrites 3rd rose', () => {
      expect(rewrittenOf('3rd rose')).toBe('rose:[3]');
    });

    it('rewrites 4th rose', () => {
      expect(rewrittenOf('4th rose')).toBe('rose:[4]');
    });

    it('rewrites 100th rose', () => {
      expect(rewrittenOf('100th rose')).toBe('rose:[100]');
    });
  });

  describe('quantity prefix', () => {
    it('captures a leading positive integer as a lenient count hint', () => {
      const r = desugar('5 coins');
      expect(r.rewritten).toBe('coins');
      expect(r.quantityHint).toEqual({
        value: { kind: 'count', n: 5 },
        mode: 'lenient',
      });
    });

    it('captures the literal "all" as a lenient all hint', () => {
      const r = desugar('all coins');
      expect(r.rewritten).toBe('coins');
      expect(r.quantityHint).toEqual({
        value: { kind: 'all' },
        mode: 'lenient',
      });
    });

    it('strips a leading article before capturing the quantity', () => {
      // `the 5 coins` should still pull out the quantity.
      const r = desugar('the 5 coins');
      expect(r.rewritten).toBe('coins');
      expect(r.quantityHint?.value).toEqual({ kind: 'count', n: 5 });
    });

    it('preserves a multi-word tail', () => {
      const r = desugar('2 red roses');
      expect(r.rewritten).toBe('red roses');
      expect(r.quantityHint?.value).toEqual({ kind: 'count', n: 2 });
    });

    it('does not consume a standalone count (no following token)', () => {
      // `5` alone has no following keyword — fall through unchanged.
      const r = desugar('5');
      expect(r.rewritten).toBe('5');
      expect(r.quantityHint).toBeUndefined();
    });

    it('does not consume a standalone "all"', () => {
      const r = desugar('all');
      expect(r.rewritten).toBe('all');
      expect(r.quantityHint).toBeUndefined();
    });
  });

  describe('quantity + ordinal collision', () => {
    it('rejects "3 2nd roses" with a rephrase guidance error', () => {
      const r = desugar('3 2nd roses');
      expect(r.error).toMatch(/ambiguous/);
      expect(r.error).toMatch(/range/);
      expect(r.rewritten).toBe('3 2nd roses');
      expect(r.quantityHint).toBeUndefined();
    });

    it('rejects "2nd 3 roses" with a rephrase guidance error', () => {
      const r = desugar('2nd 3 roses');
      expect(r.error).toMatch(/ambiguous/);
      expect(r.rewritten).toBe('2nd 3 roses');
      expect(r.quantityHint).toBeUndefined();
    });

    it('rejects "all 2nd roses"', () => {
      const r = desugar('all 2nd roses');
      expect(r.error).toMatch(/ambiguous/);
    });

    it('rejects "second 3 roses" (word ordinal + count)', () => {
      const r = desugar('second 3 roses');
      expect(r.error).toMatch(/ambiguous/);
    });

    it('plain ordinal still works in isolation', () => {
      expect(rewrittenOf('2nd rose')).toBe('rose:[2]');
    });

    it('plain count still works in isolation', () => {
      expect(rewrittenOf('2 roses')).toBe('roses');
    });
  });

  describe('formal-MQL guard', () => {
    it('passes through queries containing :', () => {
      expect(rewrittenOf('me:i')).toBe('me:i');
    });

    it('passes through queries containing brackets', () => {
      expect(rewrittenOf('rose:[5]')).toBe('rose:[5]');
    });

    it('passes through queries containing commas', () => {
      expect(rewrittenOf('rose, daisy')).toBe('rose, daisy');
    });

    it("passes through queries containing single quotes", () => {
      expect(rewrittenOf("the 'rose'")).toBe("the 'rose'");
    });

    it('passes through queries containing { (quantity)', () => {
      // The presence of `{` flips `looksFormal`, so `5 coin:{5}` falls
      // through unchanged. Composer-tier input always wins over the
      // natural-language rewrite.
      expect(rewrittenOf('coin:{5}')).toBe('coin:{5}');
    });

    it('does not strip articles when formal-MQL signal is present', () => {
      // Even though `the` is a leading article, the presence of `:`
      // means the author opted out of desugaring.
      expect(rewrittenOf('the rose:[1]')).toBe('the rose:[1]');
    });
  });

  describe('edge cases', () => {
    it('returns empty input unchanged', () => {
      expect(rewrittenOf('')).toBe('');
    });

    it('returns whitespace-only input unchanged', () => {
      expect(rewrittenOf('   ')).toBe('   ');
    });

    it('returns plain bareword unchanged', () => {
      expect(rewrittenOf('flower')).toBe('flower');
    });

    it('passes hyphenated words through', () => {
      expect(rewrittenOf('oak-door')).toBe('oak-door');
    });

    it('passes hyphenated words through with leading article', () => {
      expect(rewrittenOf('the oak-door')).toBe('oak-door');
    });

    it('does not match next as ordinal (deferred per req §9.2)', () => {
      // `next rose` is a punted case — falls through as a regular
      // multi-keyword query.
      expect(rewrittenOf('next rose')).toBe('next rose');
    });
  });
});
