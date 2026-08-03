/**
 * Exercises the electricity substrate's Quantity units — `V`
 * (potential), `A` (current), `Ω` (resistance), `S/m` (conductivity) —
 * plus the coursework sub/super scales (`kV`/`mV`/`mA`/`kΩ`/`MΩ`) that
 * round-trip to the base SI unit through registered converters. The
 * base units are their own arithmetic axes; `S/m` has no converter
 * (like `bpm`). The test pins construction, round-trip, add/scale,
 * conversion, and the marshaller path encoding.
 */

import { describe, it, expect } from 'vitest';
import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../../obj/persistence/QuantityMarshaller';

describe('Quantity — electricity units', () => {
  describe('base units construct + round-trip', () => {
    it.each([
      ['V', 120],
      ['A', 0.01],
      ['Ω', 100000],
      ['S/m', 6.0e7],
    ] as const)('%s round-trips through JSON', (unit, value) => {
      const q = Quantity.of(value, unit);
      const back = Quantity.fromJSON(q.toJSON());
      expect(back.rawValue()).toBe(value);
      expect(back.unit).toBe(unit);
    });

    it('adds and scales voltage / current / resistance', () => {
      expect(Quantity.of(60, 'V').add(Quantity.of(60, 'V')).rawValue()).toBe(
        120,
      );
      expect(Quantity.of(0.05, 'A').scale(2).rawValue()).toBeCloseTo(0.1, 6);
      expect(Quantity.of(500, 'Ω').add(Quantity.of(500, 'Ω')).rawValue()).toBe(
        1000,
      );
    });
  });

  describe('coursework scale converters round-trip to SI', () => {
    it('50 kV → 50000 V (taser)', () => {
      expect(Quantity.parse('50 kV', 'V').rawValue()).toBe(50000);
    });

    it('10 mA → 0.01 A (let-go)', () => {
      expect(Quantity.parse('10 mA', 'A').rawValue()).toBeCloseTo(0.01, 9);
    });

    it('100 kΩ → 100000 Ω (dry skin)', () => {
      expect(Quantity.parse('100 kΩ', 'Ω').rawValue()).toBe(100000);
    });

    it('1 MΩ → 1000000 Ω', () => {
      expect(Quantity.parse('1 MΩ', 'Ω').rawValue()).toBe(1000000);
    });

    it('500 mV → 0.5 V', () => {
      expect(Quantity.parse('500 mV', 'V').rawValue()).toBeCloseTo(0.5, 9);
    });

    it('converts base → scaled via .to()', () => {
      expect(Quantity.of(50000, 'V').to('kV').rawValue()).toBe(50);
      expect(Quantity.of(0.01, 'A').to('mA').rawValue()).toBeCloseTo(10, 9);
    });
  });

  describe('S/m is a base axis with no converter', () => {
    it('has no converter to another unit', () => {
      expect(() => Quantity.of(5, 'S/m').to('A')).toThrow();
    });
  });

  describe('marshaller path encoding', () => {
    it('encodes S/m as S-per-m', () => {
      expect(QuantityMarshaller.pathFor('S/m')).toBe(
        '/obj/persistence/QuantityMarshaller/S-per-m',
      );
    });

    it('encodes plain electrical units unchanged', () => {
      expect(QuantityMarshaller.pathFor('V')).toBe(
        '/obj/persistence/QuantityMarshaller/V',
      );
      expect(QuantityMarshaller.pathFor('A')).toBe(
        '/obj/persistence/QuantityMarshaller/A',
      );
      expect(QuantityMarshaller.pathFor('Ω')).toBe(
        '/obj/persistence/QuantityMarshaller/Ω',
      );
    });
  });
});
