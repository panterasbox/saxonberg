/**
 * ⭐ Tempering is mixing (ceramics S3, R1): a temper pit folds clay and sand
 * into ONE clay by mass. It stays clay — leaner, cracking less by exactly
 * the sand that went in — and the pit's water is never part of it.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import Clay from '@saxonberg/content-trade-quarrying/src/thing/Clay';
import TemperPit from '../thing/TemperPit';
import { TestActor } from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';

class Yard extends Place {}

let seq = 0;
function material(name: string, tags: string[], composition: { materialPath: string; fraction: number }[] = []): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setComposition(composition);
    return m;
  }, `/stuff/idea/material/_temper/${name}-${seq}`) as unknown as Material;
}

let clayMat: Material;
let sandMat: Material;
let water: Material;

beforeEach(() => {
  installV1QuantityMarshallers();
  const mineral = material('clay-mineral', ['clay-mineral']);
  sandMat = material('sand', ['silica']);
  water = material('water', ['liquid', 'water']);
  clayMat = material('fat clay', ['clay'], [
    { materialPath: mineral.getTemplatePath()!, fraction: 0.8 },
    { materialPath: sandMat.getTemplatePath()!, fraction: 0.2 },
  ]);
  vi.spyOn(StuffApi, 'clone').mockImplementation((async () => makeStuff(() => new Clay())) as never);
});
afterEach(() => vi.restoreAllMocks());

function pit(withWater: boolean): TemperPit {
  const p = makeStuff(() => new TemperPit());
  p.interiorBulk = true;
  p.setInteriorCapacity(Quantity.of(400, 'L'));
  p.blendMaterial = clayMat.getTemplatePath()!;
  p.blendTemplate = '/trade/quarrying/thing/clay';
  if (withWater) {
    p.setBulkMaterial('interior', water);
    p.setBulkAmount('interior', Quantity.of(100, 'L'));
  }
  return p;
}

async function put(into: TemperPit, mat: Material, kg: number, asClay: boolean): Promise<void> {
  const piece = makeStuff(() => (asClay ? new Clay() : new Good()));
  piece.setMass(Quantity.of(kg, 'kg'));
  piece.setMaterial(mat);
  await ContainmentApi.move(piece, into);
}

describe('the temper pit', () => {
  it('⭐ clay and sand kneaded with water come out ONE clay — leaner, cracking less', async () => {
    const yard = makeStuff(() => new Yard());
    const p = pit(true);
    await ContainmentApi.move(p, yard);
    await put(p, clayMat, 9, true);
    await put(p, sandMat, 3, false);
    const fresh = makeStuff(() => new Clay());
    fresh.setMaterial(clayMat);
    const before = fresh.crackRisk();
    const actor = makeStuff(() => new TestActor());
    await ContainmentApi.move(actor, yard);
    const plan = await p.kneadPlanFor({ actor, commandText: 'knead pit' });
    expect(plan.ok).toBe(true);
    if (plan.ok) plan.onComplete();
    for (let i = 0; i < 10; i++) await new Promise<void>((r) => setTimeout(r, 0));
    const out = p.getContents().find((c) => c instanceof Clay) as Clay | undefined;
    expect(out).toBeDefined();
    expect(out!.getMass().rawValue()).toBeCloseTo(12, 6);
    expect(out!.shares().opener).toBeCloseTo(0.4, 2);
    expect(out!.crackRisk()).toBeLessThan(before);
    // The water stayed the pit's, less what the tread took up.
    expect(p.getBulkAmount('interior').rawValue()).toBeLessThan(100);
    expect(p.getBulkAmount('interior').rawValue()).toBeGreaterThan(98);
    expect(p.getBulkMaterial('interior')).toBe(water);
  });

  it('a dry pit refuses — it wants water', async () => {
    const p = pit(false);
    await put(p, clayMat, 9, true);
    const plan = await p.kneadPlanFor({ actor: makeStuff(() => new Yard()), commandText: 'knead' });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe('no-water');
  });
});
