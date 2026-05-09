import { describe, it, expect } from 'vitest';
import { Material } from '../Material';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('Material', () => {
  it('round-trips bulk fields through getters/setters', () => {
    const m = makeStuff(() => new Material());
    m.setName('iron');
    m.setDensity(7874);
    m.setHardness(4);
    m.setFlammability(0);
    m.setOpacity(1);
    m.setThermalConductivity(80);
    m.setElectricalConductivity(1e7);
    m.setMagneticSusceptibility(0.99);
    m.setEdibility(false);
    m.setNutrients(['iron']);
    m.setToxicity(['iron-poisoning']);
    m.setDamageResistance({ slash: 0.7, blunt: 0.4 });

    expect(m.getName()).toBe('iron');
    expect(m.getDensity()).toBe(7874);
    expect(m.getHardness()).toBe(4);
    expect(m.getOpacity()).toBe(1);
    expect(m.getThermalConductivity()).toBe(80);
    expect(m.getElectricalConductivity()).toBe(1e7);
    expect(m.getMagneticSusceptibility()).toBeCloseTo(0.99);
    expect(m.getEdibility()).toBe(false);
    expect(m.getNutrients()).toEqual(['iron']);
    expect(m.getToxicity()).toEqual(['iron-poisoning']);
    expect(m.getDamageResistance()).toEqual({ slash: 0.7, blunt: 0.4 });
  });

  it('composes SingletonMixin', () => {
    const m = makeStuff(() => new Material());
    expect(MixinApi.hasMixin(m, Mixins.Singleton)).toBe(true);
  });
});
