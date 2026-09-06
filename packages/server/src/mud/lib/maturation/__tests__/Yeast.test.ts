/**
 * Yeast, wild and kept (fermentation W2 — D14/P12): the sterile-open
 * lambic lag vs the pitched immediate start; the hot pitch that kills
 * and never starts; the culture jar's starve/feed/cellar viability;
 * lager's strain + band gate; and the lees split at the rack — the
 * residual IS the culture, and its jar traces back to the batch it was
 * harvested from (mark + strain).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Vat from '../../../platform/thing/Vat';
import MaturationProfile from '../../../platform/idea/maturation/MaturationProfile';
import Material from '../../material/Material';
import type { Crafted } from '../../craft/Crafted';
import { WorldClockApi } from '../../../api/worldclock';
import { BulkableApi } from '../../../api/bulk';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import '../../../platform/idea/WorldClockRegistry';

const DAY = 86_400;
const BASE = 20_000_000;
let now = BASE;
function setNow(gameSeconds: number): void {
  now = BASE + gameSeconds;
}

const ROOT = '/stuff/idea/yeast-test/idea';
const WORT = `${ROOT}/material/test-wort`;
const ALE = `${ROOT}/material/test-ale`;
const LEES = `${ROOT}/material/test-lees`;
const COLD_WORT = `${ROOT}/material/test-cold-wort`;
const LAGER = `${ROOT}/material/test-lager`;
const WORT_PROFILE = `${ROOT}/maturation/test-ale`;
const LAGER_PROFILE = `${ROOT}/maturation/test-lager`;
const CULTURE_PROFILE = `${ROOT}/maturation/test-culture`;

let stood = false;
function standFixtures(): void {
  if (stood) return;
  stood = true;
  const mat = (
    path: string,
    name: string,
    tags: string[],
    sugar = 0,
  ): void => {
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName(name);
      m.setTags(tags);
      if (sugar > 0) {
        m.setNutrients(['water', 'sugar']);
        m.setNutrientAmounts({ sugar });
      }
      return m;
    }, path);
  };
  mat(WORT, 'test wort', ['liquid', 'test-wort'], 180);
  mat(ALE, 'test ale', ['liquid', 'ale']);
  mat(LEES, 'test lees', ['liquid', 'test-lees']);
  mat(COLD_WORT, 'test cold wort', ['liquid', 'test-cold-wort'], 160);
  mat(LAGER, 'test lager', ['liquid', 'lager']);

  // A boiled wort is STERILE: it waits 4 open days for wild flora,
  // or takes a pitch at once; its yeast dies above 310 K.
  makeStuffAtPath(() => {
    const p = new MaturationProfile();
    p.setKey('test-ale');
    p.setInputCategory('test-wort');
    p.setStallBelowK(285);
    p.setHappyK(291);
    p.setDamageAboveK(300);
    p.setRatePerDay(0.2);
    p.setProductMaterial(ALE);
    p.setSpontaneousLagDays(4);
    p.setKillK(310);
    p.setLeesFraction(0.04);
    p.setLeesMaterial(LEES);
    return p;
  }, WORT_PROFILE);

  // Lager: REQUIRES the cold strain, and refuses to work warm at all
  // (authored dormancy above 288 K) — the strain plus the cellar.
  makeStuffAtPath(() => {
    const p = new MaturationProfile();
    p.setKey('test-lager');
    p.setInputCategory('test-cold-wort');
    p.setStallBelowK(275);
    p.setHappyK(282);
    p.setDamageAboveK(288);
    p.setStallAboveK(288);
    p.setRatePerDay(0.1);
    p.setProductMaterial(LAGER);
    p.setSpontaneousLagDays(4);
    p.setRequiresStrain('test-cold-strain');
    return p;
  }, LAGER_PROFILE);

  // The kept culture: lees in a jar, viability its aliveness.
  makeStuffAtPath(() => {
    const p = new MaturationProfile();
    p.setKey('test-culture');
    p.setKind('culture');
    p.setStrain('test-ale-strain');
    p.setInputCategory('test-lees');
    p.setStallBelowK(285);
    p.setHappyK(293);
    p.setDamageAboveK(299);
    p.setKillK(310);
    p.setStarveDays(10);
    return p;
  }, CULTURE_PROFILE);
}

function makeVat(tempK: number, capacityL = 100): Vat {
  const vat = makeStuff(() => new Vat());
  vat.setInteriorCapacity(Quantity.of(capacityL, 'L'));
  vat.lastAmbientK = tempK;
  vat.stampedTemperatureK = tempK;
  return vat;
}

function fill(vat: Vat, materialPath: string, litres: number): void {
  const m = StuffApi.findByTemplatePath<Material>(materialPath)!;
  vat.setBulkMaterial('interior', m);
  vat.setBulkAmount('interior', Quantity.of(litres, 'L'));
}

/** A jar holding a LIVING test-ale culture (its own little vat). */
function makeCultureJar(tempK: number): Vat {
  const jar = makeVat(tempK, 2);
  fill(jar, LEES, 1);
  jar.getMaturationPhase(); // key the culture batch
  expect(jar.getBatchStrain()).toBe('test-ale-strain');
  return jar;
}

