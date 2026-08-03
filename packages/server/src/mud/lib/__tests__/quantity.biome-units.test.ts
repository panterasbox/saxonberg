/**
 * Exercises the biome substrate's Quantity units + tag tables
 * (Pa / % / m/s² / m / m³ and the K-thermal scale). Pulls the
 * production YAML via `QuantityApi.loadTagTables` so the test
 * reflects the actual registered scales / breakpoints.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest';
import { Quantity } from '../quantity';
import { QuantityApi } from '../../api/quantity';
import { QuantityMarshaller } from '../../obj/persistence/QuantityMarshaller';

const BIOME_SCALES: ReadonlyArray<{
  unit: Parameters<typeof Quantity.registerTagTable>[0];
  scaleName: string;
}> = [
  { unit: 'K', scaleName: 'thermal' },
  { unit: 'Pa', scaleName: 'default' },
  { unit: '%', scaleName: 'default' },
  { unit: 'm/s²', scaleName: 'default' },
];

describe('Quantity — biome units', () => {
  beforeAll(() => {
    QuantityApi.loadTagTables();
  });

  afterAll(() => {
    for (const { unit, scaleName } of BIOME_SCALES) {
      Quantity._clearTagTable(unit, scaleName);
    }
  });

  describe('K thermal scale', () => {
    it('warm tag covers room temperature', () => {
      expect(Quantity.of(295, 'K').tag('thermal')).toBe('warm');
    });

    it('preserves the color default for no-arg tag()', () => {
      expect(Quantity.of(2700, 'K').tag()).toBe('warm');
      expect(Quantity.of(6500, 'K').tag()).toBe('daylight');
    });

    it('round-trips tag → threshold', () => {
      expect(Quantity.fromTag('scorching', 'K', 'thermal').rawValue())
        .toBe(320);
      expect(Quantity.fromTag('freezing', 'K', 'thermal').rawValue())
        .toBe(0);
    });
  });

  describe('Pa default scale', () => {
    it('normal covers Earth sea level', () => {
      expect(Quantity.of(101325, 'Pa').tag()).toBe('normal');
    });

    it('vacuum threshold is 0', () => {
      expect(Quantity.parse('vacuum', 'Pa').rawValue()).toBe(0);
    });

    it('crushing threshold matches authored value', () => {
      expect(Quantity.fromTag('crushing', 'Pa').rawValue()).toBe(500000);
    });
  });

  describe('% default scale', () => {
    it('comfortable covers 50 RH', () => {
      expect(Quantity.of(50, '%').tag()).toBe('comfortable');
    });

    it('parses friendly tags', () => {
      expect(Quantity.parse('saturated', '%').rawValue()).toBe(95);
      expect(Quantity.parse('dry', '%').rawValue()).toBe(0);
    });

    it('formats with the bare-percent unit string', () => {
      expect(Quantity.of(50, '%').format()).toBe('50 %');
    });
  });

  describe('m/s² default scale', () => {
    it('normal covers Earth gravity', () => {
      expect(Quantity.of(9.81, 'm/s²').tag()).toBe('normal');
    });

    it('microgravity at 0', () => {
      expect(Quantity.of(0, 'm/s²').tag()).toBe('microgravity');
    });

    it('preserves the m/s² unit string through format', () => {
      expect(Quantity.of(9.81, 'm/s²').format()).toBe('9.81 m/s²');
    });
  });

  describe('m and m³ are tagless', () => {
    it('m falls through to canonical format', () => {
      expect(Quantity.of(3, 'm').tag()).toBe('3 m');
    });

    it('m³ falls through to canonical format', () => {
      expect(Quantity.of(27, 'm³').tag()).toBe('27 m³');
    });
  });

  describe('marshaller path encoding', () => {
    it('encodes m/s² as m-per-s2', () => {
      expect(QuantityMarshaller.pathFor('m/s²')).toBe(
        '/obj/persistence/QuantityMarshaller/m-per-s2'
      );
    });

    it('encodes % as pct', () => {
      expect(QuantityMarshaller.pathFor('%')).toBe(
        '/obj/persistence/QuantityMarshaller/pct'
      );
    });

    it('encodes m³ as m3', () => {
      expect(QuantityMarshaller.pathFor('m³')).toBe(
        '/obj/persistence/QuantityMarshaller/m3'
      );
    });

    it('encodes Pa unchanged', () => {
      expect(QuantityMarshaller.pathFor('Pa')).toBe(
        '/obj/persistence/QuantityMarshaller/Pa'
      );
    });

    it('encodes m unchanged', () => {
      expect(QuantityMarshaller.pathFor('m')).toBe(
        '/obj/persistence/QuantityMarshaller/m'
      );
    });
  });
});
