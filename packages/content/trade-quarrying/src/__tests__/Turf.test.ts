/**
 * A turf — ⭐⭐ **cut wet, burnt dry, and useless in between.**
 *
 * The ignition arithmetic is the kernel's (`lib/fire/__tests__/Combustible.test.ts`
 * pins the boundary on a synthetic `WaterActivityMixin(Firewood)`). What only a pack test
 * can see is whether the **shipped peat row** actually carries a fuel column
 * and whether its absorption figure puts the boundary where the `dried` band
 * is — because the row shipped with **no combustion fields at all** before this
 * build, so a turf would not have lit and nothing anywhere would have said why.
 *
 * ⭐ And the composition claim, which is the one the spoilage doc has been
 * waiting for: **a turf is `WaterActivityMixin` WITHOUT `FreshnessMixin`.** `spoilage.md` argued
 * the split on exactly this ground — *"leather, timber and grain are all dried
 * and none of them rot on a microbial curve"* — and until now every
 * `WaterActivityMixin` host in the game also composed `FreshnessMixin`, so the claim
 * was untested. This is the first host that dries and does not rot.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import Turf from '../thing/Turf';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { Reserve } from '@saxonberg/server/mud/lib/reserve';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

const BASE = fileURLToPath(new URL('../../../base-library/', import.meta.url));
const PACK = fileURLToPath(new URL('../../', import.meta.url));
const PEAT = '/stuff/idea/material/organic/peat';

function rowData(absPath: string): Record<string, unknown> {
  const parsed = YAML.parse(readFileSync(absPath, 'utf8')) as Record<string, unknown>;
  return (parsed.data ?? {}) as Record<string, unknown>;
}

let peatRow: Material | null = null;

/**
 * The shipped peat row, as a live Material.
 *
 * ⚠ Memoised per test: a second `makeStuffAtPath` at the same path leaves TWO
 * instances in the index, and every later `findByTemplatePath` throws
 * *"expected singleton, found 2"* — a failure with nothing to do with the
 * claim under test.
 */
function peat(): Material {
  if (peatRow !== null) return peatRow;
  const d = rowData(`${BASE}content/stuff/idea/material/organic/peat.yaml`);
  peatRow = makeStuffAtPath(() => {
    const m = new Material();
    m.setName(String(d.name));
    m.setTags(d.tags as string[]);
    m.setSpecificHeat(Quantity.of(Number(d.specificHeat), 'J/(kg·K)'));
    m.setThermalConductivity(
      Quantity.of(Number(d.thermalConductivity), 'W/(m·K)'),
    );
    m.setWaterAbsorptionCapacity(
      Quantity.of(Number(d.waterAbsorptionCapacity), '%'),
    );
    m.setAutoignitionTemperature(
      Quantity.of(Number(d.autoignitionTemperature), 'K'),
    );
    m.setHeatOfCombustion(Quantity.of(Number(d.heatOfCombustion), 'MJ/kg'));
    return m;
  }, PEAT) as unknown as Material;
  return peatRow;
}

/** A turf at a moisture, standing at a temperature. */
function turf(moisture: number, stampedK = 600): Turf {
  const mat = peat();
  return makeStuff(() => {
    const t = new Turf();
    t.setMass(Quantity.of(4, 'kg'));
    t.setMaterial(mat);
    t.setStampedTemperatureK(stampedK);
    t.setLastAmbientK(290);
    t.setWaterState({ moisture, solute: 0 });
    t.setReserve(
      new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null),
    );
    return t;
  }) as unknown as Turf;
}

beforeEach(() => {
  StuffApi.clearAll();
  peatRow = null;
  installV1QuantityMarshallers();
  vi.restoreAllMocks();
});

