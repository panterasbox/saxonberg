/**
 * Charge a burner's fuel bed — the test-side replacement for seeding a
 * `%` `'fuel'` Reserve.
 *
 * ⭐ Fuel is kilograms of a MATERIAL now, so a fixture has to say what it
 * is burning — which is the whole point of the change, and the reason
 * these helpers take a heat of combustion. `hotFuel()` is charcoal-grade
 * (30 MJ/kg, flame ~2250 K) for a fixture that needs to reach a smelting
 * ceiling; `woodFuel()` is oak-grade (16 MJ/kg, ~1340 K) for one that
 * must not.
 *
 * ⚠ It writes `fuelBed` directly. That is the Hydrator's carve-out worn
 * by a test — the alternative is minting a Tangible and calling `stoke`,
 * which every fixture here would then be re-testing.
 */

import Material from '../../material/Material';
import { Quantity } from '../../quantity';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';
import type { Burner } from '../Burner';

let seq = 0;

/** A fuel material at `mjPerKg`, at its own test path. */
export function fuelMaterial(mjPerKg: number, name = 'test-fuel'): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`${name}-${seq}`);
    m.setDensity(Quantity.of(700, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(2000, 'J/(kg·K)'));
    m.setHeatOfCombustion(Quantity.of(mjPerKg, 'MJ/kg'));
    m.setAutoignitionTemperature(Quantity.of(570, 'K'));
    return m;
  }, `/stuff/idea/material/_test/fuel-${name}-${seq}`) as unknown as Material;
}

/** Lay `kg` of a fuel at `mjPerKg` in `burner`'s bed. Returns the material. */
export function chargeBurner(
  burner: Stuff & Burner,
  kg: number,
  mjPerKg: number,
): Material {
  const material = fuelMaterial(mjPerKg);
  const path = material.getTemplatePath();
  if (path === null) throw new Error('chargeBurner: material has no path');
  (burner as unknown as { fuelBed: Record<string, number> }).fuelBed = {
    [path]: kg,
  };
  (burner as unknown as { setFuelCapacityKg(v: number): void })
    .setFuelCapacityKg(Math.max(kg * 2, 10));
  return material;
}

/** Charcoal-grade: hot enough for a smelting ceiling. */
export function chargeHot(burner: Stuff & Burner, kg = 20): Material {
  return chargeBurner(burner, kg, 30);
}

/** Oak-grade: will not reach a smelting ceiling, which is the point. */
export function chargeWood(burner: Stuff & Burner, kg = 20): Material {
  return chargeBurner(burner, kg, 16);
}
