/**
 * The sugar copper's three acts (sugar D1/D19): a raw-sugar block
 * dissolves into its water; lime tempers the liquor; the scum is skimmed
 * into a pail — and the copper's grade, which the strike arrow reads,
 * follows what was done.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import Provision from '@saxonberg/server/mud/platform/thing/Provision';
import Vat from '@saxonberg/server/mud/platform/thing/Vat';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import Copper from '../thing/Copper';

function material(path: string, setup: (m: Material) => void): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    setup(m);
    return m;
  }, path) as unknown as Material;
}

let water: Material;
let rawSugar: Material;
let quicklime: Material;

function copperOfWater(litres: number): Copper {
  const room = makeStuff(() => new Place());
  const c = makeStuff(() => new Copper());
  c.setBulkMaterial('interior', water);
  c.setBulkAmount('interior', Quantity.of(litres, 'L'));
  ContainmentApi.move(c, room);
  return c;
}

function lump(mat: Material, kg: number): Provision {
  return makeStuff(() => {
    const p = new Provision();
    p.setMaterial(mat);
    p.setMass(Quantity.of(kg, 'kg'));
    return p;
  });
}

const bandOf = (c: Copper): string => (MixinApi.isGraded(c) ? c.getGrade().getBand() : '');
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('the sugar copper', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    water = material('/stuff/idea/material/bulk/water', () => undefined);
    rawSugar = material('/trade/sugar/idea/material/raw-sugar', (m) => m.setTags(['solid', 'raw-sugar']));
    material('/trade/sugar/idea/material/raw-liquor', (m) => m.setSolidsKgPerL(0.6));
    material('/trade/sugar/idea/material/skimmings', () => undefined);
    quicklime = material('/stuff/idea/material/caustic/quicklime', () => undefined);
  });

  it('⭐ a block dissolves into the water: raw liquor, of the strength you made it', async () => {
    const c = copperOfWater(25);
    const block = lump(rawSugar, 20);
    ContainmentApi.move(block, c);
    await flush();
    expect(c.getBulkMaterialPath('interior')).toBe('/trade/sugar/idea/material/raw-liquor');
    expect(c.getBulkAmount('interior').rawValue()).toBeCloseTo(37.5, 6);
    expect(c.getBulkPayload('interior')?.dissolvedSolidsKgPerL).toBeCloseTo(20 / 37.5, 6);
    expect(block.isDestroyed()).toBe(true);
    // Untempered: it will not grain.
    expect(bandOf(c)).toBe('poor');
  });

  it('a dry copper refuses the block', () => {
    const room = makeStuff(() => new Place());
    const c = makeStuff(() => new Copper());
    ContainmentApi.move(c, room);
    expect(c.canAddContainable(lump(rawSugar, 20) as never).ok).toBe(false);
    expect(c.canAddContainable(makeStuff(() => new Good()) as never).ok).toBe(false);
  });

  it('⭐ tempered once and skimmed grains clean; twice-limed grains dark', async () => {
    const c = copperOfWater(25);
    ContainmentApi.move(lump(rawSugar, 20), c);
    await flush();
    expect(c.temper(lump(quicklime, 4.5)).ok).toBe(true);
    expect(bandOf(c)).toBe('fair'); // not yet skimmed
    const pail = makeStuff(() => new Vat());
    const before = c.getBulkAmount('interior').rawValue();
    expect(c.skim(pail).ok).toBe(true);
    expect(bandOf(c)).toBe('fine');
    expect(pail.getBulkMaterialPath('interior')).toBe('/trade/sugar/idea/material/skimmings');
    expect(pail.getBulkAmount('interior').rawValue()).toBeCloseTo(before * 0.05, 6);
    expect(c.skim(pail).ok).toBe(false); // clean already
    expect(c.temper(lump(quicklime, 4.5)).ok).toBe(true);
    expect(bandOf(c)).toBe('fair'); // over-limed
  });

  it('nothing to temper in plain water', () => {
    const c = copperOfWater(25);
    const out = c.temper(lump(quicklime, 4.5));
    expect(out.ok).toBe(false);
  });
});
