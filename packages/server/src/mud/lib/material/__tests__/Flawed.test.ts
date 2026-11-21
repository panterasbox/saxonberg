/**
 * ⭐⭐ FlawedMixin — the flaw RECORD and the ONE hole rule (matter-model-
 * overlaps D4, D5): `flaws.leak.<kind>LPerHour × √head × scale`, asked at a
 * vessel's scale (its liquid's depth, a scale of one), a boat's and a ship's
 * (her draft, her length). The two dials are pinned against the shipped
 * hulls: the rowboat stays bailable by one bucket, the Hesper near her
 * shipped hole.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import Good from '../../stuff/Good';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';
import { WorldClockApi } from '../../../api/worldclock';

/** One bucketful a spell by hand: 10 L in 20 s (`bail`, pump.md § The bucket). */
const BUCKET_LPS = 10 / 20;
/** What the Hesper's hole let in before (`ship.leak.holed` 0.25 L/s/m × 30 m). */
const HESPER_SHIPPED_LPS = 0.25 * 30;

describe('⭐⭐ FlawedMixin — the flaw record and the one hole rule', () => {
  beforeEach(() => {
    WorldClockApi._setNowProviderForTesting(() => 1_000_000);
  });

  it('every article carries it, through Integrity', () => {
    const g = makeStuff(() => new Good());
    expect(MixinApi.isFlawed(g)).toBe(true);
    expect(MixinApi.isIntegrity(g)).toBe(true);
  });

  it('⭐ one rule at a vessel’s, a boat’s and a ship’s scale', () => {
    const crock = makeStuff(() => new Good());
    crock.addFlaw('crack', true);
    // A full ten-litre crock: head ∛(10/1000) m, scale one.
    expect(crock.flawLeakLPerHour(Math.cbrt(0.01), 1)).toBeCloseTo(4 * Math.sqrt(Math.cbrt(0.01)), 9);

    const rowboat = makeStuff(() => new Good());
    rowboat.addFlaw('holed', true);
    // The shipped rowboat: 0.25 m draft, 4.5 m long.
    const rowLps = rowboat.flawLeakLPerHour(0.25, 4.5) / 3600;
    expect(rowLps).toBeCloseTo(0.4, 9);
    // ⭐ Bailable by one bucket: a hole she takes in less than a hand throws out.
    expect(rowLps).toBeLessThan(BUCKET_LPS);

    const hesper = makeStuff(() => new Good());
    hesper.addFlaw('holed', true);
    // The Hesper: 1.2 m draft, 30 m long — near the 7.5 L/s she shipped with.
    const hesperLps = hesper.flawLeakLPerHour(1.2, 30) / 3600;
    expect(hesperLps).toBeCloseTo((640 * Math.sqrt(1.2) * 30) / 3600, 9);
    expect(hesperLps).toBeGreaterThan(0.75 * HESPER_SHIPPED_LPS);
    expect(hesperLps).toBeLessThan(HESPER_SHIPPED_LPS);
  });

  it('holes and cracks add; a mended one lets nothing through; other flaws never leak', () => {
    const g = makeStuff(() => new Good());
    g.addFlaw('dunt', false);
    g.addFlaw('check', true);
    expect(g.flawLeakLPerHour(1, 1)).toBe(0);
    g.addFlaw('crack', true);
    g.addFlaw('holed', true);
    expect(g.flawLeakLPerHour(1, 1)).toBeCloseTo(4 + 640, 9);
    expect(g.flawLeakLPerHour(0, 1)).toBe(0);
  });
});
