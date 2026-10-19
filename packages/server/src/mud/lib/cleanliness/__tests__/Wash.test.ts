/**
 * ⭐⭐ The wash (cleanliness D10, AC 4–6, 9) — chemistry, not a reset:
 * mud to water and time, grease only to soap or an alkali, blood cold
 * first (hot water SETS it, and then only a bleach answers), soap scums in
 * hard water and soda softens it; and what washing does to CLOTH — boiled
 * wool felts and shrinks, hot linen shrinks, a corrosive eats the fibre,
 * an unfast red bleeds onto the whites, and everything comes out wet.
 */

import '../../../../test-bootstrap';
import { installDirtKinds } from './soil-fixtures';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Garment from '../../../platform/thing/equipment/Garment';
import Material from '../../material/Material';
import { Construction } from '../../material/Construction';
import type { CleanserDescriptor } from '../../../platform/idea/Cleanser';
import { Template } from '../../stuff/Template';
import { TemplatePaths } from '../../paths';
import { StuffApi } from '../../../api/stuff';
import type { WashCleanser, WashSpec } from '../Soilable';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const DIRT = [
  { key: 'mud', form: 'film', answersTo: ['surfactant', 'alkali-mild', 'abrasive'], waterLifts: 0.7, brushLifts: 0.5 },
  { key: 'grease', form: 'film', answersTo: ['surfactant', 'alkali-mild', 'alkali-strong', 'solvent'], waterLifts: 0.05 },
  {
    key: 'blood', form: 'stain', setsAboveK: 318, waterLifts: 0.5,
    answersTo: ['surfactant', 'alkali-mild', 'oxidiser-slow', 'oxidiser'],
    setAnswersTo: ['oxidiser-slow', 'oxidiser'],
  },
];

function cleanser(over: Partial<CleanserDescriptor> & { key: string; action: CleanserDescriptor['action'] }, materialPath: string | null = null): WashCleanser {
  return {
    row: {
      agent: over.key, damages: [], hardWaterPenalty: false, softens: false,
      consumesPerWash: 0, skinHarshness: 0, ambient: false, ...over,
    } as CleanserDescriptor,
    materialPath,
  };
}
const SOAP = cleanser({ key: 'soap', action: 'surfactant', hardWaterPenalty: true });
const SODA = cleanser({ key: 'washing-soda', action: 'alkali-mild', softens: true });
const BLEACH = cleanser({ key: 'sulfur-fume', action: 'oxidiser' });

const spec = (over: Partial<WashSpec> = {}): WashSpec => ({
  waterK: 293, hardnessDgh: 4, cleansers: [], effort: 1, ...over,
});

let seq = 0;
function material(name: string, tags: string[], corrosiveTo: string[] = []): Material {
  const m = makeStuff(() => new Material());
  m.setName(name);
  m.setTags(tags);
  (m as unknown as { corrosiveTo: string[] }).corrosiveTo = corrosiveTo;
  stampTemplatePathForTest(m, `/stuff/idea/material/_test/${name}-${seq++}`);
  return m;
}

function garment(m: Material | null = null): Garment {
  const g = makeStuff(() => new Garment());
  if (m) g.setMaterial(m);
  return g;
}

beforeEach(async () => {
  installV1QuantityMarshallers();
  Construction.registerFabric({ key: 'woven', layerBand: 0, loft: 0.1, weaveDensity: 0.75, drape: 0.6 });
  Construction.registerFabric({ key: 'felted', layerBand: 1, loft: 0.6, weaveDensity: 0.9, drape: 0.3 });
  installDirtKinds(DIRT as Record<string, unknown>[]);
});
afterEach(() => {
  vi.restoreAllMocks();
  Construction.clearFabrics();
  StuffApi.clearAll();
});

describe('the chemistry (D10)', () => {
  it('⭐ mud comes out in water; grease does not, until soap', () => {
    const g = garment();
    g.soil('mud', 0.5);
    g.soil('grease', 0.5);
    g.washSite(spec());
    expect(g.soilLoad('mud')).toBeLessThan(0.2);
    expect(g.soilLoad('grease')).toBeGreaterThan(0.45);
    g.washSite(spec({ cleansers: [SOAP], waterK: 323 }));
    expect(g.soilLoad('grease')).toBeLessThan(0.1);
  });

  it('⭐⭐ blood: cold lifts it; hot SETS it, and then only a bleach answers', () => {
    const cold = garment();
    cold.soil('blood', 0.5);
    cold.washSite(spec({ waterK: 285, cleansers: [SOAP] }));
    expect(cold.soilLoad('blood')).toBeLessThan(0.15);

    const hot = garment();
    hot.soil('blood', 0.5);
    const out = hot.washSite(spec({ waterK: 333, cleansers: [SOAP] }));
    expect(out.setNow).toEqual(['blood']);
    expect(hot.isSoilSet('blood')).toBe(true);
    expect(hot.soilLoad('blood')).toBeGreaterThan(0.45);
    hot.washSite(spec({ waterK: 285, cleansers: [SOAP], effort: 3 }));
    expect(hot.soilLoad('blood')).toBeGreaterThan(0.45);
    hot.washSite(spec({ waterK: 285, cleansers: [BLEACH] }));
    expect(hot.soilLoad('blood')).toBeLessThan(0.15);
  });

  it('⭐ AC 9 — soap in hard water washes worse; soda softens it', () => {
    const soft = garment();
    const hard = garment();
    const softened = garment();
    for (const g of [soft, hard, softened]) g.soil('grease', 0.8);
    soft.washSite(spec({ hardnessDgh: 4, cleansers: [SOAP] }));
    hard.washSite(spec({ hardnessDgh: 16, cleansers: [SOAP] }));
    softened.washSite(spec({ hardnessDgh: 16, cleansers: [SOAP, SODA] }));
    expect(hard.soilLoad('grease')).toBeGreaterThan(soft.soilLoad('grease'));
    expect(softened.soilLoad('grease')).toBeLessThan(hard.soilLoad('grease'));
  });

  it('a scrub does more than a wash (time is the third contribution)', () => {
    const a = garment();
    const b = garment();
    a.soil('mud', 1);
    b.soil('mud', 1);
    a.washSite(spec({ waterK: 283 }));
    b.washSite(spec({ waterK: 283, effort: 3 }));
    expect(b.soilLoad('mud')).toBeLessThan(a.soilLoad('mud'));
  });

  it('the wash is RECORDED for the tiers', () => {
    const g = garment();
    g.washSite(spec({ waterK: 340, cleansers: [SOAP] }));
    expect(g.getWashStamp()).toMatchObject({ cleanserKey: 'soap', action: 'surfactant', waterK: 340 });
  });
});

