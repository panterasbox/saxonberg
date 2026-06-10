import { describe, it, expect } from 'vitest';
import Material from '../Material';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { Property } from '../../stuff/Propertied';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('Material', () => {
  it('round-trips bulk fields through getters/setters', () => {
    const m = makeStuff(() => new Material());
    m.setName('iron');
    m.setDensity(Quantity.of(7874, 'kg/m³'));
    m.setHardness(4);
    m.setFlammability(0);
    m.setOpacity(1);
    m.setThermalConductivity(80);
    m.setElectricalConductivity(1e7);
    m.setMagneticSusceptibility(0.99);
    m.setEdibility(false);
    m.setNutrients(['iron']);
    m.setToxicity(['iron-poisoning']);

    expect(m.getName()).toBe('iron');
    expect(m.getDensity().rawValue()).toBe(7874);
    expect(m.getHardness()).toBe(4);
    expect(m.getOpacity()).toBe(1);
    expect(m.getThermalConductivity()).toBe(80);
    expect(m.getElectricalConductivity()).toBe(1e7);
    expect(m.getMagneticSusceptibility()).toBeCloseTo(0.99);
    expect(m.getEdibility()).toBe(false);
    expect(m.getNutrients()).toEqual(['iron']);
    expect(m.getToxicity()).toEqual(['iron-poisoning']);
  });

  it('composes SingletonMixin and PropertiedMixin', () => {
    const m = makeStuff(() => new Material());
    expect(MixinApi.hasMixin(m, Mixins.Singleton)).toBe(true);
    expect(MixinApi.isPropertied(m)).toBe(true);
  });

  describe('damage resistance — property-backed', () => {
    it('reads 0 for unset damage types', () => {
      const m = makeStuff(() => new Material());
      expect(m.getDamageResistance('slash')).toBe(0);
      expect(m.getDamageResistance('imaginary-type')).toBe(0);
    });

    it('round-trips per-damage-type resistance via getProp/setProp under the hood', () => {
      const m = makeStuff(() => new Material());
      m.setDamageResistance('slash', 0.7);
      m.setDamageResistance('blunt', 0.4);
      expect(m.getDamageResistance('slash')).toBeCloseTo(0.7);
      expect(m.getDamageResistance('blunt')).toBeCloseTo(0.4);
      // Unset type still reads 0 — explicit storage, no field.
      expect(m.getDamageResistance('pierce')).toBe(0);
    });

    it('exposes the raw Property handle for masking — equipment bonuses, buffs', () => {
      const m = makeStuff(() => new Material());
      m.setDamageResistance('fire', 0.3);
      // Direct property read confirms the storage key convention.
      expect(m.getProp(Property.of<number>('resistance.fire'))).toBeCloseTo(
        0.3
      );
    });
  });
});
