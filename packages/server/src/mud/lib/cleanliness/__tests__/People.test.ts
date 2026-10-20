/**
 * ⭐ Somebody is paid for it (cleanliness W6, D26–D29): a hand's band
 * chooses her method and the cloth decides what the method does to it —
 * a novice boils a wool jumper and felts it, a competent laundress washes
 * it lukewarm; she names what she can see; the doorman turns away a
 * working apron in words and admits the same person in a coat; a bath
 * washes the whole body and soaks what it has on.
 */

import '../../../../test-bootstrap';
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
import { WashPolicy } from '../WashPolicy';
import { MixinApi } from '../../../api/mixin';
import { brain as doorman } from '../../behavior/doorman';
import { soilBody, wear, installDirtKinds } from './soil-fixtures';

const DIRT = [
  { key: 'mud', form: 'film', answersTo: ['surfactant', 'alkali-mild', 'abrasive'], waterLifts: 0.7 },
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



describe("the hand's band chooses the method (D26)", () => {
  it('⭐⭐ a novice boils the wool jumper and felts it; a competent hand does not', () => {
    const woolM = material('wool', ['textile', 'fibre', 'protein']);
    const a = garment(woolM);
    const b = garment(woolM);
    const subject = { wool: true, blood: false };
    const novice = new WashPolicy('novice').methodFor(subject);
    const competent = new WashPolicy('competent').methodFor(subject);
    expect(a.washSite(spec({ waterK: novice.waterK, cleansers: [SOAP], effort: novice.effort })).damage)
      .toContain('felted');
    expect(b.washSite(spec({ waterK: competent.waterK, cleansers: [SOAP], effort: competent.effort })).damage)
      .not.toContain('felted');
  });

  it('blood goes in cold for a hand that knows; untrained reaches for lye', () => {
    expect(new WashPolicy('competent').methodFor({ wool: false, blood: true }).waterK).toBeLessThan(300);
    expect(new WashPolicy('untrained').methodFor({ wool: false, blood: false }).reachesFor).toBe('lye');
  });

  it('⭐ she names the fibre and the dirt only at a band that reads cloth', () => {
    const shirt = garment(material('linen', ['textile', 'fibre', 'plant']));
    shirt.soil('mud', 1);
    const read = shirt.describeForLaundress(new WashPolicy('competent'));
    expect(read.said.toLowerCase()).toContain('linen');
    const blind = shirt.describeForLaundress(new WashPolicy('untrained'));
    expect(blind.said.toLowerCase()).not.toContain('linen');
    expect(blind.said).toMatch(/boil/);
  });
});

describe('the doorman says why (D29)', () => {
  const config = {
    regardAdmits: 60,
    dressCode: {
      turnsAway: [
        { outer: ['apron'], where: 'torso', say: 'Not in your working clothes.' },
        { soiledAbove: 'marked', say: 'Not in that state.' },
      ],
    },
  };

  const door = { getKeptBy: () => '/test/house' };
  /** A keeper on shift for the door's house (no regard store). */
  const onShift = (): never => {
    const h = makeStuff(() => new Garment());
    vi.spyOn(MixinApi, 'isEmployed').mockReturnValue(true);
    (h as unknown as { isOnShiftFor: (p: string) => boolean }).isOnShiftFor = (p) => p === '/test/house';
    return h as never;
  };

  it('off shift he is a man in a coat — the door is just a door', () => {
    const body = soilBody();
    wear(body, 'torso').setKeywords(['apron']);
    expect(doorman.judge(makeStuff(() => new Garment()), body, config, door)).toEqual({ admit: true });
  });

  it('⭐⭐ an apron is turned away in words; a coat on the same body is let by', () => {
    const body = soilBody();
    const apron = wear(body, 'torso');
    apron.setKeywords(['apron']);
    const host = onShift();
    const refused = doorman.judge(host, body, config, door);
    expect(refused).toEqual({ admit: false, reason: 'Not in your working clothes.' });
    apron.setKeywords(['coat']);
    expect(doorman.judge(host, body, config, door)).toEqual({ admit: true });
  });

  it('a filthy coat is turned away too', () => {
    const body = soilBody();
    const coat = wear(body, 'torso');
    coat.setKeywords(['coat']);
    coat.soil('mud', 5);
    expect(doorman.judge(onShift(), body, config, door).admit).toBe(false);
  });
});

describe('a bath (D28)', () => {
  it('⭐ washes the whole body and soaks what it has on', () => {
    const body = soilBody();
    body.soil('mud', 1, null, 'body.leg.left.foot');
    const shirt = wear(body, 'torso');
    body.bathe({ waterK: 315, hardnessDgh: 4, cleansers: [SOAP], effort: 2 }, 120);
    expect(body.soilLoad('mud', 'body.leg.left.foot')).toBeLessThan(0.3);
    expect(shirt.getWetness()).toBeGreaterThan(0.5);
  });

  it('⭐ a hot bath does not SET blood on the skin (the drive: bathed from the copper, hands still bloodied)', () => {
    const body = soilBody();
    const hand = body.handSites()[0]!;
    body.soil('blood', 1, null, hand);
    body.bathe({ waterK: 330, hardnessDgh: 4, cleansers: [SOAP], effort: 2 }, 120);
    expect(body.isSoilSet('blood', hand)).toBe(false);
    expect(body.soilLoad('blood', hand)).toBeLessThan(0.3);
  });
});
