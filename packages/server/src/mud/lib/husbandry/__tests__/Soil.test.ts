/**
 * The soil lift (W1) — **soil is composable on its own**, with no
 * Container, no Bulkable, no Slotted and no plant slot anywhere in sight.
 *
 * That is the whole claim of the split, and the reason it had to happen
 * before a field could exist: `CultivableMixin`'s host constraint is a
 * *Thing with a bulk interior of soil in litres*, and a field-room is not
 * that shape and must not be made that shape.
 *
 * ⚠ The pot and the bed are covered by their own suites, unchanged and
 * untouched by this build — **that** is W1's real acceptance test. What is
 * proven here is only what could not be proven before: that the soil half
 * stands up on a host that has none of the cultivable half.
 *
 * See docs/subsystems/husbandry.md § soil.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { ReservedMixin, Reserve } from '../../reserve';
import { SoilMixin, SOIL_MOISTURE_RESERVE_KEY, SOIL_NITROGEN_RESERVE_KEY, SOIL_ORGANIC_MATTER_RESERVE_KEY, SOIL_RESERVE_THEME } from '../Soil';
import { MixinApi } from '../../../api/mixin';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';

/**
 * The minimum host soil admits: an `Idea` with reserves. Nothing here is
 * a Thing, nothing holds bulk, and nothing has a slot — which is exactly
 * the point.
 */
class BareGround extends SoilMixin(ReservedMixin(Idea)) {}

function makeGround(water = 100, nitrogen = 50): BareGround {
  return makeStuff(() => {
    const g = new BareGround();
    g.setReserve(
      new Reserve(
        SOIL_MOISTURE_RESERVE_KEY,
        Quantity.of(200, 'L'),
        Quantity.of(water, 'L'),
        SOIL_RESERVE_THEME,
        null,
      ),
    );
    g.setReserve(
      new Reserve(
        SOIL_NITROGEN_RESERVE_KEY,
        Quantity.of(100, '%'),
        Quantity.of(nitrogen, '%'),
        SOIL_RESERVE_THEME,
        null,
      ),
    );
    return g;
  });
}

describe('SoilMixin — the ground half, on its own', () => {
  it('⭐ composes on a host with reserves and NOTHING else', () => {
    const ground = makeGround();
    expect(MixinApi.isSoil(ground)).toBe(true);
    // The cultivable half is absent, which is the claim.
    expect(MixinApi.isCultivable(ground)).toBe(false);
    expect(MixinApi.isContainer(ground)).toBe(false);
    expect(MixinApi.isBulkable(ground)).toBe(false);
  });

  it('reads its two reserves as fractions', () => {
    const ground = makeGround(50, 25);
    expect(ground.soilMoistureFraction()).toBeCloseTo(0.25, 6);
    expect(ground.nutrientFraction()).toBeCloseTo(0.25, 6);
  });

  it('waters, feeds and draws — headroom-capped both ways', () => {
    const ground = makeGround(190, 95);
    // 10 L of headroom left, so 40 L pours 10 in.
    expect(ground.waterSoil(40)).toBeCloseTo(10, 6);
    expect(ground.soilMoistureFraction()).toBeCloseTo(1, 6);
    expect(ground.feedSoil(20)).toBeCloseTo(5, 6);
    expect(ground.drawNutrient(30)).toBeCloseTo(30, 6);
    expect(ground.nutrientFraction()).toBeCloseTo(0.7, 6);
  });

  it('refuses nonsense amounts rather than moving the reserve backwards', () => {
    const ground = makeGround(50, 50);
    expect(ground.waterSoil(-5)).toBe(0);
    expect(ground.waterSoil(Number.NaN)).toBe(0);
    expect(ground.feedSoil(0)).toBe(0);
    expect(ground.drawNutrient(-1)).toBe(0);
    expect(ground.soilMoistureFraction()).toBeCloseTo(0.25, 6);
    expect(ground.nutrientFraction()).toBeCloseTo(0.5, 6);
  });


  it('⭐ the two host hooks default to zero — nobody drinks, no sky is caught', () => {
    const ground = makeGround();
    expect(ground.soilWaterDemandPerGameDay()).toBe(0);
    expect(ground.soilCatchmentAreaM2()).toBe(0);
  });

  it('⚠⚠ an unresolved sky reads null, not zero', () => {
    const ground = makeGround();
    expect(ground.isWatershedResolved()).toBe(false);
    // NOT `0` — "we have not looked" and "nothing fell" are different
    // values, and only the second one is a number.
    expect(ground.rainfallAbsorbedLitres()).toBeNull();
  });

  it('unplaced ground stays unresolved rather than resolving to nothing', async () => {
    const ground = makeGround();
    await ground.restampWatershed();
    expect(ground.isWatershedResolved()).toBe(false);
  });

  it('a host authoring no reserves at all reads null, never a number', () => {
    const ground = makeStuff(() => new BareGround());
    expect(ground.soilMoistureFraction()).toBeNull();
    expect(ground.nutrientFraction()).toBeNull();
    expect(ground.waterSoil(10)).toBe(0);
    expect(ground.feedSoil(10)).toBe(0);
    expect(ground.drawNutrient(10)).toBe(0);
  });
});

