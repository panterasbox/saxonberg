/**
 * PathPatternApi tests — verifies the glob subset.
 */

import { describe, it, expect } from 'vitest';
import { PathPatternApi } from '../path-pattern';

describe('PathPatternApi.matches', () => {
  it('matches literals exactly', () => {
    expect(PathPatternApi.matches('mud/api/stuff', 'mud/api/stuff')).toBe(true);
    expect(PathPatternApi.matches('mud/api/stuff', 'mud/api/other')).toBe(false);
  });

  it('* matches a single segment', () => {
    expect(PathPatternApi.matches('mud/api/stuff', 'mud/api/*')).toBe(true);
    expect(PathPatternApi.matches('mud/api/sub/stuff', 'mud/api/*')).toBe(false);
  });

  it('** matches across segments', () => {
    expect(PathPatternApi.matches('mud/api/stuff', 'mud/api/**')).toBe(true);
    expect(PathPatternApi.matches('mud/api/sub/stuff', 'mud/api/**')).toBe(true);
    expect(PathPatternApi.matches('mud/lib/spatial/Door', 'mud/api/**')).toBe(false);
  });

  it('ID with #ExportName matches under ** glob', () => {
    expect(
      PathPatternApi.matches('mud/api/stuff#StuffApi', 'mud/api/**')
    ).toBe(true);
  });

  it('** at end allows empty tail', () => {
    expect(PathPatternApi.matches('mud/api/', 'mud/api/**')).toBe(true);
  });

  it('escapes regex metacharacters in literal segments', () => {
    expect(PathPatternApi.matches('a.b', 'a.b')).toBe(true);
    // The literal `.` should NOT match `_` (which it would as a regex).
    expect(PathPatternApi.matches('a_b', 'a.b')).toBe(false);
  });

  describe('? wildcard', () => {
    it('matches a single character', () => {
      expect(PathPatternApi.matches('foo', 'fo?')).toBe(true);
      expect(PathPatternApi.matches('fox', 'fo?')).toBe(true);
    });

    it('does not cross segment boundaries', () => {
      expect(PathPatternApi.matches('a/b', 'a?b')).toBe(false);
    });

    it('does not match zero characters', () => {
      expect(PathPatternApi.matches('fo', 'fo?')).toBe(false);
    });

    it('combines with literal characters in a segment', () => {
      expect(PathPatternApi.matches('mud/api/stuff', 'mud/?pi/stuff')).toBe(true);
      expect(PathPatternApi.matches('mud/aapi/stuff', 'mud/?pi/stuff')).toBe(false);
    });
  });
});