describe('what washing does to cloth (D10, AC 4–5)', () => {
  it('⭐⭐ boiling felts wool — and felted wool is small', async () => {
    const wool = material('wool', ['textile', 'fibre', 'protein']);
    const jumper = garment(wool);
    jumper.setSlotClaim('/stuff/idea/species/BodyPlan/_t', ['torso']);
    jumper.setCutToBodyPlan('/stuff/idea/species/BodyPlan/_t');
    (jumper as unknown as { cutToStature: number }).cutToStature = 1.75;
    (jumper as unknown as { cutToGirth: number }).cutToGirth = 6.3;
    const out = jumper.washSite(spec({ waterK: 370 }));
    expect(out.damage).toContain('felted');
    await new Promise((r) => setTimeout(r, 0));
    expect(jumper.getConstructionForm()).toBe('felted');
    expect((jumper as unknown as { cutToStature: number }).cutToStature).toBeCloseTo(1.75 * 0.85, 3);
  });

  it('⭐ hot water shrinks linen a little; cold does not', () => {
    const linen = material('linen', ['textile', 'fibre', 'cellulose']);
    const shirt = garment(linen);
    shirt.setCutToBodyPlan('/stuff/idea/species/BodyPlan/_t');
    (shirt as unknown as { cutToStature: number }).cutToStature = 1.8;
    (shirt as unknown as { cutToGirth: number }).cutToGirth = 6;
    expect(shirt.washSite(spec({ waterK: 290 })).damage).not.toContain('shrunk');
    expect(shirt.washSite(spec({ waterK: 340 })).damage).toContain('shrunk');
    expect((shirt as unknown as { cutToStature: number }).cutToStature).toBeCloseTo(1.8 * 0.97, 3);
  });

  it('a garment that takes no water (rubber) neither shrinks nor felts', () => {
    const rubber = material('rubber', ['elastomer']);
    const glove = garment(rubber);
    const out = glove.washSite(spec({ waterK: 370 }));
    expect(out.damage).not.toContain('felted');
    expect(out.damage).not.toContain('shrunk');
  });

  it('⭐ the cleanser\'s material decides what it EATS — lye rots wool, not linen', () => {
    const lyeMaterial = material('lye', ['liquid', 'caustic', 'lye'], ['protein', 'tissue']);
    const LYE = cleanser({ key: 'lye', action: 'alkali-strong' }, lyeMaterial.getTemplatePath());
    const wool = garment(material('wool', ['textile', 'fibre', 'protein']));
    const linen = garment(material('linen', ['textile', 'fibre', 'cellulose']));
    const before = wool.getCondition();
    expect(wool.washSite(spec({ cleansers: [LYE] })).damage).toContain('burnt');
    expect(wool.getCondition()).toBeLessThan(before);
    expect(linen.washSite(spec({ cleansers: [LYE] })).damage).not.toContain('burnt');
  });

  it('⭐ an unfast red bleeds onto the whites in the same water', () => {
    const red = garment(material('linen', ['textile', 'fibre', 'cellulose']));
    red.applyDye({ dyestuff: '/m/madder', mordant: '', strength: 0.9, transmitR: 0.9, transmitG: 0.2, transmitB: 0.2 });
    red.setFastness(0.1);
    const white = garment(material('linen', ['textile', 'fibre', 'cellulose']));
    const out = red.washSite(spec({ coWashed: [red, white] }));
    expect(out.damage).toContain('bled');
    expect(white.getDyeStack().length).toBe(1);
    expect(white.getDyeStack()[0]!.strength).toBeGreaterThan(0);
  });

  it('⭐ AC 5 — it comes out soaked', () => {
    const g = garment(material('wool', ['textile', 'fibre', 'protein']));
    g.washSite(spec());
    expect(g.getWetnessBand()).toBe('soaked');
  });
});

describe('⭐ brush what is loose, wash a film, bleach a stain (B46)', () => {
  it('a brushing takes the dried mud off a coat and leaves the grease for the wash', () => {
    const coat = garment();
    coat.soil('mud', 0.6);
    coat.soil('grease', 0.3);
    const removed = coat.brushOff(3);
    expect(removed.mud).toBeGreaterThan(0);
    expect(coat.soilLoad('mud')).toBeLessThan(0.6);
    expect(coat.soilLoad('grease')).toBeCloseTo(0.3, 5);
  });

  it('a SET stain gives nothing to a brush', () => {
    const shirt = garment();
    shirt.soil('blood', 0.5);
    shirt.washSite(spec({ waterK: 330 }), '');
    const before = shirt.soilLoad('blood');
    expect(shirt.brushOff(3).blood).toBeUndefined();
    expect(shirt.soilLoad('blood')).toBeCloseTo(before, 5);
  });
});

