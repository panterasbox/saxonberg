/**
 * Evaporation — the one place that says how fast water leaves matter.
 *
 * The assertions worth having are the *orderings*, not the magnitudes: the
 * factor table has to make a player who understands a vapour deficit
 * correct about the drying shed, the rainy week and the steamy kitchen.
 * So: saturated air dries nothing whatever else is true, wind and heat
 * multiply, and the boil cap holds.
 */

import { describe, it, expect } from 'vitest';
import {
  Evaporation,
  AIR_WIND_REF_MS,
  BRINE_EQUILIBRIUM_RH_PCT,
} from '../Evaporation';

describe('Evaporation — the vapour deficit, the wind and the heat', () => {
  it('⭐⭐ saturated air dries NOTHING, however windy and hot', () => {
    // The load-bearing zero. If this drifts, a ham in a steamy kitchen
    // dries and the whole lesson inverts.
    expect(new Evaporation(100, 0, 293).evaporationFactor()).toBe(0);
    expect(new Evaporation(100, 20, 350).evaporationFactor()).toBe(0);
    // Over-saturated reads zero, not negative — drying and re-wetting are
    // different arms and this one must not run backwards.
    expect(new Evaporation(120, 10, 320).evaporationFactor()).toBe(0);
  });

  it('the deficit is linear in how dry the air is', () => {
    const still = (h: number) => new Evaporation(h, 0, 293).evaporationFactor();
    // 20 % RH leaves twice the deficit of 60 %.
    expect(still(20)).toBeCloseTo(0.8, 10);
    expect(still(60)).toBeCloseTo(0.4, 10);
    expect(still(20) / still(60)).toBeCloseTo(2, 10);
  });

  it('wind roughly doubles the rate at the reference speed', () => {
    const still = new Evaporation(40, 0, 293).evaporationFactor();
    const breezy = new Evaporation(
      40,
      AIR_WIND_REF_MS,
      293,
    ).evaporationFactor();
    expect(breezy / still).toBeCloseTo(2, 10);
    // Linear, not exponential — a gale is not a kiln.
    const gale = new Evaporation(40, AIR_WIND_REF_MS * 4, 293).evaporationFactor();
    expect(gale / still).toBeCloseTo(5, 10);
  });

  it('heat doubles it every 10 K, and stops at boiling', () => {
    const cool = new Evaporation(40, 0, 293).evaporationFactor();
    const warm = new Evaporation(40, 0, 303).evaporationFactor();
    expect(warm / cool).toBeCloseTo(2, 10);
    // ⚠ The boil cap: water does not get hotter than 373 K, so a 450 K
    // hearth delivers more heat and never more physics.
    const boiling = new Evaporation(40, 0, 373).evaporationFactor();
    const furnace = new Evaporation(40, 0, 450).evaporationFactor();
    expect(furnace).toBeCloseTo(boiling, 10);
  });

  it('⭐ the table a player has to be able to predict', () => {
    // A dry windy summer day, a still damp autumn one, and a saturated
    // cellar. The ORDERING is the assertion.
    const summer = new Evaporation(30, 6, 298).evaporationFactor();
    const autumn = new Evaporation(95, 0.5, 285).evaporationFactor();
    const cellar = new Evaporation(100, 0, 283).evaporationFactor();
    expect(summer).toBeGreaterThan(autumn * 20);
    expect(cellar).toBe(0);
  });

  it('⭐⭐ a saturated brine sits in equilibrium with dry air, not wet', () => {
    // The geography lesson: a pan concentrates in Cádiz and not in
    // Cornwall, and this argument is the whole of why.
    const wetWeek = new Evaporation(85, 3, 288);
    const dryWeek = new Evaporation(50, 3, 288);
    // Plain water would still dry in 85 % air...
    expect(wetWeek.evaporationFactor()).toBeGreaterThan(0);
    // ...but a brine already at equilibrium with 75 % air does not.
    expect(wetWeek.evaporationFactor(BRINE_EQUILIBRIUM_RH_PCT)).toBe(0);
    expect(dryWeek.evaporationFactor(BRINE_EQUILIBRIUM_RH_PCT)).toBeGreaterThan(0);
  });

  it('rewets says which way water is moving for matter at a moisture', () => {
    const damp = new Evaporation(90, 0, 293);
    expect(damp.rewets(0.4)).toBe(true); // a dried ham softens back
    expect(damp.rewets(0.95)).toBe(false); // a fresh one still dries
    const dry = new Evaporation(30, 0, 293);
    expect(dry.rewets(0.4)).toBe(false);
  });

  it('a nonsense reading degrades to "nothing happens", never to NaN', () => {
    expect(new Evaporation(Number.NaN, 0, 293).evaporationFactor()).toBe(0);
    expect(
      Number.isFinite(new Evaporation(40, Number.NaN, Number.NaN).evaporationFactor()),
    ).toBe(true);
    expect(new Evaporation(40, 0, 293).evaporationFactor(0)).toBe(0);
  });
});
