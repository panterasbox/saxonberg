/**
 * StreamController duration-parsing tests.
 *
 * `parseDurationMs` is a private static (host-internal); tests reach it
 * via a deliberate cast seam — the parsing edge cases are the bug-prone
 * part of the controller and worth locking down directly, without
 * standing up the full command-dispatch pipeline.
 */

import { describe, it, expect } from 'vitest';
import StreamController from '../StreamController';

const parse = (
  StreamController as unknown as {
    parseDurationMs(input: string): number | null;
  }
).parseDurationMs;

describe('StreamController.parseDurationMs', () => {
  it('parses single units', () => {
    expect(parse('90s')).toBe(90_000);
    expect(parse('15m')).toBe(15 * 60_000);
    expect(parse('1h')).toBe(3_600_000);
    expect(parse('2d')).toBe(2 * 86_400_000);
  });

  it('sums a chain of segments', () => {
    expect(parse('1h30m')).toBe(90 * 60_000);
    expect(parse('2h15m30s')).toBe((2 * 3600 + 15 * 60 + 30) * 1000);
  });

  it('treats a bare number as minutes', () => {
    expect(parse('15')).toBe(15 * 60_000);
  });

  it('tolerates whitespace and case', () => {
    expect(parse('  1H 30M ')).toBe(90 * 60_000);
  });

  it('rejects junk', () => {
    expect(parse('')).toBeNull();
    expect(parse('15x')).toBeNull();
    expect(parse('1h?')).toBeNull();
    expect(parse('abc')).toBeNull();
  });
});
