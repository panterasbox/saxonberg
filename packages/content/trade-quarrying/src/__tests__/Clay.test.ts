/**
 * ⭐⭐ A lump of clay is a COMPOSITION, and it has a YEAR (ceramics M3, S2).
 *
 * What it is made of decides how plastic it is, whether it cracks drying,
 * the colour it fires and whether it stands a furnace; what was kneaded in
 * moves those; and a heap left out weathers by the days its place crossed
 * freezing — whole days only, up to a ceiling, and not at all indoors.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import Clay from '../thing/Clay';

class Yard extends Place {}

const DAY = 86_400;
let real = 0;
function advanceDays(days: number): void {
  const scale = WorldClockApi.getScale() || 1;
  real += (days * DAY * 1000) / scale;
}

let seq = 0;
function material(name: string, tags: string[], composition: { materialPath: string; fraction: number }[] = []): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setDensity(Quantity.of(1700, 'kg/m³'));
    m.setComposition(composition);
    return m;
  }, `/stuff/idea/material/_clay/${name}-${seq}`) as unknown as Material;
}

let mineral: Material;
let sand: Material;
let iron: Material;
let lime: Material;
let common: Material;
let fat: Material;
let fire: Material;

function lumpOf(mat: Material, kg = 12): Clay {
  return makeStuff(() => {
    const c = new Clay();
    c.setMass(Quantity.of(kg, 'kg'));
    c.setMaterial(mat);
    return c;
  });
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  real = 10_000_000;
  WorldClockApi._setNowProviderForTesting(() => real);
  if (!StuffApi.findByTemplatePath('/platform/idea/WorldClockRegistry')) {
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
  }
  mineral = material('clay-mineral', ['mineral', 'clay-mineral']);
  sand = material('sand', ['granular', 'silica']);
  iron = material('goethite', ['mineral', 'iron']);
  lime = material('limestone', ['rock', 'carbonate']);
  const p = (m: Material) => m.getTemplatePath()!;
  common = material('clay', ['earth', 'clay'], [
    { materialPath: p(mineral), fraction: 0.55 },
    { materialPath: p(sand), fraction: 0.3 },
    { materialPath: p(iron), fraction: 0.06 },
    { materialPath: p(lime), fraction: 0.03 },
  ]);
  fat = material('alluvial clay', ['earth', 'clay'], [
    { materialPath: p(mineral), fraction: 0.72 },
    { materialPath: p(sand), fraction: 0.12 },
    { materialPath: p(iron), fraction: 0.07 },
  ]);
  fire = material('fireclay', ['earth', 'clay'], [
    { materialPath: p(mineral), fraction: 0.8 },
    { materialPath: p(sand), fraction: 0.19 },
    { materialPath: p(iron), fraction: 0.01 },
  ]);
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('what a clay is made of', () => {
  it('plasticity, cracking, colour and heat all read off the composition', () => {
    const c = lumpOf(common);
    const f = lumpOf(fat);
    const fc = lumpOf(fire);
    expect(f.plasticity()).toBeGreaterThan(c.plasticity());
    expect(f.crackRisk()).toBeGreaterThan(c.crackRisk());
    expect(c.firedColor()).toBe('red');
    expect(fc.firedColor()).toBe('white');
    expect(fc.refractoriness()).toBe('refractory');
    expect(c.refractoriness()).toBe('common');
  });

  it('⭐ sand kneaded in (its alloying) opens a fat clay — it cracks less', () => {
    const f = lumpOf(fat);
    const before = f.crackRisk();
    // A temper of one part sand to three of clay, recorded as the lump's
    // whole make-up by mass (what the temper pit's blend writes).
    const eff = f.getEffectiveComposition();
    const blended = eff.map((e) => ({ ...e, fraction: e.fraction * 0.75 }));
    blended.push({ materialPath: sand.getTemplatePath()!, fraction: 0.25 });
    f.setAlloying(blended);
    expect(f.crackRisk()).toBeLessThan(before);
    expect(f.shares().opener).toBeGreaterThan(0.3);
  });
});

describe('a clay’s year', () => {
  it('⭐ a heap left out weathers by its place’s freeze-thaw days — whole days, to a ceiling', async () => {
    const yard = makeStuff(() => new Yard());
    const heap = lumpOf(common);
    await ContainmentApi.move(heap, yard);
    const spy = vi.spyOn(yard, 'freezeThawDaysSince');
    expect(heap.getWeatheredDays()).toBe(0); // first read stamps
    // Ten days, every one a crossing: whole days count, today's does not.
    spy.mockImplementation((atS: number) => Math.ceil((real * (WorldClockApi.getScale() || 1)) / 1000 / DAY) - Math.floor(atS / DAY));
    advanceDays(10);
    const ten = heap.getWeatheredDays();
    expect(ten).toBeGreaterThanOrEqual(9);
    expect(ten).toBeLessThanOrEqual(10);
    // A second read the same day counts nothing more.
    expect(heap.getWeatheredDays()).toBe(ten);
    advanceDays(200);
    expect(heap.getWeatheredDays()).toBe(40);
    // ⭐ And weathering mellows it.
    expect(heap.plasticity()).toBeGreaterThan(lumpOf(common).plasticity());
  });

  it('a heap kept indoors does not weather (its place holds its own air)', async () => {
    const shed = makeStuff(() => new Yard());
    const heap = lumpOf(common);
    await ContainmentApi.move(heap, shed);
    vi.spyOn(shed, 'freezeThawDaysSince').mockReturnValue(0);
    heap.getWeatheredDays();
    advanceDays(60);
    expect(heap.getWeatheredDays()).toBe(0);
  });

  it('two heaps pooled are mass-weighted — weathering and temper', () => {
    const a = lumpOf(common);
    const b = lumpOf(common);
    a.setWeatheredDays(40);
    b.setWeatheredDays(0);
    b.setAlloying([{ materialPath: sand.getTemplatePath()!, fraction: 0.2 }]);
    stampTemplatePathForTest(a, '/trade/quarrying/thing/clay');
    stampTemplatePathForTest(b, '/trade/quarrying/thing/clay');
    expect(a.canMergeWith(b)).toBe(true);
    a.setQuantity(2);
    a.onMerged(b);
    expect(a.getWeatheredDays()).toBeCloseTo(20, 6);
    expect(a.fractionOf(sand.getTemplatePath()!)).toBeCloseTo(0.1, 6);
  });
});
