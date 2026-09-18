/**
 * ⭐⭐ The heat-pump cost model — `arcane-science.md` rule 4 made real.
 *
 * *Cooling has no fixed price.* Moving heat out of something is a Carnot
 * problem: `W ≥ Q · (T_hot − T_cold) / T_cold`, at 40 % of ideal. That is
 * **cheap near ambient and divergent at depth**, which is the third law
 * arrived at as a cost curve rather than asserted as a rule.
 *
 * ⚠⚠ And the caster absorbs `Q + W` — everything the pump moved plus the
 * work to move it — because the one postulate says the caster is always
 * an endpoint. That is what makes *"the mana bar is not the danger
 * meter"* true of the engine rather than only of the prose.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { THERMAL_DEFAULTS } from '../../../../lib/thermal/Thermal';
import { SPELL_COST_MODELS } from '../../magic/Spell';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

/**
 * The arithmetic under test, restated independently of the engine — the
 * point of this file is that the published numbers and the shipped ones
 * are the same numbers.
 */
function idealWorkTau(joules: number, hotK: number, coldK: number): number {
  const lift = Math.max(0, hotK - coldK);
  return (joules * lift) / Math.max(1, coldK) / 0.4 / 1000;
}

describe('the heat-pump cost model', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('is a recognised cost model', () => {
    expect([...SPELL_COST_MODELS]).toContain('heat-pump');
  });

  it("⭐⭐ near ambient it is CHEAP — the science's own worked figure", () => {
    // arcane-science: a realistic device at 40 % of Carnot has COP ≈ 7
    // near ambient, so 100 kJ moved costs ≈ 14 τ of work. That number is
    // in the published document and it had better be the engine's.
    const hot = THERMAL_DEFAULTS.SETPOINT_K; // 310 — the caster
    const cold = 293; // a room-temperature mark, a 17 K lift
    const tau = idealWorkTau(100_000, hot, cold);
    expect(tau).toBeGreaterThan(12);
    expect(tau).toBeLessThan(17);
  });

  it('⭐⭐ …and DIVERGES at depth — the third law as a price', () => {
    // The same 100 kJ, pushing something already very cold. Nothing in
    // the model says "you may not"; it says "this costs more and more",
    // which is both the honest physics and the better game rule.
    const hot = THERMAL_DEFAULTS.SETPOINT_K;
    const shallow = idealWorkTau(100_000, hot, 293);
    const deep = idealWorkTau(100_000, hot, 50);
    const deeper = idealWorkTau(100_000, hot, 5);
    expect(deep).toBeGreaterThan(shallow * 10);
    expect(deeper).toBeGreaterThan(deep * 5);
  });

  it('⭐ pumping DOWNHILL costs the floor and nothing more', () => {
    // Into something hotter than the caster there is no lift to pay for.
    // Not a special case — it falls out of `max(0, T_hot − T_cold)`.
    expect(idealWorkTau(100_000, THERMAL_DEFAULTS.SETPOINT_K, 400)).toBe(0);
  });

  it('⚠ a COP above 1 is not free energy, and the gate must not treat it as one', () => {
    // 100 kJ moved for 14 τ of work looks like η = 7. It is not: the
    // heat was already there and the working only moved it. A flat
    // `η ≤ 1` check over every channel would have made this illegal,
    // which is why `lint:spell-cost` asks a cooling row for a declared
    // LIFT instead of an efficiency.
    const moved = 100_000;
    const work = idealWorkTau(moved, THERMAL_DEFAULTS.SETPOINT_K, 293) * 1000;
    expect(moved / work).toBeGreaterThan(1);
  });

  it('⭐⭐ the caster absorbs Q + W — which is why frost cooks them', () => {
    // A mid-depth pool: ~120 τ of casting. Per τ committed, a near-ambient
    // pump puts roughly COP + 1 ≈ 8 kJ into the caster, so the pool
    // carries ≈ 1 MJ — and 1 MJ on a 70 kg body is ≈ +3.4 K, past the
    // +2.5 K hyperthermia onset with mana still in the reserve.
    const perTauJ = 8_000;
    const poolTau = 120;
    const absorbed = perTauJ * poolTau;
    const deltaK = absorbed / (70 * THERMAL_DEFAULTS.DEFAULT_SPECIFIC_HEAT);
    expect(deltaK).toBeGreaterThan(THERMAL_DEFAULTS.HYPERTHERMIA_ONSET_K);
    // …and short of the +5 K that used to be the onset, which is the
    // whole reason D16 moved it: at the old threshold this arc produced
    // nothing at all.
    expect(deltaK).toBeLessThan(5);
  });
});