function pour(from: Vat, to: Vat, litres: number) {
  const fromSlot = BulkableApi.slotFor(from, undefined)!;
  const toSlot = BulkableApi.slotFor(to, undefined)!;
  return BulkableApi.transfer(fromSlot, toSlot, {
    kind: 'measure',
    litres,
    mode: 'lenient',
  });
}

beforeEach(() => {
  WorldClockApi._resetForTesting();
  setNow(0);
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
  standFixtures();
});
afterEach(() => {
  WorldClockApi._resetForTesting();
});

describe('wild vs pitched (D14 — the lambic lag)', () => {
  it('an OPEN sterile wort starts after the authored lag, with wild character', () => {
    const vat = makeVat(291);
    fill(vat, WORT, 50);
    vat.open();
    vat.getMaturationPhase();
    setNow(3 * DAY);
    expect(vat.getFractionConverted()).toBe(0); // still waiting
    expect(vat.getBatchStrain()).toBe('');
    setNow(5 * DAY); // lag 4 landed inside this window
    vat.getMaturationPhase();
    setNow(6 * DAY);
    expect(vat.getBatchStrain()).toBe('wild');
    expect(vat.getFractionConverted()).toBeGreaterThan(0);
  });

  it('a SEALED sterile wort never starts', () => {
    const vat = makeVat(291); // default closed
    fill(vat, WORT, 50);
    vat.getMaturationPhase();
    setNow(20 * DAY);
    expect(vat.getFractionConverted()).toBe(0);
    expect(vat.getBatchStrain()).toBe('');
    expect(vat.getMaturationPhase()).toBe('active'); // waiting, not dead
  });

  it('a pitched wort starts at once, carrying the culture strain through the pour', () => {
    const jar = makeCultureJar(288);
    const vat = makeVat(291);
    fill(vat, WORT, 50);
    vat.getMaturationPhase();

    const res = pour(jar, vat, 0.2);
    expect(res.applied).toBeCloseTo(0.2, 9);
    expect(vat.getBatchStrain()).toBe('test-ale-strain');
    // The pitched volume joined the batch; the material stayed the wort.
    expect(vat.getBulkAmount('interior').rawValue()).toBeCloseTo(50.2, 9);
    expect(vat.getBulkMaterialPath('interior')).toBe(WORT);

    setNow(1 * DAY);
    expect(vat.getFractionConverted()).toBeCloseTo(0.2, 9); // immediate
  });

  it('a hot pitch kills — and nothing starts', () => {
    const jar = makeCultureJar(288);
    const vat = makeVat(315); // above the culture killK 310
    fill(vat, WORT, 50);
    vat.getMaturationPhase();

    const res = pour(jar, vat, 0.2);
    expect(res.applied).toBeCloseTo(0.2, 9); // the culture is spent…
    expect(vat.getBatchStrain()).toBe(''); // …and dead on arrival
    setNow(2 * DAY);
    expect(vat.getFractionConverted()).toBe(0);
  });
});

