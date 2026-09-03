/**
 * The spoilage gauge on a bulk slot — the blend half of `FreshnessMixin`,
 * and ⚠ the SPOILAGE subsystem's one impure seam: `lib/bulk` stores the
 * `freshness` field and knows nothing about it, exactly as it stores
 * `nutrients` without knowing metabolism. Hence this suite living beside
 * `Freshness.ts` rather than beside `Bulkable.ts`.
 * The load rides the MATTER (`BulkPayload.freshness`), so it travels with
 * a pour, blends by volume on every transfer, and folds a ptomaine dose in
 * at the ingest read. ⭐ The blend rule is what closes the pour-to-reset
 * exploit: decanting a spoiled pot into a clean bowl must not launder it.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import Thing from '../../stuff/Thing';
import { BulkableMixin } from '../../bulk/Bulkable';
import { ThermalMixin } from '../../thermal/Thermal';
import Material from '../../material/Material';
import { Freshness } from '../Freshness';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

class TestPot extends ThermalMixin(BulkableMixin(Thing)) {
  static _mixinName = 'TestPotFreshness';
}

const HOUR = 3600;
const DAY = 24 * HOUR;
const BASE = 1_000_000;
let now = BASE;
const setNow = (s: number): void => {
  now = BASE + s;
};

const BROTH = '/stuff/idea/material/_test/freshness-broth';
const WATER = '/stuff/idea/material/_test/freshness-water';

function ensureMaterial(path: string, ea: number): Material {
  const found = StuffApi.findByTemplatePath<Material>(path);
  if (found) return found;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.endsWith('broth') ? 'broth' : 'water');
    m.setAppearance(path.endsWith('broth') ? 'a rich broth' : 'clear water');
    m.setEdibility(true);
    m.setNutrients(['protein']);
    m.setNutrientAmounts({ protein: 12000 });
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setSpoilActivationEnergy(Quantity.of(ea, 'J/mol'));
    m.setWaterActivity(0.99);
    return m;
  }, path) as unknown as Material;
}

function pot(amountL: number, materialPath: string | null, tempK = 293): TestPot {
  const v = makeStuff(() => new TestPot());
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  v.setInteriorCapacity(Quantity.of(4, 'L'));
  v.setStampedTemperatureK(tempK);
  v.setLastAmbientK(tempK);
  if (materialPath && amountL > 0) {
    (v as unknown as { interiorMaterial: string }).interiorMaterial =
      materialPath;
    v.setInteriorAmount(Quantity.of(amountL, 'L'));
  }
  return v;
}

describe('the spoilage gauge on a bulk slot', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    ensureMaterial(BROTH, 80_000);
    ensureMaterial(WATER, 0); // tabulates nothing → inert
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('perishable matter grows a load on its own; inert matter never does', () => {
    const soup = BulkableApi.slotFor(pot(2, BROTH), undefined)!;
    const tap = BulkableApi.slotFor(pot(2, WATER), undefined)!;
    Freshness.loadOf(soup); // seeds the gauge
    Freshness.loadOf(tap);
    setNow(2 * DAY);
    expect(Freshness.loadOf(soup)).toBeGreaterThan(0.3);
    expect(Freshness.loadOf(tap)).toBe(0);
    // Sparse: the inert slot never acquired a payload at all.
    expect(tap.getPayload()).toBeNull();
  });

  it('the holder is the thermal host — a cold pot keeps', () => {
    const warm = BulkableApi.slotFor(pot(2, BROTH, 303), undefined)!;
    const cold = BulkableApi.slotFor(pot(2, BROTH, 277), undefined)!;
    Freshness.loadOf(warm);
    Freshness.loadOf(cold);
    setNow(2 * DAY);
    expect(Freshness.loadOf(warm)).toBeGreaterThan(
      Freshness.loadOf(cold) * 5,
    );
  });

  it('a pour carries the load into a clean vessel — the matter is what is off', () => {
    const from = BulkableApi.slotFor(pot(2, BROTH), undefined)!;
    const to = BulkableApi.slotFor(pot(0, null), undefined)!;
    Freshness.stampLoad(from, 0.8);

    const res = BulkableApi.transfer(from, to, {
      kind: 'measure',
      litres: 1,
      mode: 'strict',
    });
    expect(res.applied).toBeCloseTo(1, 9);
    expect(Freshness.loadOf(to)).toBeCloseTo(0.8, 5);
    // …and the source is not laundered by having poured some out.
    expect(Freshness.loadOf(from)).toBeCloseTo(0.8, 5);
  });

  it('⭐ the pour-to-reset exploit is closed: loads blend by volume', () => {
    const spoiled = BulkableApi.slotFor(pot(1, BROTH), undefined)!;
    const fresh = BulkableApi.slotFor(pot(1, BROTH), undefined)!;
    Freshness.stampLoad(spoiled, 0.9);
    Freshness.stampLoad(fresh, 0);

    // 1 L of spoiled into 1 L of fresh → the average, not zero.
    BulkableApi.transfer(spoiled, fresh, {
      kind: 'measure',
      litres: 1,
      mode: 'strict',
    });
    expect(Freshness.loadOf(fresh)).toBeCloseTo(0.45, 4);
  });

  it('a small spoiled pour barely moves a big fresh pot (mass-weighted)', () => {
    const spoiled = BulkableApi.slotFor(pot(1, BROTH), undefined)!;
    const fresh = BulkableApi.slotFor(pot(3, BROTH), undefined)!;
    Freshness.stampLoad(spoiled, 0.9);
    Freshness.stampLoad(fresh, 0);
    BulkableApi.transfer(spoiled, fresh, {
      kind: 'measure',
      litres: 0.1,
      mode: 'strict',
    });
    expect(Freshness.loadOf(fresh)).toBeLessThan(0.05);
    expect(Freshness.loadOf(fresh)).toBeGreaterThan(0);
  });

  it('the ingest payload carries a ptomaine dose the stored payload does not', () => {
    const slot = BulkableApi.slotFor(pot(2, BROTH), undefined)!;
    Freshness.stampLoad(slot, 0.9);

    const stored = slot.getPayload()!;
    expect(stored.toxicity.some((t) => t.type === 'ptomaine')).toBe(false);

    const ingest = Freshness.ingestPayloadOf(slot)!;
    const dose = ingest.toxicity.find((t) => t.type === 'ptomaine');
    expect(dose).toBeTruthy();
    expect(dose!.amount).toBeGreaterThan(0);
    // ⭐ The dose is DERIVED, never stored — a pot that gets chilled must
    // not keep a dose it no longer deserves.
    expect(slot.getPayload()!.toxicity.some((t) => t.type === 'ptomaine')).toBe(
      false,
    );
    // The blend's real nutrition survives the fold.
    expect(ingest.nutrients).toContain('protein');
  });

  it('fresh matter ingests exactly as before — no dose, no surprises', () => {
    const slot = BulkableApi.slotFor(pot(2, BROTH), undefined)!;
    setNow(HOUR);
    const ingest = Freshness.ingestPayloadOf(slot);
    expect(ingest?.toxicity.some((t) => t.type === 'ptomaine') ?? false).toBe(
      false,
    );
  });

  it('the item gauge and the payload gauge use identical arithmetic', () => {
    const mat = ensureMaterial(BROTH, 80_000);
    const slot = BulkableApi.slotFor(pot(2, BROTH, 300), undefined)!;
    Freshness.loadOf(slot); // seed at t=0
    setNow(DAY);
    const viaSlot = Freshness.loadOf(slot);
    const viaStatic = Freshness.advance(0, DAY, mat, 300);
    expect(viaSlot).toBeCloseTo(viaStatic, 6);
  });
});
