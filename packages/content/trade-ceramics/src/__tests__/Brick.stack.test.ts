/**
 * ⭐ Green bricks stack only in the same green state (the ceramics drive A,
 * run 21: a fresh wet brick set down beside a bone-dry one merged into one
 * stack of the dry one's water, and the frost had nothing to burst).
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import Brick from '../thing/Brick';

const ROW = '/trade/ceramics/thing/_stack-test/brick';
let clay: Material;

function brick(moisture: number): Brick {
  const b = makeStuff(() => {
    const x = new Brick();
    x.setMass(Quantity.of(3, 'kg'));
    x.setMaterial(clay);
    x.setStampedTemperatureK(290);
    x.setLastAmbientK(290);
    x.setWaterState({ moisture, solute: 0 });
    return x;
  });
  stampTemplatePathForTest(b as unknown as Stuff, ROW);
  return b;
}

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  WorldClockApi._setNowProviderForTesting(() => 1_000_000);
  clay = makeStuffAtPath(() => {
    const m = new Material();
    m.setName('clay');
    m.setTags(['earth', 'plastic', 'clay']);
    m.setDensity(Quantity.of(1800, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(900, 'J/(kg·K)'));
    return m;
  }, '/stuff/idea/material/_stack-test/clay') as unknown as Material;
});
afterEach(() => WorldClockApi._resetForTesting());

describe('green bricks on a stack', () => {
  it('two in the same state stack', () => {
    expect(brick(0.52).canMergeWith(brick(0.52) as unknown as Stuff)).toBe(true);
  });

  it('⭐ a wet brick does not join a bone-dry one', () => {
    const dry = brick(0.52);
    const wet = brick(1);
    expect(dry.greenState()).not.toBe(wet.greenState());
    expect(dry.canMergeWith(wet as unknown as Stuff)).toBe(false);
  });
});