describe('the kept culture (D14 — starve, feed, the cellar)', () => {
  it('a kitchen culture starves faster than a cellared one; feeding restores', () => {
    const kitchen = makeCultureJar(295); // in-band: full starve rate
    const cellar = makeCultureJar(283); // below stallBelowK: ×0.25
    setNow(5 * DAY); // starveDays 10 → kitchen 0.5, cellar 0.875
    expect(kitchen.getViability()).toBeCloseTo(0.5, 6);
    expect(cellar.getViability()).toBeCloseTo(0.875, 6);

    // Feeding the kitchen jar restores it (sugar into a culture = FEED).
    const wortJug = makeVat(295, 10);
    fill(wortJug, WORT, 2);
    const res = pour(wortJug, kitchen, 0.5);
    expect(res.applied).toBeCloseTo(0.5, 9);
    expect(kitchen.getViability()).toBeCloseTo(1, 6); // 0.5 + 0.5

    // Unfed past its window the cellared jar eventually dies…
    setNow(45 * DAY);
    expect(cellar.getViability()).toBe(0);
    expect(cellar.getBatchStrain()).toBe(''); // …and a dead jar pitches nothing
  });
});

describe("lager's gate (D14 — the cold strain plus the cold cellar)", () => {
  it('refuses wild, refuses warm, ferments cold on its strain', () => {
    // Wild: an open lager wort that catches wild flora still refuses.
    const wild = makeVat(283);
    fill(wild, COLD_WORT, 50);
    wild.open();
    wild.getMaturationPhase();
    setNow(6 * DAY); // wild lag landed
    wild.getMaturationPhase();
    setNow(10 * DAY);
    expect(wild.getBatchStrain()).toBe('wild');
    expect(wild.getFractionConverted()).toBe(0); // requiresStrain unmet

    // Warm: the right strain above stallAboveK converts nothing.
    const warm = makeVat(293);
    fill(warm, COLD_WORT, 50);
    warm.getMaturationPhase();
    warm.applyForeignPour('pitch', 'test-cold-strain', 0.1);
    expect(warm.getBatchStrain()).toBe('test-cold-strain');
    setNow(12 * DAY);
    expect(warm.getFractionConverted()).toBe(0);

    // Cold on the cold strain: it works.
    const cold = makeVat(282);
    fill(cold, COLD_WORT, 50);
    cold.getMaturationPhase();
    cold.applyForeignPour('pitch', 'test-cold-strain', 0.1);
    setNow(14 * DAY);
    expect(cold.getFractionConverted()).toBeGreaterThan(0);
  });
});

describe('the lees split at the rack (P12)', () => {
  it('the rack floor holds the lees back; the residual becomes the culture; the jar traces to the batch', () => {
    const vat = makeVat(291);
    fill(vat, WORT, 50);
    (vat as unknown as Crafted).setMaker('/stuff/agent/_test/brewer');
    vat.open();
    vat.getMaturationPhase();
    setNow(1 * DAY); // wait — sterile wort: pitch it instead
    vat.applyForeignPour('pitch', 'test-ale-strain', 0.1);
    setNow(7 * DAY); // 0.2/day → finished
    expect(vat.getMaturationPhase()).toBe('finished');
    expect(vat.getBulkMaterialPath('interior')).toBe(ALE);
    const lees = vat.getLeesVolumeL();
    expect(lees).toBeCloseTo(50 * 0.04, 9);

    // Racking draws product only down to the floor.
    const keg = makeVat(291);
    const res = pour(vat, keg, 100);
    expect(res.applied).toBeCloseTo(50 - lees, 9);
    expect(vat.getBulkAmount('interior').rawValue()).toBeCloseTo(lees, 9);
    // The racked keg carries the batch's mark (the W0 seam).
    expect((keg as unknown as Crafted).getMaker()).toBe(
      '/stuff/agent/_test/brewer',
    );

    // What is left IS the culture: the residual re-keys off the lees
    // material, whose profile carries the strain.
    expect(vat.getMaturationPhase()).toBe('active');
    expect(vat.getBulkMaterialPath('interior')).toBe(LEES);
    expect(vat.getBatchStrain()).toBe('test-ale-strain');

    // Harvest: pour the lees to a jar — the jar's batch carries the
    // strain AND the harvested batch's mark (the trace, D14).
    const jar = makeVat(288, 2);
    const harvest = pour(vat, jar, 1);
    expect(harvest.applied).toBeCloseTo(1, 9);
    expect(jar.getMaturationPhase()).toBe('active');
    expect(jar.getBatchStrain()).toBe('test-ale-strain');
    expect((jar as unknown as Crafted).getMaker()).toBe(
      '/stuff/agent/_test/brewer',
    );
  });
});
