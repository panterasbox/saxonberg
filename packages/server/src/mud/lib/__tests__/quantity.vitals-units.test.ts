/**
 * Exercises the Vitals substrate's Quantity units + tag tables
 * (bpm / mmHg / L). Pulls the production YAML via
 * `QuantityApi.loadTagTables` so the test reflects the actual
 * registered scales / breakpoints — and so a schema regex that
 * forgot the new units would fail here at `loadTagTables`.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Quantity } from '../quantity';
import { QuantityApi } from '../../api/quantity';
import { QuantityMarshaller } from '../../platform/idea/persistence/QuantityMarshaller';

const VITALS_SCALES: ReadonlyArray<{
  unit: Parameters<typeof Quantity.registerTagTable>[0];
  scaleName: string;
}> = [
  { unit: 'bpm', scaleName: 'pulse' },
  { unit: 'bpm', scaleName: 'respiration' },
  { unit: 'mmHg', scaleName: 'default' },
  { unit: 'L', scaleName: 'default' },
];

describe('Quantity — vitals units', () => {
  beforeAll(() => {
    QuantityApi.loadTagTables();
  });

  afterAll(() => {
    for (const { unit, scaleName } of VITALS_SCALES) {
      Quantity._clearTagTable(unit, scaleName);
    }
  });

  describe('converters', () => {
    it('mmHg → Pa uses the clinical conversion factor', () => {
      expect(Quantity.of(120, 'mmHg').to('Pa').rawValue()).toBeCloseTo(
        15998.68,
        1
      );
    });

    it('Pa → mmHg round-trips', () => {
      const pa = Quantity.of(120, 'mmHg').to('Pa');
      expect(pa.to('mmHg').rawValue()).toBeCloseTo(120, 6);
    });

    it('L ↔ m³ round-trips', () => {
      expect(Quantity.of(5, 'L').to('m³').rawValue()).toBeCloseTo(0.005, 9);
      expect(Quantity.of(0.005, 'm³').to('L').rawValue()).toBeCloseTo(5, 9);
    });

    it('bpm is its own rate axis — no converter to Hz', () => {
      expect(() => Quantity.of(60, 'bpm').to('Hz')).toThrow(/no converter/);
    });
  });

  describe('bpm — pulse (default) + respiration scales', () => {
    it('pulse is the default scale', () => {
      expect(Quantity.of(70, 'bpm').tag()).toBe('normal');
      expect(Quantity.of(110, 'bpm').tag()).toBe('tachycardic');
      expect(Quantity.of(40, 'bpm').tag()).toBe('bradycardic');
    });

    it('respiration reads a different vocabulary at the same numerics', () => {
      expect(Quantity.of(110, 'bpm').tag('pulse')).toBe('tachycardic');
      expect(Quantity.of(110, 'bpm').tag('respiration')).toBe('tachypneic');
      expect(Quantity.of(15, 'bpm').tag('respiration')).toBe('normal');
    });
  });

  describe('mmHg default scale', () => {
    it('tags blood pressure bands', () => {
      expect(Quantity.of(95, 'mmHg').tag()).toBe('normal');
      expect(Quantity.of(125, 'mmHg').tag()).toBe('elevated');
      expect(Quantity.of(145, 'mmHg').tag()).toBe('hypertensive');
      expect(Quantity.of(80, 'mmHg').tag()).toBe('hypotensive');
    });
  });

  describe('L default scale', () => {
    it('tags coarse blood-volume bands', () => {
      expect(Quantity.of(5, 'L').tag()).toBe('normal');
      expect(Quantity.of(4, 'L').tag()).toBe('low');
      expect(Quantity.of(2, 'L').tag()).toBe('empty');
    });
  });

  describe('marshaller path encoding', () => {
    it('encodes the new units unchanged (no special chars)', () => {
      expect(QuantityMarshaller.pathFor('bpm')).toBe(
        '/platform/idea/persistence/QuantityMarshaller/bpm'
      );
      expect(QuantityMarshaller.pathFor('mmHg')).toBe(
        '/platform/idea/persistence/QuantityMarshaller/mmHg'
      );
      expect(QuantityMarshaller.pathFor('L')).toBe(
        '/platform/idea/persistence/QuantityMarshaller/L'
      );
    });
  });
});
