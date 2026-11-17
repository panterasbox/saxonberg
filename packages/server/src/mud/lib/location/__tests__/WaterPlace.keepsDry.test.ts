/**
 * ⭐ Water soaks what you carry; a shut tight container keeps it dry (size
 * and carrying D22). The descent into what went under stops at a holder
 * that is shut and tight against liquid — the oilskin pouch — and goes on
 * through a shut canvas pack, whose cloth takes water. And a body wades
 * by its own stature: the water a tall body stands in is over a short
 * one's head.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Pool from '../../../platform/location/Pool';
import WaterSurface from '../../../platform/thing/WaterSurface';
import Floor from '../../../platform/thing/Floor';
import Good from '../../stuff/Good';
import Wood from '../../../platform/idea/material/Wood';
import type Material from '../../material/Material';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { WetMixin } from '../../wetness/Wet';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { SealableMixin } from '../../spatial/Sealable';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { BiomeApi, type MediumRead } from '../../../api/biome';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { TemplatePaths } from '../../paths';
import type { WaterRead } from '../WaterSource';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Letter extends WetMixin(ContainableMixin(Good)) {
  static _mixinName = 'KeepsDryLetter';
}
class Bag extends SealableMixin(ContainerMixin(Good)) {
  static _mixinName = 'KeepsDryBag';
}

const UNDER: MediumRead = {
  tag: 'water', substance: 'water', immersed: true, atSurface: false,
  temperatureK: 285, depthM: 3, waterRef: null,
};

function cloth(absorbs: number): Material {
  return makeStuffAtPath(() => {
    const m = new Wood();
    m.setName(`keeps-dry-${absorbs}`);
    m.setWaterAbsorptionCapacity(Quantity.of(absorbs, '%'));
    return m;
  }, `/stuff/idea/material/_test/keeps-dry-${absorbs}`) as unknown as Material;
}

function bag(material: Material): Bag {
  return makeStuff(() => {
    const b = new Bag();
    b.setMass(Quantity.of(0.3, 'kg'));
    b.setMaterial(material);
    return b;
  });
}

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
}

function body(statureM: number): Creature {
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`wade-${statureM}`);
  plan.setBaseMass(70);
  plan.setBaseStature(statureM);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/wade-${statureM}`);
  const sp = makeStuff(() => new Species());
  sp.setBodyPlan(plan);
  stampTemplatePathForTest(sp, `/stuff/idea/species/test/wade-${statureM}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(sp);
  return c;
}

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    if (path === TemplatePaths.waterSurface) return makeStuff(() => new WaterSurface());
    if (path === TemplatePaths.defaultFloor) return makeStuff(() => new Floor());
    throw new Error(`unexpected clone ${path}`);
  }) as unknown as typeof StuffApi.clone);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('what goes under keeps dry only shut and tight (D22)', () => {
  it('⭐ the oilskin pouch, flap shut, keeps the letter dry; a shut canvas bag does not', async () => {
    const p = makeStuff(() => new Pool());
    await p.ensureFloor();
    vi.spyOn(BiomeApi, 'mediumFor').mockReturnValue(UNDER);
    const pouch = bag(cloth(0));
    const pack = bag(cloth(30));
    const dry = makeStuff(() => new Letter());
    const wet = makeStuff(() => new Letter());
    ContainmentApi.move(dry, pouch);
    ContainmentApi.move(wet, pack);
    pouch.setOpen(false);
    pack.setOpen(false);
    expect(pouch.closureLevel()).toBe('liquidTight');
    expect(pack.closureLevel()).toBe('open');
    ContainmentApi.move(pouch, p);
    ContainmentApi.move(pack, p);
    await settle();
    expect(dry.getWetness()).toBe(0);
    expect(wet.getWetness()).toBeGreaterThan(0);
  });

  it('the same pouch left open lets the water in', async () => {
    const p = makeStuff(() => new Pool());
    await p.ensureFloor();
    vi.spyOn(BiomeApi, 'mediumFor').mockReturnValue(UNDER);
    const pouch = bag(cloth(0));
    const letter = makeStuff(() => new Letter());
    ContainmentApi.move(letter, pouch);
    pouch.setOpen(true);
    ContainmentApi.move(pouch, p);
    await settle();
    expect(letter.getWetness()).toBeGreaterThan(0);
  });
});

describe('a body wades by its stature (D22)', () => {
  function readAt(p: Pool, levelM: number): void {
    const read: WaterRead = {
      ref: 'r', atS: 0, name: 'the water', frozen: false,
      draw: { materialPath: '/m/water', temperatureK: 283 }, levelM,
    };
    vi.spyOn(p, 'peekWaterRead').mockReturnValue(read);
  }

  it('⭐ 1.6 m of water: a 2 m body wades, a 1.75 m body is swimming, a gnome far over its head', async () => {
    const p = makeStuff(() => new Pool());
    p.setWater({ of: 'kestrel:confluence', depthM: 1.6 });
    await p.ensureFloor();
    readAt(p, 0);
    expect(p.stateFor(body(2.0))).toBe('wading');
    expect(p.stateFor(body(1.75))).toBe('swimming');
    expect(p.stateFor(body(1.0))).toBe('swimming');
  });

  it('knee-deep water is wading for everybody; a body with no stature reads the place', async () => {
    const p = makeStuff(() => new Pool());
    p.setWater({ of: 'kestrel:confluence', depthM: 0.5 });
    await p.ensureFloor();
    readAt(p, 0);
    expect(p.stateFor(body(1.0))).toBe('wading');
    expect(p.stateFor(body(0))).toBe(p.stateNow());
  });

  it('the floor bears the body the water does not cover, and not the one it does', async () => {
    const p = makeStuff(() => new Pool());
    p.setWater({ of: 'kestrel:confluence', depthM: 1.2 });
    await p.ensureFloor();
    readAt(p, 0);
    const floor = p.getFloor() as unknown as WaterSurface;
    vi.spyOn(floor as unknown as { getAdornedTo(): unknown }, 'getAdornedTo').mockReturnValue(p);
    const tall = body(1.75);
    const gnome = body(1.0);
    expect(floor.canOccupy(tall as never, 'ground:1')).toBe(true);
    expect(floor.canOccupy(gnome as never, 'ground:1')).toBe(false);
  });
});
