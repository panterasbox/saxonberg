/**
 * ⭐⭐ The honest freeze (cold-storage W3, D5).
 *
 * Freezing mirrors melting: a pool below its melting point PLATEAUS at `mp`
 * while the latent heat is banked, and only solidifies once the bank equals
 * `mass × latentHeatOfFusion`. A material that is ruined by freezing (blood)
 * mints no cast — it stays liquid at `mp` and its freshness load is stamped
 * ruined. (The cast-minting itself needs the clone pipeline and is proven by
 * the W5 drive; here we pin the plateau and the ruin, which are the new
 * arithmetic.)
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import Material from '../../material/Material';
import { ThermalMixin } from '../Thermal';
import { BulkableMixin } from '../../bulk/Bulkable';
import { ContainableMixin } from '../../spatial/Containable';
import { NamedMixin } from '../../description/Named';
import { Idea } from '../../stuff/Idea';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

class Pan extends BulkableMixin(
  ThermalMixin(ContainableMixin(NamedMixin(Idea))),
) {
  static _mixinName = 'FreezePan';
}

let seq = 0;
function liquid(opts: {
  mp: number;
  latent: number;
  density?: number;
  specificHeat?: number;
  ruined?: boolean;
}): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`freeze-mat-${seq}`);
    m.setKeywords([`freezemat${seq}`]);
    (m as unknown as { meltingPoint: Quantity<'K'> }).meltingPoint = Quantity.of(opts.mp, 'K');
    (m as unknown as { latentHeatOfFusion: Quantity<'J/kg'> }).latentHeatOfFusion =
      Quantity.of(opts.latent, 'J/kg');
    m.setDensity(Quantity.of(opts.density ?? 1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(opts.specificHeat ?? 4186, 'J/(kg·K)'));
    if (opts.ruined) m.ruinedByFreezing = true;
    return m;
  }, `/stuff/idea/material/_freeze/mat-${seq}`) as unknown as Material;
}

function pan(mat: Material, litres: number, tempK: number): Pan {
  return makeStuff(() => {
    const p = new Pan();
    p.setName('pan');
    p.interiorBulk = true;
    p.setInteriorCapacity(Quantity.of(10, 'L'));
    p.setBulkMaterial('interior', mat);
    p.setBulkAmount('interior', Quantity.of(litres, 'L'));
    p.setStampedTemperatureK(tempK);
    p.setLastAmbientK(tempK);
    return p;
  });
}

describe('the honest freeze', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('plateaus at the melting point while the latent heat is banked', () => {
    const water = liquid({ mp: 273, latent: 334_000 });
    const p = pan(water, 4, 272); // 1 K below mp — a small undershoot
    p.reconcilePhase();
    // Still liquid (not nearly enough latent removed), clamped to mp, and the
    // accumulator banked the undershoot.
    expect(p.getBulkAmount('interior').rawValue()).toBe(4);
    expect(p.getBulkMaterialPath('interior')).not.toBeNull();
    expect(p.getTemperature().rawValue()).toBeCloseTo(273, 1);
    const banked = p.getBulkPayload('interior')?.latentRemovedJ ?? 0;
    expect(banked).toBeGreaterThan(0);
    expect(banked).toBeLessThan(4 * 334_000); // below the need → still a pool
  });

  it('solidifies once the latent bank reaches mass × latentHeatOfFusion', () => {
    const water = liquid({ mp: 273, latent: 334_000 });
    // Deep undershoot: (273 − 180)·4186·4 ≈ 1.56 MJ ≥ 4·334 kJ = 1.336 MJ.
    const p = pan(water, 4, 180);
    p.reconcilePhase();
    // The pool solidified — the slot is emptied synchronously (the cast is
    // cloned async; its placement is the drive's to prove).
    expect(p.getBulkAmount('interior').rawValue()).toBe(0);
  });

  it('a material ruined by freezing mints no cast and stamps it ruined', () => {
    const blood = liquid({ mp: 273, latent: 334_000, ruined: true });
    const p = pan(blood, 1, 180); // deep undershoot, 1 L → clears the need
    p.reconcilePhase();
    // Still liquid (no cast), but stamped ruined and the accumulator cleared.
    expect(p.getBulkAmount('interior').rawValue()).toBe(1);
    expect(p.getBulkMaterialPath('interior')).not.toBeNull();
    const payload = p.getBulkPayload('interior');
    expect(payload?.freshness?.load).toBe(1);
    expect(payload?.latentRemovedJ ?? 0).toBe(0);
  });
});

describe('⭐⭐ the ambient freeze — a pool freezes because it is COLD (the climate build, D7)', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('a jug of water left in freezing air plateaus, banks its latent heat, then empties into ice', async () => {
    const { WorldClockApi } = await import('../../../api/worldclock');
    await import('../../../platform/idea/WorldClockRegistry');
    let now = 0;
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    now = 100; // ⚠ a thermal stamp of 0 means "never touched"
    try {
      const water = liquid({ mp: 273.15, latent: 334_000 });
      const jug = pan(water, 1, 280);
      jug.setLastAmbientK(250); // a winter street at dawn
      jug.getTemperature(); // opens the thermal clock

      // An hour in: below the melting point is impossible — it holds at
      // mp while the latent bank fills. Nothing pointed a cooler at it;
      // the weather's ambient is the whole driver.
      now = 100 + 3600;
      expect(jug.getTemperature().rawValue()).toBeCloseTo(273.15, 1);
      const banked = jug.getBulkPayload('interior')?.latentRemovedJ ?? 0;
      expect(banked).toBeGreaterThan(0);
      expect(jug.getBulkAmount('interior').rawValue()).toBe(1);

      // A second read at the same instant banks nothing more.
      jug.getTemperature();
      expect(jug.getBulkPayload('interior')?.latentRemovedJ ?? 0).toBeCloseTo(banked, 6);

      // Read through the day (a watched world reads; ⚠ the phase engine
      // banks the undershoot it FINDS at a read, so one long unread gap
      // banks one cooling's worth — a thermal-tail limit, plan R16), and
      // the bank reaches m·L: the pool is gone. The cast
      // (/stuff/thing/ice-block) mints into the jug's container, which the
      // drive proves; here the slot emptying is the claim.
      for (let h = 2; h <= 24 && jug.getBulkAmount('interior').rawValue() > 0; h++) {
        now = 100 + h * 3600;
        jug.getTemperature();
      }
      expect(jug.getBulkAmount('interior').rawValue()).toBe(0);
    } finally {
      WorldClockApi._resetForTesting();
    }
  });
});
