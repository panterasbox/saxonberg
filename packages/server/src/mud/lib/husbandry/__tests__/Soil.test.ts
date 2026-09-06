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
import { SoilMixin, SOIL_MOISTURE_RESERVE_KEY, SOIL_NITROGEN_RESERVE_KEY, SOIL_RESERVE_THEME } from '../Soil';
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
