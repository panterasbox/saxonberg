/**
 * ⭐⭐ Mixing is ONE rule (ceramics R1, D34): what goes into a mixing vessel
 * comes out as ONE blend whose make-up is the inputs' by mass. No recipe,
 * no ratio — a little more sulfur is a harder rubber.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Material from '../Material';
import MixingVessel from '../../../platform/thing/MixingVessel';
import Casting from '../../../platform/thing/Casting';
import { HeatTransition } from '../HeatTransition';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import type { Stuff } from '../../stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

let seq = 0;
let RAW = '';
let SULFUR = '';
let COMPOUND = '';
let WATER = '';
let SLIP = '';
const STOCK_ROW = '/stuff/thing/_mixing/stock';

function material(path: string, density = 1000, composition: { materialPath: string; fraction: number }[] = []): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setDensity(Quantity.of(density, 'kg/m³'));
    m.setComposition(composition);
    return m;
  }, path) as unknown as Material;
}

function lumpOf(path: string, kg: number): Casting {
  const t = makeStuff(() => new Casting());
  t.setMass(Quantity.of(kg, 'kg'));
  t.setMaterial(StuffApi.findByTemplatePath<Material>(path) as unknown as Material);
  return t;
}

function tub(blendTemplate: string, blendMaterial: string): MixingVessel {
  return makeStuff(() => {
    const v = new MixingVessel();
    (v as unknown as { blendMaterial: string }).blendMaterial = blendMaterial;
    (v as unknown as { blendTemplate: string }).blendTemplate = blendTemplate;
    v.interiorBulk = true;
    v.setInteriorCapacity(Quantity.of(20, 'L'));
    return v;
  });
}

beforeEach(() => {
  installV1QuantityMarshallers();
  seq += 1;
  RAW = `/stuff/idea/material/_mixing/raw-${seq}`;
  SULFUR = `/stuff/idea/material/_mixing/sulfur-${seq}`;
  COMPOUND = `/stuff/idea/material/_mixing/compound-${seq}`;
  WATER = `/stuff/idea/material/_mixing/water-${seq}`;
  SLIP = `/stuff/idea/material/_mixing/slip-${seq}`;
  material(RAW, 920);
  material(SULFUR, 2070);
  material(COMPOUND, 960);
  material(WATER, 1000);
  material(SLIP, 1500);
  const realClone = StuffApi.clone;
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string, ...rest: unknown[]) => {
    if (path === STOCK_ROW) {
      const c = makeStuff(() => new Casting());
      stampTemplatePathForTest(c, STOCK_ROW);
      return c;
    }
    return (realClone as (...a: unknown[]) => Promise<Stuff>).call(StuffApi, path, ...rest);
  }) as never);
});
afterEach(() => vi.restoreAllMocks());

describe('the blend is the inputs, by mass', () => {
  it('⭐ 970 g of raw rubber and 30 g of sulfur knead to stock carrying 3 % sulfur', async () => {
    const v = tub(STOCK_ROW, COMPOUND);
    ContainmentApi.move(lumpOf(RAW, 0.97) as never, v as never);
    ContainmentApi.move(lumpOf(SULFUR, 0.03) as never, v as never);
    const out = await v.blend(null);
    expect(out.ok).toBe(true);
    const stock = v.getContents().find((c) => c.getTemplatePath() === STOCK_ROW) as unknown as Casting;
    expect(stock).toBeDefined();
    expect(stock.getMaterial()?.getTemplatePath()).toBe(COMPOUND);
    expect(stock.getMass().rawValue()).toBeCloseTo(1, 6);
    expect(stock.fractionOf(SULFUR)).toBeCloseTo(0.03, 6);
    // the inputs are gone: there is one piece in the tub now
    expect(v.getContents()).toHaveLength(1);
  });

  it('a quarter sulfur is a stock the cure turns to the over-range material', async () => {
    const v = tub(STOCK_ROW, COMPOUND);
    ContainmentApi.move(lumpOf(RAW, 0.75) as never, v as never);
    ContainmentApi.move(lumpOf(SULFUR, 0.25) as never, v as never);
    await v.blend(null);
    const stock = v.getContents()[0] as unknown as Casting;
    const cure = new HeatTransition({
      key: 'cure',
      referenceK: 418,
      zK: 12,
      fullDoseS: 1800,
      agent: { material: SULFUR, optimum: 0.03, over: 0.2 },
      ladder: [{ atDegree: 0.6, becomes: 'rubber' }],
      over: 'ebonite',
    });
    const agent = stock.fractionOf(SULFUR);
    const degree = cure.degreeFor(3600, agent);
    expect(cure.outcomeAt(cure.rungIndexFor(degree), { peakK: 418, agentFraction: agent, reducing: false })?.materialPath).toBe('ebonite');
  });

  it('with no row to mint, the blend is the vessel’s own bulk, carrying its make-up', async () => {
    const v = tub('', SLIP);
    v.setBulkMaterial('interior', StuffApi.findByTemplatePath<Material>(WATER)!);
    v.setBulkAmount('interior', Quantity.of(1, 'L'));
    ContainmentApi.move(lumpOf(RAW, 1) as never, v as never);
    const out = await v.blend(null);
    expect(out.ok).toBe(true);
    expect(v.getBulkMaterial('interior')?.getTemplatePath()).toBe(SLIP);
    const alloying = v.getBulkPayload('interior')?.makeup ?? [];
    const share = (p: string): number => alloying.find((e) => e.materialPath === p)?.fraction ?? 0;
    expect(share(WATER)).toBeCloseTo(0.5, 6);
    expect(share(RAW)).toBeCloseTo(0.5, 6);
    expect(v.getContents()).toHaveLength(0);
  });

  it('one piece that is already the blend is refused — there is nothing to work in', async () => {
    const v = tub(STOCK_ROW, COMPOUND);
    ContainmentApi.move(lumpOf(COMPOUND, 1) as never, v as never);
    const out = await v.blend(null);
    expect(out).toEqual({ ok: false, reason: 'already-blended' });
  });

  it('an empty vessel blends nothing', async () => {
    const v = tub(STOCK_ROW, COMPOUND);
    expect(await v.blend(null)).toEqual({ ok: false, reason: 'empty' });
  });
});
