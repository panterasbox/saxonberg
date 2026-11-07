/**
 * WaterChemistry and the flow units (water-supply D8, D18).
 */

import { describe, it, expect } from 'vitest';
import { WaterChemistry } from '../WaterChemistry';
import { Quantity } from '../../quantity';

describe('WaterChemistry', () => {
  it('softness: 1 for rain, 0 at and above the soft/hard line', () => {
    expect(new WaterChemistry(5.6, 0, 0).softness()).toBe(1);
    expect(new WaterChemistry(7, 3, 0).softness()).toBeCloseTo(0.5, 9);
    expect(new WaterChemistry(7, 6, 0).softness()).toBe(0);
    expect(new WaterChemistry(7, 18, 0).softness()).toBe(0);
  });

  it('two waters blend by volume', () => {
    const fell = new WaterChemistry(6.3, 2, 0.3);
    const river = new WaterChemistry(7.8, 14, 0.3);
    const mix = fell.blendWith(1, river, 3);
    expect(mix.hardnessDgh).toBeCloseTo(11, 9);
    expect(mix.pH).toBeCloseTo((6.3 + 3 * 7.8) / 4, 9);
  });
});

describe("⭐ flow units and the miner's inch", () => {
  it('m³/s, L/s and the statute inch (0.7373 L/s) convert both ways', () => {
    expect(Quantity.of(1, 'm³/s').to('L/s').rawValue()).toBe(1000);
    expect(Quantity.of(40, 'miner-in').to('L/s').rawValue()).toBeCloseTo(29.492, 3);
    expect(Quantity.of(0.02949, 'm³/s').to('miner-in').rawValue()).toBeCloseTo(40, 1);
  });
});
