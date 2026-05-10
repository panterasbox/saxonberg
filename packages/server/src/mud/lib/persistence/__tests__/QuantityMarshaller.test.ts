import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QuantityMarshaller } from '../QuantityMarshaller';
import { ChemistryMarshaller } from '../ChemistryMarshaller';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { installV1QuantityMarshallers } from './quantity-marshaller-test-helpers';
// Trigger MaterialApi tag-table registrations (KG_TAGS, etc.).
import '../../../api/material';
// Trigger LightApi tag-table registrations (LUMEN_TAGS, KELVIN_TAGS).
import '../../../api/light';

describe('QuantityMarshaller', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  describe('pathFor — unit encoding', () => {
    it('plain units pass through', () => {
      expect(QuantityMarshaller.pathFor('kg')).toBe(
        '/lib/persistence/QuantityMarshaller/kg'
      );
      expect(QuantityMarshaller.pathFor('K')).toBe(
        '/lib/persistence/QuantityMarshaller/K'
      );
    });

    it('encodes "/" as "-per-"', () => {
      expect(QuantityMarshaller.pathFor('g/mol')).toBe(
        '/lib/persistence/QuantityMarshaller/g-per-mol'
      );
    });

    it('encodes "³" as "3"', () => {
      expect(QuantityMarshaller.pathFor('kg/m³')).toBe(
        '/lib/persistence/QuantityMarshaller/kg-per-m3'
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

describe('ChemistryMarshaller', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('round-trips chemistry with a numeric molarMass', () => {
    const m = StuffApi.findByTemplatePath<ChemistryMarshaller>(
      ChemistryMarshaller.templatePath
    )!;
    const runtime = m.fromStored({
      symbol: 'Fe',
      atomicNumber: 26,
      molarMass: 55.845,
    });
    expect(runtime).not.toBeNull();
    expect(runtime!.symbol).toBe('Fe');
    expect(runtime!.atomicNumber).toBe(26);
    expect(runtime!.molarMass).toBeInstanceOf(Quantity);
    expect(runtime!.molarMass!.rawValue()).toBe(55.845);
    expect(runtime!.molarMass!.unit).toBe('g/mol');

    const stored = m.toStored(runtime);
    expect(stored).toEqual({
      symbol: 'Fe',
      atomicNumber: 26,
      molarMass: { value: 55.845, unit: 'g/mol' },
    });
  });

  it('null pass-through both directions', () => {
    const m = StuffApi.findByTemplatePath<ChemistryMarshaller>(
      ChemistryMarshaller.templatePath
    )!;
    expect(m.fromStored(null)).toBeNull();
    expect(m.toStored(null)).toBeNull();
  });

  it('toStored rejects a chemistry record with a non-Quantity molarMass', () => {
    const m = StuffApi.findByTemplatePath<ChemistryMarshaller>(
      ChemistryMarshaller.templatePath
    )!;
    expect(() =>
      m.toStored({
        symbol: 'Fe',
        molarMass: 55.845 as unknown as Quantity<'g/mol'>,
      })
    ).toThrow(TypeError);
  });
});
