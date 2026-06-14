import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ArrayApi } from '../array';
import { StuffApi } from '../stuff';
import { SecurityError } from '../../lib/security/errors';
import type { ArrayLogic } from '../../obj/api/ArrayLogic';

describe('ArrayApi.equal', () => {
  it('returns true for the same array reference', () => {
    const a = ['a', 'b', 'c'];
    expect(ArrayApi.equal(a, a)).toBe(true);
  });

  it('returns true for two empty arrays', () => {
    expect(ArrayApi.equal([], [])).toBe(true);
  });

  it('returns true for element-wise equal arrays of strings', () => {
    expect(ArrayApi.equal(['a', 'b'], ['a', 'b'])).toBe(true);
  });

  it('returns false on length mismatch', () => {
    expect(ArrayApi.equal(['a'], ['a', 'b'])).toBe(false);
    expect(ArrayApi.equal(['a', 'b'], ['a'])).toBe(false);
  });

  it('returns false on element mismatch', () => {
    expect(ArrayApi.equal(['a', 'b'], ['a', 'c'])).toBe(false);
  });

  it('works on number arrays', () => {
    expect(ArrayApi.equal([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(ArrayApi.equal([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  it('compares objects by reference identity (===)', () => {
    const x = { v: 1 };
    const y = { v: 1 };
    expect(ArrayApi.equal([x], [x])).toBe(true);
    expect(ArrayApi.equal([x], [y])).toBe(false);
  });
});

describe('ArrayApi.isPrefix', () => {
  it('returns true for an empty prefix against any array', () => {
    expect(ArrayApi.isPrefix([], [])).toBe(true);
    expect(ArrayApi.isPrefix([], ['a', 'b'])).toBe(true);
  });

  it('returns true when the prefix matches the leading slice', () => {
    expect(ArrayApi.isPrefix(['a'], ['a', 'b', 'c'])).toBe(true);
    expect(ArrayApi.isPrefix(['a', 'b'], ['a', 'b', 'c'])).toBe(true);
  });

  it('returns true for a sequence-is-prefix-of-itself', () => {
    expect(ArrayApi.isPrefix(['a', 'b'], ['a', 'b'])).toBe(true);
  });

  it('returns false when the prefix is longer than the full array', () => {
    expect(ArrayApi.isPrefix(['a', 'b'], ['a'])).toBe(false);
  });

  it('returns false on a leading-element mismatch', () => {
    expect(ArrayApi.isPrefix(['x'], ['a', 'b'])).toBe(false);
  });

  it('works on number arrays', () => {
    expect(ArrayApi.isPrefix([1, 2], [1, 2, 3])).toBe(true);
    expect(ArrayApi.isPrefix([1, 3], [1, 2, 3])).toBe(false);
  });
});

describe('ArrayLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('lives at /obj/api/array once the facade has materialized it', () => {
    ArrayApi.equal([], []);
    const logic = StuffApi.findByTemplatePath('/obj/api/array');
    expect(logic).toBeDefined();
    expect(StuffApi.findByPathGlob('/obj/api/*')).toContain(logic);
  });

  it('denies a direct logic-method call from a non-ArrayApi caller', () => {
    ArrayApi.equal([], []);
    const logic = StuffApi.findByTemplatePath<ArrayLogic>('/obj/api/array');
    expect(logic).toBeDefined();
    // The test module is not `mud/api/array#ArrayApi`, so the FromModule
    // gate on the logic's own methods denies the call.
    expect(() => logic!.equal([], [])).toThrow(SecurityError);
  });
});
