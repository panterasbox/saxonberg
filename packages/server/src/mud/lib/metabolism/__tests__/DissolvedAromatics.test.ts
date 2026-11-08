/**
 * ⭐⭐ The aroma reading — **competence resolves DETAIL, never access.**
 *
 * Everyone smells the matter. What differs by band is how much of it you
 * can name, which is the same rule the instrumentation ladder states and
 * the opposite of a gate: there is no band at which a dram becomes
 * unsmellable.
 *
 * Three facts under test, each a decision:
 *
 *   1. **Sub-threshold is invisible to EVERYONE.** A nose does not detect
 *      a compound below its detection threshold and competence does not
 *      change physics. An expert reads nothing where there is nothing to
 *      read.
 *   2. **The untrained nose gets the dominant aroma with no intensity.**
 *      You know it is smoky; you do not know how smoky. That is honestly
 *      what an untrained palate delivers.
 *   3. ⚠ **No digit ever renders.** The amounts are mg/L; the reading is
 *      words. A number in this output would be a gauge, and the no-gauge
 *      reading rules apply.
 */

import '../../../../test-bootstrap';
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { DissolvedAromatics } from '../DissolvedAromatics';
import { installAromas, aromaPath } from '../../perception/__tests__/aroma-fixtures';
import { seedKernelContentStore } from '../../security/__tests__/test-setup';
import { StuffApi } from '../../../api/stuff';

/** `smoke`'s threshold, read from the vocabulary rather than hardcoded. */
const SMOKE = 0.02;
const OAK = 0.07;

beforeEach(() => {
  seedKernelContentStore();
  installAromas([
    { word: 'smoke', threshold: SMOKE },
    { word: 'oak', threshold: OAK },
    { word: 'grain', threshold: 1 },
    { word: 'vanilla', threshold: 0.1 },
  ]);
});
afterEach(() => StuffApi.clearAll());

describe('the aromas', () => {
  it('an aroma is named by its path', () => {
    expect(DissolvedAromatics.isAromaPath(aromaPath('peat-smoke'))).toBe(true);
    expect(DissolvedAromatics.isAromaPath('peat-smoke')).toBe(false);
    expect(DissolvedAromatics.isAromaPath('/base-library/aromas/Peat Smoke')).toBe(false);
    expect(DissolvedAromatics.isAromaPath('')).toBe(false);
  });

  it('reads a threshold off the document', () => {
    expect(DissolvedAromatics.thresholdFor(aromaPath('smoke'))).toBe(SMOKE);
  });
});
