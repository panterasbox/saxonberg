/**
 * ⭐ A pour may change what a batch IS (dairy D7) — rennet into working
 * milk makes it a renneted batch, whatever the order of rennet and starter
 * — plus the two other dairy seams on the batch: the SCALD mark (D6) and
 * the spoilage HOLD (D2), and the `madeFrom` memory (D3).
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Vat from '../../../platform/thing/Vat';
import MaturationProfile from '../../../platform/idea/maturation/MaturationProfile';
import Material from '../../material/Material';
import { WorldClockApi } from '../../../api/worldclock';
import { BulkableApi } from '../../../api/bulk';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import '../../../platform/idea/WorldClockRegistry';

const HOUR = 3600;
const DAY = 86_400;
const BASE = 30_000_000;
let now = BASE;
function setNow(s: number): void {
  now = BASE + s;
}

const ROOT = '/stuff/idea/maturation-transform-test/idea';
const MILK = `${ROOT}/material/t-milk`;
const RENNETED = `${ROOT}/material/t-renneted`;
const RENNET = `${ROOT}/material/t-rennet`;
const WHEY = `${ROOT}/material/t-whey`;
const SOFT = `${ROOT}/material/t-soft-curd`;
const FIRM = `${ROOT}/material/t-firm-curd`;
const WATER = `${ROOT}/material/t-water`;

let stood = false;
function standFixtures(): void {
  if (stood) return;
  stood = true;
  const mat = (path: string, tags: string[], nutrients: Record<string, number> = {}): void => {
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName(path.split('/').pop()!);
      m.setTags(tags);
      m.setNutrientAmounts(nutrients);
      return m;
    }, path);
  };
  mat(MILK, ['liquid', 't-milk'], { fat: 34000, protein: 33000, sugar: 48000 });
  mat(RENNETED, ['liquid', 't-renneted']);
  mat(RENNET, ['liquid', 't-coagulant']);
  mat(WHEY, ['liquid', 't-whey'], { sugar: 45000 });
  mat(SOFT, ['t-soft-curd']);
  mat(FIRM, ['t-firm-curd']);
  mat(WATER, ['liquid']);

  const curd = (key: string, input: string, lees: string, transforms: boolean): void => {
    makeStuffAtPath(() => {
      const p = new MaturationProfile();
      p.setKey(key);
      p.setInputCategory(input);
      p.setStallBelowK(288);
      p.setHappyK(303);
      p.setDamageAboveK(345);
      p.setRatePerDay(4);
      p.setProductMaterial(WHEY);
      p.setWildStrain('t-lactic');
      p.setSpontaneousLagDays(1);
      p.setKillK(318);
      p.setLeesMaterial(lees);
      p.setLeesShare({ nutrients: { fat: 1.6, protein: 1.6 } });
      p.setScaldAboveK(355);
      if (transforms) p.setTransforms([{ category: 't-coagulant', becomes: RENNETED }]);
      return p;
    }, `${ROOT}/maturation/${key}`);
  };
  curd('t-soft-curd', 't-milk', SOFT, true);
  curd('t-firm-curd', 't-renneted', FIRM, false);

  // The kept starter: a crock of whey is a living culture.
  makeStuffAtPath(() => {
    const p = new MaturationProfile();
    p.setKey('t-whey-starter');
    p.setKind('culture');
    p.setStrain('t-lactic');
    p.setInputCategory('t-whey');
    p.setStallBelowK(280);
    p.setHappyK(303);
    p.setDamageAboveK(315);
    p.setKillK(318);
    p.setStarveDays(6);
    return p;
  }, `${ROOT}/maturation/t-whey-starter`);
}

function makeVat(tempK: number, capacityL = 50): Vat {
  const vat = makeStuff(() => new Vat());
  vat.setInteriorCapacity(Quantity.of(capacityL, 'L'));
  vat.lastAmbientK = tempK;
  vat.stampedTemperatureK = tempK;
  return vat;
}

function fill(vat: Vat, materialPath: string, litres: number): void {
  vat.setBulkMaterial('interior', StuffApi.findByTemplatePath<Material>(materialPath)!);
  vat.setBulkAmount('interior', Quantity.of(litres, 'L'));
}

function pour(from: Vat, to: Vat, litres: number) {
  return BulkableApi.transfer(
    BulkableApi.slotFor(from, undefined)!,
    BulkableApi.slotFor(to, undefined)!,
    { kind: 'measure', litres, mode: 'lenient' },
  );
}

function starter(): Vat {
  const crock = makeVat(295, 2);
  fill(crock, WHEY, 1);
  crock.getMaturationPhase();
  expect(crock.getBatchStrain()).toBe('t-lactic');
  return crock;
}

function rennetJar(): Vat {
  const jar = makeVat(295, 1);
  fill(jar, RENNET, 0.5);
  return jar;
}

function milkVat(tempK = 300): Vat {
  const vat = makeVat(tempK);
  fill(vat, MILK, 10);
  vat.getMaturationPhase();
  return vat;
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

describe('a pour that changes what a batch is', () => {
  it('rennet into a pitched milk batch rekeys it, keeping strain, days and mark', () => {
    const vat = milkVat();
    vat.setMaker('/agent/test-cheesemaker');
    expect(vat.getMaturationProfileKey()).toBe('t-soft-curd');
    pour(starter(), vat, 0.2);
    expect(vat.getBatchStrain()).toBe('t-lactic');
    setNow(HOUR);
    vat.getMaturationPhase();
    const daysBefore = vat.batchDays;
    expect(daysBefore).toBeGreaterThan(0);

    const res = pour(rennetJar(), vat, 0.05);
    expect(res.applied).toBeCloseTo(0.05, 9);
    expect(vat.getBulkMaterialPath('interior')).toBe(RENNETED);
    expect(vat.getMaturationProfileKey()).toBe('t-firm-curd');
    expect(vat.getMaturationPhase()).toBe('active');
    expect(vat.getBatchStrain()).toBe('t-lactic');
    expect(vat.batchDays).toBe(daysBefore);
    expect(vat.getMaker()).toBe('/agent/test-cheesemaker');
    // The volume joined the batch — a transform is matter added.
    expect(vat.getBulkAmount('interior').rawValue()).toBeCloseTo(10.25, 6);
  });

  it('rennet first, then the starter, reaches the same state', () => {
    const vat = milkVat();
    pour(rennetJar(), vat, 0.05);
    expect(vat.getMaturationProfileKey()).toBe('t-firm-curd');
    expect(vat.getBatchStrain()).toBe('');
    pour(starter(), vat, 0.2);
    expect(vat.getBatchStrain()).toBe('t-lactic');
    expect(vat.getMaturationProfileKey()).toBe('t-firm-curd');
  });

  it('a foreign pour that is not a coagulant still declines as a mismatch', () => {
    const vat = milkVat();
    const water = makeVat(295, 2);
    fill(water, WATER, 1);
    const res = pour(water, vat, 0.5);
    expect(res.status).toBe('declined');
    expect(res.notes.some((n) => (n as { reason?: string }).reason === 'material-mismatch')).toBe(true);
    expect(vat.getBulkMaterialPath('interior')).toBe(MILK);
  });

  it('the batch remembers what it was made from, across the rekey', () => {
    const vat = milkVat();
    expect(vat.getBulkPayload('interior')?.madeFrom).toBe(MILK);
    pour(rennetJar(), vat, 0.05);
    expect(vat.getBulkPayload('interior')?.madeFrom).toBe(MILK);
  });
});

describe('the scald mark', () => {
  it('a batch that went past the scald sets badly; a pasteurizing hold does not', () => {
    const boiled = milkVat(360);
    const scalded = milkVat(336);
    setNow(HOUR);
    boiled.getMaturationPhase();
    scalded.getMaturationPhase();
    expect(boiled.getBatchPeakK()).toBeGreaterThan(355);
    expect(scalded.getBatchPeakK()).toBeLessThan(355);
    const band = (v: unknown): string =>
      (v as { getGradeBand(): string }).getGradeBand();
    expect(band(boiled)).toBe('poor');
    expect(band(scalded)).not.toBe('poor');
  });
});

describe('the spoilage hold', () => {
  it('holds while a strain works, not while the batch is sterile', () => {
    const vat = milkVat();
    expect(vat.holdsSpoilage()).toBe(false);
    pour(starter(), vat, 0.2);
    expect(vat.holdsSpoilage()).toBe(true);
  });

  it('a live culture holds; a starved one does not', () => {
    const crock = starter();
    expect(crock.holdsSpoilage()).toBe(true);
    setNow(10 * DAY);
    expect(crock.getViability()).toBe(0);
    expect(crock.holdsSpoilage()).toBe(false);
  });
});
