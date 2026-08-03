import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QuantityMarshaller } from '../QuantityMarshaller';
import { Quantity } from '../../../lib/quantity';
import { StuffApi } from '../../../api/stuff';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

describe('QuantityMarshaller', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
    installV1QuantityMarshallers();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  describe('pathFor — unit encoding', () => {
    it('plain units pass through', () => {
      expect(QuantityMarshaller.pathFor('kg')).toBe(
        '/obj/persistence/QuantityMarshaller/kg'
      );
      expect(QuantityMarshaller.pathFor('K')).toBe(
        '/obj/persistence/QuantityMarshaller/K'
      );
    });

    it('encodes "/" as "-per-"', () => {
      expect(QuantityMarshaller.pathFor('g/mol')).toBe(
        '/obj/persistence/QuantityMarshaller/g-per-mol'
      );
    });

    it('encodes "³" as "3"', () => {
      expect(QuantityMarshaller.pathFor('kg/m³')).toBe(
        '/obj/persistence/QuantityMarshaller/kg-per-m3'
      );
    });
  });

  describe('fromStored — liberal coercion', () => {
    it('accepts the canonical {value, unit} JSON shape', () => {
      const m = StuffApi.findByTemplatePath<QuantityMarshaller<'kg'>>(
        QuantityMarshaller.pathFor('kg')
      )!;
      const q = m.fromStored({ value: 5, unit: 'kg' });
      expect(q).toBeInstanceOf(Quantity);
      expect(q.rawValue()).toBe(5);
      expect(q.unit).toBe('kg');
    });

    it('accepts a bare numeric (canonical-unit interpretation)', () => {
      const m = StuffApi.findByTemplatePath<QuantityMarshaller<'kg'>>(
        QuantityMarshaller.pathFor('kg')
      )!;
      const q = m.fromStored(7);
      expect(q.rawValue()).toBe(7);
    });

    it('accepts a tag string via the registered tag table', () => {
      const m = StuffApi.findByTemplatePath<QuantityMarshaller<'kg'>>(
        QuantityMarshaller.pathFor('kg')
      )!;
      const q = m.fromStored('heavy');
      expect(q.rawValue()).toBe(50);
    });

    it('accepts an alt-unit JSON shape and converts via the registered converter', () => {
      const m = StuffApi.findByTemplatePath<QuantityMarshaller<'kg'>>(
        QuantityMarshaller.pathFor('kg')
      )!;
      const q = m.fromStored({ value: 12000, unit: 'g' as 'kg' });
      // 12000 g → 12 kg via the g↔kg converter.
      expect(q.rawValue()).toBe(12);
    });
  });

  describe('toStored — strict on Quantity', () => {
    it('emits the canonical {value, unit} JSON shape', () => {
      const m = StuffApi.findByTemplatePath<QuantityMarshaller<'kg'>>(
        QuantityMarshaller.pathFor('kg')
      )!;
      expect(m.toStored(Quantity.of(5, 'kg'))).toEqual({ value: 5, unit: 'kg' });
    });

    it('rejects non-Quantity input', () => {
      const m = StuffApi.findByTemplatePath<QuantityMarshaller<'kg'>>(
        QuantityMarshaller.pathFor('kg')
      )!;
      expect(() => m.toStored(5 as unknown as Quantity<'kg'>)).toThrow(TypeError);
    });

    it('rejects mismatched-unit Quantity', () => {
      const kg = StuffApi.findByTemplatePath<QuantityMarshaller<'kg'>>(
        QuantityMarshaller.pathFor('kg')
      )!;
      expect(() =>
        kg.toStored(Quantity.of(5, 'g') as unknown as Quantity<'kg'>)
      ).toThrow(TypeError);
    });
  });
});

