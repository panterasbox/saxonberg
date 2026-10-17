/**
 * ⭐ A live ferment HOLDS the spoilage gauge (dairy D2) — and milk's own
 * spoilage constants land where the requirements say: about a game day
 * warm, several days cool.
 *
 * The hold is a declared shape (`SpoilageHolding`) the gauge asks of the
 * holder (a bulk slot) or the host (a discrete good). While held the stamp
 * moves and the load does not, so a release never bills the held span.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import Good from '../../stuff/Good';
import { BulkableMixin } from '../../bulk/Bulkable';
import { ThermalMixin } from '../../thermal/Thermal';
import Material from '../../material/Material';
import { Freshness } from '../Freshness';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

class PlainPot extends ThermalMixin(BulkableMixin(Good)) {
  static _mixinName = 'HoldTestPlainPot';
}

/** A pot that answers the hold — the shape a working vat answers. */
class HeldPot extends ThermalMixin(BulkableMixin(Good)) {
  static _mixinName = 'HoldTestHeldPot';
  public held = true;
  holdsSpoilage(): boolean {
    return this.held;
  }
}

const HOUR = 3600;
const DAY = 24 * HOUR;
const BASE = 1_000_000;
let now = BASE;
const setNow = (s: number): void => {
  now = BASE + s;
};

const MILK = '/stuff/idea/material/_test/hold-milk';

function milk(): Material {
  const found = StuffApi.findByTemplatePath<Material>(MILK);
  if (found) return found;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('milk');
    m.setEdibility(true);
    m.setNutrientAmounts({ fat: 34000, protein: 33000, sugar: 48000, water: 870000 });
    m.setSpecificHeat(Quantity.of(3930, 'J/(kg·K)'));
    // The shipped constants (dairy D2).
    m.setSpoilActivationEnergy(Quantity.of(60_000, 'J/mol'));
    m.setWaterActivity(0.99);
    return m;
  }, MILK) as unknown as Material;
}

function fill<T extends PlainPot | HeldPot>(make: () => T, tempK: number): T {
  const v = makeStuff(make);
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  v.setInteriorCapacity(Quantity.of(10, 'L'));
  v.setStampedTemperatureK(tempK);
  v.setLastAmbientK(tempK);
  (v as unknown as { interiorMaterial: string }).interiorMaterial = MILK;
  v.setInteriorAmount(Quantity.of(5, 'L'));
  return v;
}

/** Game-days until the slot's load first reaches `band`, stepping hourly. */
function daysTo(tempK: number, band: number): number {
  const slot = BulkableApi.slotFor(fill(() => new PlainPot(), tempK), undefined)!;
  setNow(0);
  new Freshness(slot).load(); // seed
  for (let h = 1; h <= 24 * 30; h++) {
    setNow(h * HOUR);
    if (new Freshness(slot).load() >= band) return h / 24;
  }
  return Infinity;
}

describe('the spoilage hold', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    milk();
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('milk turns in about a game day warm, and keeps several days cool', () => {
    const warm = daysTo(294, 0.25);
    const cool = daysTo(283, 0.25);
    expect(warm).toBeGreaterThanOrEqual(0.75);
    expect(warm).toBeLessThanOrEqual(1.5);
    expect(cool).toBeGreaterThanOrEqual(3);
  });

  it('a holding holder keeps its load across a warm week, and the stamp moves', () => {
    const pot = fill(() => new HeldPot(), 300);
    const slot = BulkableApi.slotFor(pot, undefined)!;
    new Freshness(slot).load(); // seed at 0
    new Freshness(slot).stampLoad(0.05);
    const before = slot.getPayload()?.freshness?.stamp ?? 0;
    setNow(7 * DAY);
    expect(new Freshness(slot).load()).toBe(0.05);
    expect(slot.getPayload()?.freshness?.stamp ?? 0).toBeGreaterThan(before);
  });

  it('released, it spoils from where it was — the held span is not billed', () => {
    const pot = fill(() => new HeldPot(), 300);
    const slot = BulkableApi.slotFor(pot, undefined)!;
    new Freshness(slot).load();
    new Freshness(slot).stampLoad(0.05);
    setNow(7 * DAY);
    expect(new Freshness(slot).load()).toBe(0.05);
    pot.held = false;
    setNow(7 * DAY + 2 * HOUR);
    const after = new Freshness(slot).load();
    expect(after).toBeGreaterThan(0.05);
    // Two hours of growth, not a week's.
    expect(after).toBeLessThan(0.25);
  });

  it('a holder that does not answer is not held', () => {
    const plain = BulkableApi.slotFor(fill(() => new PlainPot(), 300), undefined)!;
    new Freshness(plain).load();
    setNow(2 * DAY);
    expect(new Freshness(plain).load()).toBeGreaterThan(0.5);
  });
});
