/**
 * `WorldClockApi.durationSeconds` — the clock's own duration grammar,
 * readable. The soak rule's cap (TestHarnessApi) reads a jump's length
 * through it, so the line between a blocking step and a span step is
 * drawn by the SAME parser the jump itself uses — never a second copy.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';

describe('WorldClockApi.durationSeconds', () => {
  it('reads the grammar after() and advance() take', () => {
    expect(WorldClockApi.durationSeconds('90 minutes')).toBe(5_400);
    expect(WorldClockApi.durationSeconds('1.5 days')).toBe(129_600);
    expect(WorldClockApi.durationSeconds('1 day')).toBe(86_400);
    expect(WorldClockApi.durationSeconds('24 hours')).toBe(86_400);
  });

  it('passes a Quantity through', () => {
    expect(WorldClockApi.durationSeconds(Quantity.of(42, 's'))).toBe(42);
  });

  it('refuses what it cannot parse, in the clock\'s words', () => {
    expect(() => WorldClockApi.durationSeconds('next tuesday')).toThrow(
      /cannot parse duration 'next tuesday'/,
    );
  });
});
