/**
 * check-idle-cadence — the ratchet's invariant, and the trigger parser
 * the gate shares with the engine.
 *
 * ⭐⭐ **The test asserts the INVARIANT, never the number.** A ratchet
 * whose test pins its count makes the one thing it exists to permit — a
 * lowering — into a failing test.
 */

import '../../src/test-bootstrap';
import { describe, it, expect } from 'vitest';
import {
  IDLE_CADENCE_CEILING_PER_MIN,
  IDLE_CADENCE_HIGH_WATER,
  cadenceMs,
} from '../check-idle-cadence';

describe('the ratchet', () => {
  it('⭐ holds a ceiling that may fall and may never rise', () => {
    expect(IDLE_CADENCE_CEILING_PER_MIN).toBeLessThanOrEqual(
      IDLE_CADENCE_HIGH_WATER,
    );
    expect(IDLE_CADENCE_CEILING_PER_MIN).toBeGreaterThan(0);
  });

  it('⚠ and the high-water mark is a fact about the past — never edit it down', () => {
    expect(IDLE_CADENCE_HIGH_WATER).toBe(263.2);
  });
});

describe('cadenceMs — the same words the engine parses', () => {
  it('reads every unit the engine accepts', () => {
    expect(cadenceMs('cadence:30s')).toBe(30_000);
    expect(cadenceMs('cadence:30')).toBe(30_000); // bare ⇒ seconds
    expect(cadenceMs('cadence:500ms')).toBe(500);
    expect(cadenceMs('cadence:4m')).toBe(240_000);
  });

  it('⚠ refuses what is not a cadence, so the other triggers reach their own arm', () => {
    expect(cadenceMs('candidate')).toBeNull();
    expect(cadenceMs('arrival')).toBeNull();
    expect(cadenceMs('engage')).toBeNull();
  });

  it('⚠⚠ a POSITIVE finding: a spec with no trigger is not a cadence', () => {
    // The gate's first run found FIVE shipped specs with no `trigger:` at
    // all — `_parseTrigger(undefined)` throws, the spec is skipped with a
    // warning, and three Cast rows had never run those brains. The gate
    // must see an absent trigger as a finding and not as zero cost.
    expect(cadenceMs('')).toBeNull();
    expect(cadenceMs('cadence:')).toBeNull();
    expect(cadenceMs('cadence:0s')).toBeNull();
  });
});
