/**
 * ⭐ A vessel's contents say how far they have turned (dairy, found by the
 * drive): a jug of milk a day in the warm said nothing to `smell`, because
 * only discrete food spoke its spoilage band. `CraftVessel` composes the
 * contents' line from `Freshness.senseLine`.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CraftVessel from '../CraftVessel';
import Material from '../../../lib/material/Material';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { BulkableApi } from '../../../api/bulk';
import { WorldClockApi } from '../../../api/worldclock';
import { Freshness } from '../../../lib/material/Freshness';
import { Quantity } from '../../../lib/quantity';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import '../../idea/WorldClockRegistry';

const HOUR = 3600;
const BASE = 1_000_000;
let now = BASE;
const setNow = (s: number): void => {
  now = BASE + s;
};
const MILK = '/stuff/idea/material/_test/vessel-milk';

function milk(): Material {
  const found = StuffApi.findByTemplatePath<Material>(MILK);
  if (found) return found;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('milk');
    m.setAppearance('white');
    m.setEdibility(true);
    m.setSpecificHeat(Quantity.of(3930, 'J/(kg·K)'));
    m.setSpoilActivationEnergy(Quantity.of(60_000, 'J/mol'));
    m.setWaterActivity(0.99);
    return m;
  }, MILK) as unknown as Material;
}

function jug(tempK: number): CraftVessel {
  const v = makeStuff(() => new CraftVessel());
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  v.setInteriorCapacity(Quantity.of(2, 'L'));
  v.setStampedTemperatureK(tempK);
  v.setLastAmbientK(tempK);
  (v as unknown as { interiorMaterial: string }).interiorMaterial = MILK;
  v.setInteriorAmount(Quantity.of(1, 'L'));
  return v;
}

function augmented(v: CraftVessel, filter?: string[]): string {
  let text = '';
  for (const aug of MixinApi.getAllMarkupAugmenters(CraftVessel)) {
    text = aug(text, v as unknown as Stuff, v as unknown as Stuff, filter ? { filter } : undefined);
  }
  return text;
}

describe('a vessel speaks its contents’ spoilage', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    milk();
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('⭐ milk a day in the warm smells turned; the same milk kept cool does not', () => {
    const warm = jug(300);
    const cool = jug(284);
    new Freshness(BulkableApi.slotFor(warm, undefined)!).load();
    new Freshness(BulkableApi.slotFor(cool, undefined)!).load();
    expect(augmented(warm, ['smell'])).not.toMatch(/sour|off|turn|taint|spoil|rank/i);
    setNow(24 * HOUR);
    expect(augmented(warm, ['smell'])).toMatch(/sour|off|turn|taint|spoil|rank/i);
    expect(augmented(cool, ['smell'])).not.toMatch(/sour|off|turn|taint|spoil|rank/i);
    // Not to the ear.
    expect(augmented(warm, ['hearing'])).not.toMatch(/sour|off|turn|taint|spoil|rank/i);
  });
});
