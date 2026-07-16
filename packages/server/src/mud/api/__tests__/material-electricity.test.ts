/**
 * Phase 2 — the shock channel + the Ohm's-law circuit primitives on
 * MaterialApi, in isolation (no graph, no bodies). Pure math over
 * `I = V/R`, `P = I²R`, material→resistance, the covering-stack series
 * sum, and current→trauma. Dials fall back to their seeded literals when
 * AppSettings isn't warmed (the `dial()` try/catch), so these assert the
 * real-world-grounded magnitudes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MaterialApi } from '../material';
import { StuffApi } from '../stuff';
import Material from '../../lib/material/Material';
import { Channels } from '../../lib/material/Channel';
import { Construction } from '../../lib/material/Construction';
import { Quantity } from '../../lib/quantity';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

/** A Material carrying just an electrical conductivity (S/m). */
function mkMat(conductivity: number): Material {
  const m = makeStuff(() => new Material());
  m.setElectricalConductivity(Quantity.of(conductivity, 'S/m'));
  return m;
}

// Roster magnitudes (see base-library material content).
const copper = () => mkMat(6.0e7);
const saltWater = () => mkMat(5);
const flesh = () => mkMat(0.2);
const rubber = () => mkMat(1.0e-13);
const steel = () => mkMat(6.0e6);

describe('electricity — the shock channel is in the vocabulary', () => {
  it('shock is a channel but NOT a mechanical channel', () => {
    expect(Channels.isChannel('shock')).toBe(true);
    expect(Channels.isMechanicalChannel('shock')).toBe(false);
    expect(Channels.isMechanicalChannel('edge')).toBe(true);
  });

  it('Construction stays mechanical — responseFor(shock) throws', () => {
    const plate = Construction.of('plate');
    expect(plate.responseFor('edge')).toBe('deflect');
    expect(() => plate.responseFor('shock')).toThrow();
    // The mechanical grid is unchanged (byte-identical shape).
    expect(plate.responseFor('blunt')).toBe('transmit');
    expect(plate.doesNothing()).toBe(false);
  });
});

describe('electricity — Ohm\'s law (I = V/R)', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => StuffApi.clearAll());

  it('120 V across 100 kΩ (dry skin) ≈ 1.2 mA — a tingle', () => {
    const i = MaterialApi.ohmsCurrent(
      Quantity.of(120, 'V'),
      Quantity.of(100000, 'Ω'),
    );
    expect(i.unit).toBe('A');
    expect(i.rawValue()).toBeCloseTo(0.0012, 6);
    expect(i.rawValue()).toBeLessThan(0.01); // below let-go
  });

  it('120 V across 1 kΩ (wet skin) ≈ 120 mA — fibrillation range', () => {
    const i = MaterialApi.ohmsCurrent(
      Quantity.of(120, 'V'),
      Quantity.of(1000, 'Ω'),
    );
    expect(i.rawValue()).toBeCloseTo(0.12, 6);
    expect(i.rawValue()).toBeGreaterThan(0.1); // above fibrillation
  });

  it('50 kV taser across a high internal resistance → low mA', () => {
    // A taser is high-voltage but current-limited: a large series R keeps
    // the through-current in the non-lethal mA range.
    const i = MaterialApi.ohmsCurrent(
      Quantity.parse('50 kV', 'V'),
      Quantity.of(25_000_000, 'Ω'),
    );
    expect(i.rawValue()).toBeCloseTo(0.002, 4); // ~2 mA
    expect(i.rawValue()).toBeLessThan(0.01);
  });

  it('floors R so V/0 does not blow up', () => {
    const i = MaterialApi.ohmsCurrent(
      Quantity.of(120, 'V'),
      Quantity.of(0, 'Ω'),
    );
    expect(Number.isFinite(i.rawValue())).toBe(true);
  });
});

describe('electricity — P = I²R (Joule heat)', () => {
  it('computes the resistive loss term', () => {
    const p = MaterialApi.jouleHeat(
      Quantity.of(2, 'A'),
      Quantity.of(50, 'Ω'),
    );
    expect(p.unit).toBe('W');
    expect(p.rawValue()).toBeCloseTo(200, 6); // 2² × 50
  });
});

describe('electricity — body resistance', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => StuffApi.clearAll());

  it('dry flesh reads ~100 kΩ (the dry-skin anchor)', () => {
    const r = MaterialApi.bodyResistance(flesh(), false);
    expect(r.unit).toBe('Ω');
    expect(r.rawValue()).toBeCloseTo(100000, 0);
  });

  it('wet skin drops it ~100× (why water is deadly)', () => {
    const dry = MaterialApi.bodyResistance(flesh(), false).rawValue();
    const wet = MaterialApi.bodyResistance(flesh(), true).rawValue();
    expect(wet).toBeCloseTo(dry / 100, 0);
    expect(wet).toBeLessThan(dry);
  });

  it('falls back to the dry-skin dial when no material', () => {
    const r = MaterialApi.bodyResistance(null, false);
    expect(r.rawValue()).toBeCloseTo(100000, 0);
  });
});

describe('electricity — contact / series resistance (the armor inversion engine)', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => StuffApi.clearAll());

  it('a conductor adds ~0 resistance; an insulator adds a huge one', () => {
    const copperR = MaterialApi.contactResistance(copper()).rawValue();
    const rubberR = MaterialApi.contactResistance(rubber()).rawValue();
    expect(copperR).toBeLessThan(1); // near-zero
    expect(rubberR).toBeGreaterThan(1e9); // orders of magnitude
    expect(rubberR).toBeGreaterThan(copperR * 1e9);
  });

  it('a null/unknown material reads as an insulator (open break)', () => {
    expect(MaterialApi.contactResistance(null).rawValue()).toBeGreaterThan(1e9);
  });

  it('series sum: adding rubber raises R by orders of magnitude, steel barely moves it', () => {
    const bare = MaterialApi.seriesResistanceOfCoveringStack([]).rawValue();
    const withSteel = MaterialApi.seriesResistanceOfCoveringStack([
      steel(),
    ]).rawValue();
    const withRubber = MaterialApi.seriesResistanceOfCoveringStack([
      rubber(),
    ]).rawValue();
    expect(bare).toBe(0);
    expect(withSteel).toBeLessThan(1); // steel adds ~nothing
    expect(withRubber).toBeGreaterThan(1e9); // rubber adds enormous R
    expect(withRubber).toBeGreaterThan(withSteel * 1e9);
  });
});

describe('electricity — resolveShock (the local contact burn)', () => {
  it('below the burn threshold → no wound (perception only)', () => {
    expect(MaterialApi.resolveShock(Quantity.of(0.001, 'A'))).toBeNull();
  });

  it('a strong current → a burn whose severity scales with current', () => {
    const t = MaterialApi.resolveShock(Quantity.of(0.12, 'A'));
    expect(t).not.toBeNull();
    expect(t!.type).toBe('burn');
    expect(t!.severity).toBeGreaterThan(0);
  });

  it('the static-shock teachable: thousands of volts, tiny current → nothing', () => {
    // ~40 kV static discharge through a very high body path → microamps.
    const i = MaterialApi.ohmsCurrent(
      Quantity.parse('40 kV', 'V'),
      Quantity.of(1e10, 'Ω'),
    );
    expect(MaterialApi.resolveShock(i)).toBeNull();
  });
});
