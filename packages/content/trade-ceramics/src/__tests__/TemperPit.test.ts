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
import ClayVessel from '../thing/ClayVessel';
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
  sandMat = material('sand', ['silica', 'granular']); // the real row's tags
  water = material('water', ['liquid', 'water']);
  clayMat = material('fat clay', ['clay', 'plastic'], [
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
  p.productMaterial = clayMat.getTemplatePath()!;
  p.productTemplate = '/trade/quarrying/thing/clay';
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

  it('⭐ RECLAIM: a ruined green piece is still clay — trodden back in, it comes out clay (B99)', async () => {
    const yard = makeStuff(() => new Yard());
    const p = pit(true);
    await ContainmentApi.move(p, yard);
    // A jug of the pit's own clay — its own kind (row), not a lump of it.
    const jug = makeStuffAtPath(() => new ClayVessel(), '/trade/ceramics/thing/jug') as unknown as ClayVessel;
    jug.setMass(Quantity.of(2, 'kg'));
    jug.setMaterial(clayMat);
    jug.greenRuin = 'slumped'; // rain got at it on the open yard
    await ContainmentApi.move(jug, p);
    const actor = makeStuff(() => new TestActor());
    await ContainmentApi.move(actor, yard);
    const plan = await p.kneadPlanFor({ actor, commandText: 'knead pit' });
    expect(plan.ok).toBe(true);
    if (plan.ok) plan.onComplete();
    // The tread completes async; a ware's destruct takes more turns than a lump's.
    for (let i = 0; i < 200 && !jug.isDestroyed(); i++) await new Promise<void>((r) => setTimeout(r, 0));
    expect(jug.isDestroyed()).toBe(true);
    const out = p.getContents().find((c) => c instanceof Clay) as Clay | undefined;
    expect(out?.getMass().rawValue()).toBeCloseTo(2, 6);
  });

  it('a fired pot will not tread in — refused by name, with the way (B99)', async () => {
    const p = pit(true);
    await put(p, clayMat, 9, true);
    await put(p, material('terracotta', ['ceramic', 'fired']), 1, false);
    const plan = await p.kneadPlanFor({ actor: makeStuff(() => new Yard()), commandText: 'knead' });
    expect(plan.ok).toBe(false);
    if (!plan.ok) {
      expect(plan.reason).toBe('not-treadable');
      expect(String(plan.line)).toMatch(/grog/);
    }
  });

  it('⭐ clay in a pit full of water is still TRODDEN — the water is the pit\'s reservoir, never a slip', async () => {
    const p = pit(true);
    await put(p, clayMat, 9, true);
    expect(p.workVerb()).toBe('knead');
    const plan = await p.kneadPlanFor({ actor: makeStuff(() => new Yard()), commandText: 'knead', verb: 'knead' });
    expect(plan.ok).toBe(true);
  });

  it('a pit with ice set in it refuses — it is frozen, not unworkable', async () => {
    const p = pit(true);
    await put(p, clayMat, 9, true);
    await put(p, material('ice', ['solid', 'ice', 'frozen']), 50, false);
    const plan = await p.kneadPlanFor({ actor: makeStuff(() => new Yard()), commandText: 'knead' });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe('frozen');
  });

  it('a dry pit refuses — it wants water', async () => {
    const p = pit(false);
    await put(p, clayMat, 9, true);
    const plan = await p.kneadPlanFor({ actor: makeStuff(() => new Yard()), commandText: 'knead' });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe('no-water');
  });
});