/**
 * ⭐ **A soil made of parts** (field population D3). A ground that is
 * divided answers every read and write over its parts, so a caller that
 * asks the whole field gets the whole field — and a ground with no parts
 * takes the shipped path on every line.
 */
class PartGround extends SoilMixin(ReservedMixin(Idea)) {
  public key = '';
  public area = 0;
  public override soilPartKey(): string {
    return this.key;
  }
  public override soilCatchmentAreaM2(): number {
    return this.area;
  }
}

class DividedGround extends SoilMixin(ReservedMixin(Idea)) {
  public parts: PartGround[] = [];
  public override soilParts(): readonly PartGround[] {
    return this.parts;
  }
}

function makePart(
  key: string,
  area: number,
  water: number,
  capacity: number,
  nitrogen: number,
): PartGround {
  return makeStuff(() => {
    const p = new PartGround();
    p.key = key;
    p.area = area;
    p.setReserve(
      new Reserve(
        SOIL_MOISTURE_RESERVE_KEY,
        Quantity.of(capacity, 'L'),
        Quantity.of(water, 'L'),
        SOIL_RESERVE_THEME,
        null,
      ),
    );
    p.setReserve(
      new Reserve(
        SOIL_NITROGEN_RESERVE_KEY,
        Quantity.of(100, '%'),
        Quantity.of(nitrogen, '%'),
        SOIL_RESERVE_THEME,
        null,
      ),
    );
    return p;
  });
}

function makeDivided(): { field: DividedGround; top: PartGround; lane: PartGround } {
  // 600 m² and 400 m²: a 60/40 split by the sky each part catches.
  const top = makePart('top-end', 600, 0, 100, 20);
  const lane = makePart('lane-end', 400, 50, 100, 60);
  const field = makeStuff(() => new DividedGround());
  field.parts = [top, lane];
  return { field, top, lane };
}

