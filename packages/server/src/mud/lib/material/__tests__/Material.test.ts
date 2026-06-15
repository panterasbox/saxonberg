import { describe, it, expect } from 'vitest';
import Material from '../Material';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('Material', () => {
  it('round-trips bulk fields through getters/setters', () => {
    const m = makeStuff(() => new Material());
    m.setName('iron');
    m.setDensity(Quantity.of(7874, 'kg/m³'));
    m.setThermalConductivity(Quantity.of(80, 'W/(m·K)'));
    m.setEdibility(false);
    m.setNutrients(['iron']);
    m.setToxicity([{ type: 'iron-poisoning', amount: 0 }]);

    expect(m.getName()).toBe('iron');
    expect(m.getDensity().rawValue()).toBe(7874);
    expect(m.getThermalConductivity().rawValue()).toBe(80);
    expect(m.getEdibility()).toBe(false);
    expect(m.getNutrients()).toEqual(['iron']);
    expect(m.getToxicity()).toEqual([{ type: 'iron-poisoning', amount: 0 }]);
  });

  it('setThermalConductivity is strict on the W/(m·K) unit', () => {
    const m = makeStuff(() => new Material());
    expect(() =>
      m.setThermalConductivity(
        Quantity.of(80, 'W') as unknown as Quantity<'W/(m·K)'>,
      ),
    ).toThrow(TypeError);
  });

  it('round-trips specificHeat and is strict on the J/(kg·K) unit', () => {
    const m = makeStuff(() => new Material());
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    expect(m.getSpecificHeat().rawValue()).toBe(4186);
    expect(m.getSpecificHeat().unit).toBe('J/(kg·K)');
    expect(() =>
      m.setSpecificHeat(
        Quantity.of(4186, 'J') as unknown as Quantity<'J/(kg·K)'>,
      ),
    ).toThrow(TypeError);
  });

  it('defaults specificHeat to 0 J/(kg·K) (dial fallback territory)', () => {
    const m = makeStuff(() => new Material());
    expect(m.getSpecificHeat().rawValue()).toBe(0);
    expect(m.getSpecificHeat().unit).toBe('J/(kg·K)');
  });

  it('composes SingletonMixin and PropertiedMixin', () => {
    const m = makeStuff(() => new Material());
    expect(MixinApi.hasMixin(m, Mixins.Singleton)).toBe(true);
    expect(MixinApi.isPropertied(m)).toBe(true);
  });
});
