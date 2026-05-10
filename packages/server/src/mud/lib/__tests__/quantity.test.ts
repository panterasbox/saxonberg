import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Quantity,
  QuantityUnitMismatchError,
} from '../quantity';
import type { Unit } from '../quantity';

// Fixture tag table. Registered for the whole suite so the
// roundtrip / parse tests can rely on it. Cleared on teardown so
// real channel registrations made elsewhere aren't shadowed.
const FIXTURE_KG_TAGS = [
  { tag: 'feather', threshold: 0.001 },
  { tag: 'light', threshold: 0.5 },
  { tag: 'medium', threshold: 5 },
  { tag: 'heavy', threshold: 50 },
  { tag: 'enormous', threshold: 500 },
];

describe('Quantity — core', () => {
  beforeAll(() => {
    Quantity.registerTagTable('kg', 'default', FIXTURE_KG_TAGS);
  });

  afterAll(() => {
    Quantity._clearTagTable('kg');
  });

  describe('construction', () => {
    it('Quantity.of stores value and unit', () => {
      const q = Quantity.of(5, 'kg');
      expect(q.rawValue()).toBe(5);
      expect(q.unit).toBe('kg');
    });

    it('Quantity.of rejects non-finite values', () => {
      expect(() => Quantity.of(Number.NaN, 'kg')).toThrow(TypeError);
      expect(() => Quantity.of(Number.POSITIVE_INFINITY, 'kg')).toThrow(TypeError);
    });

    it('format() emits "<value> <unit>"', () => {
      expect(Quantity.of(5, 'kg').format()).toBe('5 kg');
      expect(Quantity.of(55.845, 'g/mol').format()).toBe('55.845 g/mol');
      expect(Quantity.of(320, 'lux').format()).toBe('320 lux');
    });
  });

  describe('tag tables', () => {
    it('tag() returns the registered tag for a value', () => {
      expect(Quantity.of(5, 'kg').tag()).toBe('medium');
      expect(Quantity.of(50, 'kg').tag()).toBe('heavy');
      expect(Quantity.of(0.6, 'kg').tag()).toBe('light');
    });

    it('tag() falls back to canonical format when no table is registered', () => {
      const q = Quantity.of(55.845, 'g/mol');
      expect(q.tag()).toBe('55.845 g/mol');
    });

    it('fromTag() reverses the lookup', () => {
      expect(Quantity.fromTag('heavy', 'kg').rawValue()).toBe(50);
      expect(Quantity.fromTag('feather', 'kg').rawValue()).toBe(0.001);
    });

    it('fromTag throws on unknown tag', () => {
      expect(() => Quantity.fromTag('nonexistent', 'kg')).toThrow();
    });

    it('every entry round-trips: fromTag(tag, unit).tag() === tag', () => {
      for (const entry of FIXTURE_KG_TAGS) {
        const q = Quantity.fromTag(entry.tag, 'kg');
        expect(q.tag()).toBe(entry.tag);
      }
    });
  });

  describe('parse', () => {
    it('parses a registered tag', () => {
      expect(Quantity.parse('heavy', 'kg').rawValue()).toBe(50);
    });

    it('parses canonical literals like "12 kg"', () => {
      expect(Quantity.parse('12 kg', 'kg').rawValue()).toBe(12);
    });

    it('parses alt-unit literals via the converter', () => {
      // 12000 g → 12 kg.
      expect(Quantity.parse('12000 g', 'kg').rawValue()).toBe(12);
    });

    it('parses bare-number strings as canonical-unit', () => {
      // Bare number on a Quantity<kg> field is interpreted as kg
      // (the canonical-unit-of-the-target rule).
      expect(Quantity.parse('5', 'kg').rawValue()).toBe(5);
      expect(Quantity.parse('5000', 'kg').rawValue()).toBe(5000);
    });

    it('parses bare numbers passed as numbers directly', () => {
      expect(Quantity.parse(5, 'kg').rawValue()).toBe(5);
    });

    it('throws on unparseable input', () => {
      expect(() => Quantity.parse('utterly-bogus', 'kg')).toThrow();
    });

    it('throws on alt-unit literal with no registered converter', () => {
      // No g ↔ lux converter exists.
      expect(() => Quantity.parse('5 g', 'lux')).toThrow();
    });
  });

  describe('equality', () => {
    it('equals() checks value AND unit', () => {
      expect(Quantity.of(5, 'kg').equals(Quantity.of(5, 'kg'))).toBe(true);
      expect(Quantity.of(5, 'kg').equals(Quantity.of(6, 'kg'))).toBe(false);
    });

    it('cast-bypass equals returns false when unit differs', () => {
      const a = Quantity.of(5, 'kg');
      const b = Quantity.of(5, 'g') as unknown as Quantity<'kg'>;
      expect(a.equals(b)).toBe(false);
    });

    it('lessThan / greaterThan against same unit', () => {
      const five = Quantity.of(5, 'kg');
      const ten = Quantity.of(10, 'kg');
      expect(five.lessThan(ten)).toBe(true);
      expect(ten.greaterThan(five)).toBe(true);
      expect(five.greaterThan(ten)).toBe(false);
    });

    it('lessThan throws on cast-bypass unit mismatch', () => {
      const a = Quantity.of(5, 'kg');
      const b = Quantity.of(5, 'g') as unknown as Quantity<'kg'>;
      expect(() => a.lessThan(b)).toThrow(QuantityUnitMismatchError);
    });
  });

  describe('math', () => {
    it('add() sums values for the same unit', () => {
      const r = Quantity.of(5, 'kg').add(Quantity.of(3, 'kg'));
      expect(r.rawValue()).toBe(8);
      expect(r.unit).toBe('kg');
    });

    it('subtract() differences values for the same unit', () => {
      const r = Quantity.of(5, 'kg').subtract(Quantity.of(3, 'kg'));
      expect(r.rawValue()).toBe(2);
    });

    it('scale() multiplies by a unitless factor', () => {
      expect(Quantity.of(5, 'kg').scale(2).rawValue()).toBe(10);
      expect(Quantity.of(5, 'kg').scale(0.5).rawValue()).toBe(2.5);
    });

    it('add() throws QuantityUnitMismatchError on cast-bypass mismatch', () => {
      const a = Quantity.of(5, 'kg');
      const b = Quantity.of(3, 'g') as unknown as Quantity<'kg'>;
      expect(() => a.add(b)).toThrow(QuantityUnitMismatchError);
    });

    it('scale() rejects non-finite factors', () => {
      expect(() => Quantity.of(5, 'kg').scale(Number.NaN)).toThrow(TypeError);
    });
  });

  describe('cross-unit conversion', () => {
    it('to() converts via the registered converter', () => {
      const q = Quantity.of(2, 'kg').to('g');
      expect(q.rawValue()).toBe(2000);
      expect(q.unit).toBe('g');
    });

    it('to() returns identity for same-unit', () => {
      const q = Quantity.of(5, 'kg');
      expect(q.to('kg')).toBe(q as unknown as Quantity<Unit>);
    });

    it('to() throws when no converter is registered', () => {
      expect(() => Quantity.of(5, 'kg').to('lux')).toThrow();
    });
  });

  describe('persistence', () => {
    it('toJSON() emits { value, unit }', () => {
      const q = Quantity.of(5, 'kg');
      expect(q.toJSON()).toEqual({ value: 5, unit: 'kg' });
    });

    it('JSON.stringify round-trip', () => {
      expect(JSON.stringify(Quantity.of(5, 'kg'))).toBe(
        '{"value":5,"unit":"kg"}'
      );
    });

    it('fromJSON reconstructs', () => {
      const q = Quantity.fromJSON({ value: 5, unit: 'kg' as const });
      expect(q.rawValue()).toBe(5);
      expect(q.unit).toBe('kg');
    });

    it('fromJSON rejects malformed input', () => {
      expect(() =>
        Quantity.fromJSON(null as unknown as { value: number; unit: 'kg' })
      ).toThrow(TypeError);
      expect(() =>
        Quantity.fromJSON({} as unknown as { value: number; unit: 'kg' })
      ).toThrow(TypeError);
    });
  });

  describe('Mml emission — structural', () => {
    it('toMml() produces <quantity> markup with tag attribute when registered', () => {
      const out = Quantity.of(5, 'kg').toMml().toString();
      expect(out).toContain('unit="kg"');
      expect(out).toContain('value="5"');
      expect(out).toContain('tag="medium"');
      expect(out).toContain('>medium</quantity>');
    });

    it('formatMml() produces <quantity> markup with canonical inner text', () => {
      const out = Quantity.of(5, 'kg').formatMml().toString();
      expect(out).toContain('unit="kg"');
      expect(out).toContain('tag="medium"');
      expect(out).toContain('>5 kg</quantity>');
    });

    it('formatMml() omits tag attribute for tagless units', () => {
      const out = Quantity.of(55.845, 'g/mol').formatMml().toString();
      expect(out).toContain('unit="g/mol"');
      expect(out).toContain('value="55.845"');
      expect(out).not.toContain('tag=');
      expect(out).toContain('>55.845 g/mol</quantity>');
    });
  });
});
