/**
 * Exercises the Thermal substrate's Quantity units — `clo`
 * (clothing insulation), `J/(kg·K)` (specific heat), and `m/s`
 * (wind speed) — plus the `K`-thermal tag scale the Thermal
 * capability renders "feels like" prose through. The three new
 * units are their own arithmetic axes (no converters, no tag
 * tables); the test pins round-trip + add/scale + the marshaller
 * path encoding.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Quantity } from '../quantity';
import { QuantityApi } from '../../api/quantity';
import { QuantityMarshaller } from '../persistence/QuantityMarshaller';

describe('Quantity — thermal units', () => {
  describe('clo (clothing insulation)', () => {
    it('round-trips through JSON', () => {
      const q = Quantity.of(4, 'clo');
      const back = Quantity.fromJSON(q.toJSON());
      expect(back.rawValue()).toBe(4);
      expect(back.unit).toBe('clo');
    });

    it('adds and scales (additive insulation axis)', () => {
      const shirt = Quantity.of(0.5, 'clo');
      const parka = Quantity.of(4, 'clo');
      expect(shirt.add(parka).rawValue()).toBe(4.5);
      expect(parka.scale(0.5).rawValue()).toBe(2);
    });

    it('is tagless — falls through to canonical format', () => {
      expect(Quantity.of(4, 'clo').tag()).toBe('4 clo');
    });
  });

  describe('J/(kg·K) (specific heat)', () => {
    it('round-trips through JSON', () => {
      const water = Quantity.of(4186, 'J/(kg·K)');
      const back = Quantity.fromJSON(water.toJSON());
      expect(back.rawValue()).toBe(4186);
      expect(back.unit).toBe('J/(kg·K)');
    });

    it('adds and scales', () => {
      const a = Quantity.of(1000, 'J/(kg·K)');
      const b = Quantity.of(500, 'J/(kg·K)');
      expect(a.add(b).rawValue()).toBe(1500);
      expect(a.scale(2).rawValue()).toBe(2000);
    });
  });

  describe('m/s (wind speed)', () => {
    it('round-trips through JSON', () => {
      const q = Quantity.of(12, 'm/s');
      const back = Quantity.fromJSON(q.toJSON());
      expect(back.rawValue()).toBe(12);
      expect(back.unit).toBe('m/s');
    });

    it('adds and scales', () => {
      expect(Quantity.of(3, 'm/s').add(Quantity.of(2, 'm/s')).rawValue()).toBe(
        5,
      );
    });
  });

  describe('K thermal scale (renders the "feels like" prose)', () => {
    beforeAll(() => {
      QuantityApi.loadTagTables();
    });
    afterAll(() => {
      Quantity._clearTagTable('K', 'thermal');
    });

    it('names a rung on a K quantity', () => {
      expect(Quantity.of(295, 'K').tag('thermal')).toBe('warm');
      expect(Quantity.of(0, 'K').tag('thermal')).toBe('freezing');
    });
  });

  describe('marshaller path encoding', () => {
    it('encodes J/(kg·K) as J-per-kg-K', () => {
      expect(QuantityMarshaller.pathFor('J/(kg·K)')).toBe(
        '/lib/persistence/QuantityMarshaller/J-per-kg-K',
      );
    });

    it('encodes m/s as m-per-s', () => {
      expect(QuantityMarshaller.pathFor('m/s')).toBe(
        '/lib/persistence/QuantityMarshaller/m-per-s',
      );
    });

    it('encodes clo unchanged', () => {
      expect(QuantityMarshaller.pathFor('clo')).toBe(
        '/lib/persistence/QuantityMarshaller/clo',
      );
    });
  });
});
