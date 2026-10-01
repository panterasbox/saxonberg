/**
 * Lamp oil is a good with a unit (energy build A1).
 *
 * The market the street-lighting bill was missing stands on two facts:
 *
 *  - lamp oil is a real MATERIAL with a fuel value and a density, carried
 *    in a real cask (a `Bottle` preset), so a quantity of it can be bought,
 *    burned and counted;
 *  - `CategoryMeasure` — the tally a `supply` gig's condition and a
 *    `FuelStore` both read — sees a cask's forty litres by the `lamp-oil`
 *    tag, which is what makes it a market rather than a prop.
 *
 * ⚠ Both cask rows state `_materialPath` (oak) so they carry mass: the
 * `SpiritBottle`/`gin.yaml` shape they copy does not, and is a `lint:mass`
 * ceiling offender.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import Bottle from '@saxonberg/server/mud/platform/thing/Bottle';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { CategoryMeasure } from '@saxonberg/server/mud/lib/employment/CategoryMeasure';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

const PACK = fileURLToPath(new URL('../../', import.meta.url));

function row(rel: string): { data: Record<string, unknown>; class: string } {
  return YAML.parse(readFileSync(`${PACK}content/${rel}`, 'utf8')) as {
    data: Record<string, unknown>;
    class: string;
  };
}

describe('lamp oil rows', () => {
  it('the material carries a fuel value, a density, and the market tags', () => {
    const m = row('stuff/idea/material/bulk/lamp-oil.yaml');
    expect(m.class).toBe('/platform/idea/material/Material');
    expect(m.data.name).toBe('lamp-oil');
    expect(m.data.density).toBe(820);
    expect(m.data.heatOfCombustion).toBe(43);
    expect(m.data.edibility).toBe(false);
    expect(m.data.tags).toEqual(
      expect.arrayContaining(['liquid', 'lamp-oil', 'fuel', 'flammable']),
    );
  });

  it('both casks are Bottle presets and state _materialPath (the mass guard)', () => {
    const empty = row('trade/fuel/thing/oil-cask.yaml');
    const filled = row('trade/fuel/thing/lamp-oil-cask.yaml');
    expect(empty.class).toBe('/platform/thing/Bottle');
    expect(filled.class).toBe('/platform/thing/Bottle');
    // lint:mass: neither may inherit the SpiritBottle gap.
    expect(empty.data._materialPath).toBe('/stuff/idea/material/wood/oak');
    expect(filled.data._materialPath).toBe('/stuff/idea/material/wood/oak');
  });

  it('the filled cask names lamp oil, forty litres, and the census bucket', () => {
    const filled = row('trade/fuel/thing/lamp-oil-cask.yaml');
    expect(filled.data.interiorMaterial).toBe(
      '/stuff/idea/material/bulk/lamp-oil',
    );
    expect(filled.data.interiorAmount).toBe(40);
    expect(filled.data.censusKey).toBe('fuel:lamp-oil');
    expect(filled.data.materialTags).toEqual(
      expect.arrayContaining(['lamp-oil', 'fuel']),
    );
  });
});

describe('the tally the market stands on', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
  });
  afterEach(() => StuffApi.clearAll());

  it('⭐ CategoryMeasure reads 40 L of lamp-oil off a filled cask', () => {
    const oil = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('lamp-oil');
      m.setKeywords(['lamp-oil']);
      m.setTags(['liquid', 'lamp-oil', 'fuel', 'flammable']);
      m.setDensity(Quantity.of(820, 'kg/m³'));
      return m;
    }, '/stuff/idea/material/bulk/lamp-oil') as unknown as never;

    const cask = makeStuff(() => new Bottle());
    cask.interiorBulk = true;
    cask.setInteriorCapacity(Quantity.of(40, 'L'));
    cask.setBulkMaterial('interior', oil);
    cask.setBulkAmount('interior', Quantity.of(40, 'L'));

    expect(CategoryMeasure.contribution(cask, 'lamp-oil', 'L')).toBe(40);
    // And nothing to a category it does not hold.
    expect(CategoryMeasure.contribution(cask, 'water', 'L')).toBe(0);
  });
});
