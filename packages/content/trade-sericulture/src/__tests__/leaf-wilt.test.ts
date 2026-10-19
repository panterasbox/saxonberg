/**
 * ⭐ AC 4 — cut mulberry leaf leaves `fresh` within about a game day at
 * room temperature, and a wilted leaf feeds worse (the tray weights each
 * leaf by its band — `rearing-clock` covers the weighting).
 *
 * Reads the shipped material row's own numbers, so a retune of the row is
 * what this asserts.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { Freshness } from '@saxonberg/server/mud/lib/material/Freshness';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

const ROW = fileURLToPath(
  new URL('../../content/trade/sericulture/idea/material/mulberry-leaf.yaml', import.meta.url),
);

function leafMaterial(): Material {
  const data = (YAML.parse(readFileSync(ROW, 'utf-8')) as { data: Record<string, unknown> }).data;
  return makeStuff(() => {
    const m = new Material();
    m.setName(String(data.name));
    m.setSpoilActivationEnergy(Quantity.of(Number(data.spoilActivationEnergy), 'J/mol'));
    m.setWaterActivity(Number(data.waterActivity));
    return m;
  });
}

/** Hours until the load first bands past `fresh`, stepping by the hour. */
function hoursToWilt(m: Material, tempK: number): number {
  let load = 0;
  for (let h = 1; h <= 24 * 30; h++) {
    load = Freshness.advance(load, 3600, m, tempK);
    if (Freshness.bandFor(load) !== 'fresh') return h;
  }
  return Infinity;
}

describe('mulberry leaf wilts', () => {
  it('⭐ leaves fresh within about a game day at room temperature', () => {
    installV1QuantityMarshallers();
    const h = hoursToWilt(leafMaterial(), 293);
    expect(h).toBeGreaterThanOrEqual(12);
    expect(h).toBeLessThanOrEqual(36);
  });

  it('keeps longer in the cold', () => {
    installV1QuantityMarshallers();
    const m = leafMaterial();
    expect(hoursToWilt(m, 280)).toBeGreaterThan(hoursToWilt(m, 293));
  });
});