describe('⭐⭐ the shipped peat row carries a fuel column', () => {
  const d = rowData(`${BASE}content/stuff/idea/material/organic/peat.yaml`);

  it('⚠⚠ it is tagged `fuel` — and it was NOT, which is why this test exists', () => {
    // The ground build authored this row for the moor's floor and gave it no
    // combustion fields at all. A turf on that row would not have lit, and
    // `ignite` would have refused for a reason nobody could find: the
    // material's autoignition point was zero, which reads as *non-flammable*.
    expect(d.tags).toContain('fuel');
    expect(Number(d.autoignitionTemperature)).toBeGreaterThan(0);
    expect(Number(d.heatOfCombustion)).toBeGreaterThan(0);
  });

  it('⚠ …and NOT `carbon` — peat in a bloomery is a later question', () => {
    // `carbon` is the tag a reduction reads. Without it a turf heats a hearth
    // and a kiln and iron still needs charcoal off a coppice somebody tends,
    // which keeps the energy transition available to be told as the epoch step
    // it is (`metal-chain-slate` owns coke).
    expect(d.tags).not.toContain('carbon');
  });

  it('it holds many times its dry mass in water — the highest in the tree', () => {
    // Which is the whole reason a bog is a bog, and the reason an as-cut turf
    // will not catch: the wet penalty is that figure times the moisture.
    expect(Number(d.waterAbsorptionCapacity)).toBeGreaterThan(100);
  });
});

describe('an as-cut turf will not catch; a dried one will', () => {
  it('⭐⭐ as-cut refuses in the SHIPPED words — no peat-specific branch', () => {
    // `Combustible.wetPenaltyK()` reads surface wetness and the matter's OWN
    // water as two terms of one formula and adds them, so the turf reuses the
    // rain-on-a-log arithmetic exactly and the refusal is `too-wet`.
    const wet = turf(1);
    expect(wet.getEffectiveAutoignitionK()).toBeGreaterThan(600);
    const out = wet.ignite();
    expect(out.lit).toBe(false);
    expect(out.reason).toBe('too-wet');
  });

  it('…and a DRIED one lights at the same temperature', () => {
    const dry = turf(0.5);
    expect(dry.ignite().lit).toBe(true);
  });

  it('⭐ the boundary is AT the dried band, and monotone above it', () => {
    const at = turf(0.5, 290).getEffectiveAutoignitionK();
    const half = turf(0.75, 290).getEffectiveAutoignitionK();
    const soaked = turf(1, 290).getEffectiveAutoignitionK();
    // At/below `dried` the fuel contributes no water of its own, so the
    // threshold is the material's own figure.
    expect(at).toBeCloseTo(Number(rowData(`${BASE}content/stuff/idea/material/organic/peat.yaml`).autoignitionTemperature), 0);
    expect(half).toBeGreaterThan(at);
    expect(soaked).toBeGreaterThan(half);
  });
});

describe('⭐ WaterActive WITHOUT Freshness — the anticipated case, made real', () => {
  it('a turf has a water state and NO microbial load', () => {
    const t = turf(1);
    expect(MixinApi.isWaterActive(t)).toBe(true);
    // ⚠ The claim `spoilage.md` argued the split on and could not test until
    // now: every other `WaterActivityMixin` host in the game is a `Provision`, which
    // also rots. Peat is the definitional case of organic matter whose decay
    // has ALREADY stalled.
    expect(MixinApi.isFresh(t)).toBe(false);
  });

  it('…and it is a `Firewood`, so it burns down like any other fuel', () => {
    const t = turf(0.4);
    expect(MixinApi.isCombustible(t)).toBe(true);
    expect(t.getFuelRemaining()).toBeGreaterThan(0);
  });

  it('the shipped row is on the trade’s `Turf` class and the shipped peat', () => {
    const d = rowData(`${PACK}content/trade/quarrying/thing/turf.yaml`);
    expect(d.material).toBe(PEAT);
    // ⚠ And it ships at FULL moisture by default, which is the whole point: an
    // as-cut turf is useless and the weather is what makes it fuel.
    expect(d.moisture).toBeUndefined();
    expect(turf(1).getMoisture()).toBe(1);
  });
});