describe('SoilMixin — a soil made of parts', () => {
  it('a one-piece ground has no parts and needs none named', () => {
    const ground = makeGround(50, 25);
    expect(ground.soilParts()).toEqual([]);
    expect(ground.soilPartKey()).toBe('');
    expect(ground.soilDepthM()).toBeNull();
    expect(ground.soilPart('top-end')).toBeNull();
    expect(ground.soilPartRefusal()).toBeNull();
    expect(ground.resolvePartFor(null)).toEqual({ ok: true, part: null });
  });

  it('⭐ a one-piece ground is unchanged on every line — headrooms included', () => {
    const ground = makeGround(150, 40);
    expect(ground.soilMoistureHeadroomL()).toBeCloseTo(50, 6);
    expect(ground.soilNutrientHeadroom()).toBeCloseTo(60, 6);
    expect(ground.waterSoil(20)).toBeCloseTo(20, 6);
    expect(ground.feedSoil(10)).toBeCloseTo(10, 6);
    expect(ground.soilMoistureFraction()).toBeCloseTo(0.85, 6);
    expect(ground.nutrientFraction()).toBeCloseTo(0.5, 6);
  });

  it('finds a part by its key; an empty or unknown key is whole ground', () => {
    const { field, top, lane } = makeDivided();
    expect(field.soilPart('top-end')).toBe(top);
    expect(field.soilPart('lane-end')).toBe(lane);
    expect(field.soilPart('')).toBeNull();
    expect(field.soilPart('far-side')).toBeNull();
  });

  it('⭐ the mean is AREA-weighted', () => {
    const { field } = makeDivided();
    // 0.6 × 0 + 0.4 × 0.5 = 0.2
    expect(field.soilMoistureFraction()).toBeCloseTo(0.2, 6);
    expect(field.meanSoilMoistureFraction()).toBeCloseTo(0.2, 6);
    // 0.6 × 0.2 + 0.4 × 0.6 = 0.36
    expect(field.nutrientFraction()).toBeCloseTo(0.36, 6);
  });

  it('⭐ water is spread by area share and the sum comes back', () => {
    const { field, top, lane } = makeDivided();
    expect(field.waterSoil(10)).toBeCloseTo(10, 6);
    expect(top.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.current.rawValue()).toBeCloseTo(6, 6);
    expect(lane.getReserve(SOIL_MOISTURE_RESERVE_KEY)!.current.rawValue()).toBeCloseTo(54, 6);
  });

  it('a per-cent reserve is fed ALIKE across the parts — the field moves as it would whole', () => {
    const { field, top, lane } = makeDivided();
    const before = field.nutrientFraction()!;
    expect(field.feedSoil(10)).toBeCloseTo(10, 6);
    expect(top.nutrientFraction()).toBeCloseTo(0.3, 6);
    expect(lane.nutrientFraction()).toBeCloseTo(0.7, 6);
    expect(field.nutrientFraction()!).toBeCloseTo(before + 0.1, 6);
    expect(field.drawNutrient(5)).toBeCloseTo(5, 6);
    expect(field.nutrientFraction()!).toBeCloseTo(before + 0.05, 6);
  });

  it('a divided ground holds no reserve of its own and reports no organic matter it lacks', () => {
    const { field } = makeDivided();
    expect(field.hasReserve(SOIL_MOISTURE_RESERVE_KEY)).toBe(false);
    expect(field.organicMatterFraction()).toBeNull();
    expect(field.structureFraction()).toBeNull();
    expect(field.addOrganicMatter(5)).toBe(0);
  });

  it('headroom is summed in litres and averaged in points', () => {
    const { field } = makeDivided();
    // 100 + 50 litres of room.
    expect(field.soilMoistureHeadroomL()).toBeCloseTo(150, 6);
    // 0.6 × 80 + 0.4 × 40 = 64 points.
    expect(field.soilNutrientHeadroom()).toBeCloseTo(64, 6);
  });

  it('⭐ naming no part on a divided ground is refused — by the GROUND, in words', () => {
    const { field, top } = makeDivided();
    const unnamed = field.resolvePartFor(null);
    expect(unnamed.ok).toBe(false);
    if (!unnamed.ok) {
      expect(unnamed.reason).toBe('patch-unnamed');
      expect(unnamed.line).toMatch(/^Which part\? Name one: .+ or .+\.$/);
    }
    expect(field.resolvePartFor(top)).toEqual({ ok: true, part: top });
  });

  it('a part of somewhere else — or the ground itself — is not a part here', () => {
    const { field } = makeDivided();
    const stranger = makePart('top-end', 100, 0, 100, 0);
    const elsewhere = field.resolvePartFor(stranger);
    expect(elsewhere.ok).toBe(false);
    if (!elsewhere.ok) expect(elsewhere.reason).toBe('not-a-part-here');
    const itself = field.resolvePartFor(field);
    expect(itself.ok).toBe(false);
  });

  it('a ground of ONE part needs no part named, and answers that part', () => {
    const only = makePart('whole', 100, 0, 100, 0);
    const field = makeStuff(() => new DividedGround());
    field.parts = [only];
    expect(field.soilPartRefusal()).toBeNull();
    expect(field.resolvePartFor(null)).toEqual({ ok: true, part: only });
  });
});
