/**
 * Blood's shelf life, computed against the SHIPPED Freshness arithmetic
 * (blood build D4) — never eyeballed. A drawn unit spoils in about 3
 * game-days at a warm 293 K and lasts weeks in a cold 277 K larder, which
 * is what lets the autarkist carry a unit into a hunt but never hoard one.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import Material from '../Material';
import { Freshness } from '../Freshness';
import { Quantity } from '../../quantity';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

// The values the blood Material row tabulates.
const BLOOD_EA = 96000;
const BLOOD_AW = 0.99;

const HOUR = 3600;
const DAY = 24 * HOUR;

let seq = 0;
function bloodMaterial(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`blood-test-${seq}`);
    m.setSpecificHeat(Quantity.of(3600, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.5, 'W/(m·K)'));
    m.setSpoilActivationEnergy(Quantity.of(BLOOD_EA, 'J/mol'));
    m.setWaterActivity(BLOOD_AW);
    return m;
  }, `/stuff/idea/material/_test/blood-${seq}`) as unknown as Material;
}

/** Game-hours until a unit at `tempK` first reads spoiled (load ≥ 0.6). */
function hoursToSpoiled(tempK: number): number {
  const mat = bloodMaterial();
  for (let h = 1; h <= 24 * 60; h++) {
    if (Freshness.advance(0, h * HOUR, mat, tempK) >= 0.6) return h;
  }
  return Infinity;
}

describe('blood shelf life', () => {
  it('a warm unit (293 K) is still good at 2 days and gone by 4', () => {
    const mat = bloodMaterial();
    expect(Freshness.advance(0, 2 * DAY, mat, 293)).toBeLessThan(0.6);
    expect(Freshness.advance(0, 4 * DAY, mat, 293)).toBeGreaterThanOrEqual(0.6);
  });

  it('a cold larder (277 K) holds it for weeks', () => {
    const mat = bloodMaterial();
    expect(Freshness.advance(0, 7 * DAY, mat, 277)).toBeLessThan(0.25); // fresh
    expect(Freshness.advance(0, 42 * DAY, mat, 277)).toBeGreaterThanOrEqual(
      0.6,
    );
  });

  it('cold buys much longer than warm — the whole point of a larder', () => {
    const warm = hoursToSpoiled(293);
    const cold = hoursToSpoiled(277);
    expect(warm).toBeGreaterThan(2 * 24);
    expect(warm).toBeLessThan(4 * 24);
    expect(cold).toBeGreaterThan(3 * warm);
  });
});
