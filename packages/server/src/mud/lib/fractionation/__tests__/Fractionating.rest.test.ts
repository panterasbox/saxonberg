/**
 * ⭐ A charge that must STAND before it separates (dairy D4), and a residue
 * that DERIVES from the charge (dairy D3): a setting pan of milk gives back
 * milk until the cream has risen, then gives skim and stops at the cream —
 * and a richer milk leaves more cream from the same schedule row.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BulkableApi } from '../../../api/bulk';
import Good from '../../stuff/Good';
import { BulkableMixin } from '../../bulk/Bulkable';
import { CraftedMixin } from '../../craft/Crafted';
import { ThermalMixin } from '../../thermal/Thermal';
import { FractionatingMixin } from '../Fractionating';
import FractionSchedule from '../FractionSchedule';
import Material from '../../material/Material';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

class TestPan extends FractionatingMixin(ThermalMixin(CraftedMixin(BulkableMixin(Good)))) {
  static _mixinName = 'FractionatingRestTestPan';
}
class Pail extends CraftedMixin(BulkableMixin(Good)) {
  static _mixinName = 'FractionatingRestTestPail';
}

const DAY = 86_400;
const BASE = 40_000_000;
let now = BASE;
const setNow = (s: number): void => {
  now = BASE + s;
};

const ROOT = '/stuff/idea/fraction-rest-test/idea';
const THIN = `${ROOT}/material/thin-milk`;
const RICH = `${ROOT}/material/rich-milk`;
const SKIM = `${ROOT}/material/skim`;
const CREAM = `${ROOT}/material/cream`;
const PLAIN = `${ROOT}/material/plain-charge`;
const PLAIN_OUT = `${ROOT}/material/plain-out`;

let stood = false;
function standFixtures(): void {
  if (stood) return;
  stood = true;
  const mat = (path: string, tags: string[], fat = 0): void => {
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName(path.split('/').pop()!);
      m.setTags(tags);
      if (fat > 0) m.setNutrientAmounts({ fat, protein: 33000 });
      return m;
    }, path);
  };
  mat(THIN, ['liquid', 'rest-milk'], 34000);
  mat(RICH, ['liquid', 'rest-milk'], 70000);
  mat(SKIM, ['liquid']);
  mat(CREAM, ['liquid']);
  mat(PLAIN, ['liquid', 'rest-plain']);
  mat(PLAIN_OUT, ['liquid']);

  makeStuffAtPath(() => {
    const s = new FractionSchedule();
    s.setKey('rest-setting');
    s.setInputCategory('rest-milk');
    s.setSeparation('fractions');
    s.setRequiresHeatK(0);
    s.setRestDays(0.2);
    // ⚠ A `fractions` schedule still names a product: the run swaps the
    // interior to it at the start (crude.yaml does the same).
    s.setProductMaterial(SKIM);
    s.setResidueMaterial(CREAM);
    s.setResidueShare({ nutrients: { fat: 2.5 } });
    s.setFractions([
      { key: 'skim', upTo: 0.9, material: SKIM, character: 'Thin and blue.', gradeBand: 'fine' },
    ]);
    return s;
  }, `${ROOT}/fractionation/rest-setting`);

  // A schedule with NO rest and no derived residue — the shipped still shape.
  makeStuffAtPath(() => {
    const s = new FractionSchedule();
    s.setKey('rest-plain');
    s.setInputCategory('rest-plain');
    s.setRequiresHeatK(0);
    s.setProductMaterial(PLAIN_OUT);
    s.setFractions([
      { key: 'all', upTo: 0.9, character: 'Plain.', gradeBand: 'fine' },
    ]);
    return s;
  }, `${ROOT}/fractionation/rest-plain`);
}

function pan(materialPath: string, litres = 10): TestPan {
  const p = makeStuff(() => new TestPan());
  (p as unknown as { interiorBulk: boolean }).interiorBulk = true;
  p.setInteriorCapacity(Quantity.of(20, 'L'));
  p.setStampedTemperatureK(285);
  p.setLastAmbientK(285);
  (p as unknown as { interiorMaterial: string }).interiorMaterial = materialPath;
  p.setInteriorAmount(Quantity.of(litres, 'L'));
  return p;
}

function pail(): Pail {
  const p = makeStuff(() => new Pail());
  (p as unknown as { interiorBulk: boolean }).interiorBulk = true;
  p.setInteriorCapacity(Quantity.of(100, 'L'));
  return p;
}

function drawAll(from: TestPan): { applied: number; into: Pail } {
  const into = pail();
  const res = BulkableApi.transfer(
    BulkableApi.slotFor(from, undefined)!,
    BulkableApi.slotFor(into, undefined)!,
    { kind: 'all' },
  );
  return { applied: res.applied, into };
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  setNow(0);
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
  standFixtures();
});
afterEach(() => {
  WorldClockApi._resetForTesting();
});

describe('a charge that must stand', () => {
  it('poured off before the rest, it is milk', () => {
    const p = pan(THIN);
    p.reconcileRun();
    expect(p.getRunPhase()).toBe('charged');
    setNow(0.1 * DAY);
    const { applied, into } = drawAll(p);
    expect(applied).toBeCloseTo(10, 6);
    expect(into.getBulkMaterialPath('interior')).toBe(THIN);
  });

  it('after the rest it gives skim and stops at the cream', () => {
    const p = pan(THIN);
    p.reconcileRun();
    setNow(0.25 * DAY);
    expect(p.getRunPhase()).toBe('running');
    const { applied, into } = drawAll(p);
    expect(into.getBulkMaterialPath('interior')).toBe(SKIM);
    // Cream share = fat 3.4 % × 2.5 = 0.085 of the charge.
    expect(applied).toBeCloseTo(10 * (1 - 0.085), 4);
    expect(p.getRunPhase()).toBe('spent');
    expect(p.getBulkMaterialPath('interior')).toBe(CREAM);
    expect(p.getBulkAmount('interior').rawValue()).toBeCloseTo(0.85, 4);
  });

  it('a richer milk leaves more cream from the same row', () => {
    const thin = pan(THIN);
    const rich = pan(RICH);
    thin.reconcileRun();
    rich.reconcileRun();
    setNow(0.25 * DAY);
    drawAll(thin);
    drawAll(rich);
    expect(rich.getBulkAmount('interior').rawValue()).toBeGreaterThan(
      thin.getBulkAmount('interior').rawValue() * 1.5,
    );
  });
});

describe('a schedule with no rest', () => {
  it('runs at once and keeps its literal residue', () => {
    const p = pan(PLAIN);
    p.reconcileRun();
    expect(p.getRunPhase()).toBe('running');
    const { applied } = drawAll(p);
    expect(applied).toBeCloseTo(9, 6);
  });
});
