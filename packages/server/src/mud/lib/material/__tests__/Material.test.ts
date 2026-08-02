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

  it('round-trips hardness and is strict on the MPa unit', () => {
    const m = makeStuff(() => new Material());
    m.setHardness(Quantity.of(600, 'MPa'));
    expect(m.getHardness().rawValue()).toBe(600);
    expect(m.getHardness().unit).toBe('MPa');
    expect(() =>
      m.setHardness(Quantity.of(600, 'Pa') as unknown as Quantity<'MPa'>),
    ).toThrow(TypeError);
  });

  it('round-trips toughness and is strict on the MJ/m³ unit', () => {
    const m = makeStuff(() => new Material());
    m.setToughness(Quantity.of(200, 'MJ/m³'));
    expect(m.getToughness().rawValue()).toBe(200);
    expect(m.getToughness().unit).toBe('MJ/m³');
    expect(() =>
      m.setToughness(Quantity.of(200, 'J') as unknown as Quantity<'MJ/m³'>),
    ).toThrow(TypeError);
  });

  it('round-trips electricalConductivity and is strict on the S/m unit', () => {
    const m = makeStuff(() => new Material());
    m.setElectricalConductivity(Quantity.of(6.0e7, 'S/m'));
    expect(m.getElectricalConductivity().rawValue()).toBe(6.0e7);
    expect(m.getElectricalConductivity().unit).toBe('S/m');
    expect(() =>
      m.setElectricalConductivity(
        Quantity.of(5, 'A') as unknown as Quantity<'S/m'>,
      ),
    ).toThrow(TypeError);
  });

  it('defaults electricalConductivity to 0 S/m (insulator territory)', () => {
    const m = makeStuff(() => new Material());
    expect(m.getElectricalConductivity().rawValue()).toBe(0);
    expect(m.getElectricalConductivity().unit).toBe('S/m');
  });

  it('binds a QuantityMarshaller path for electricalConductivity', () => {
    expect(MixinApi.getAllFieldMarshallers(Material).electricalConductivity).toBeDefined();
    expect(MixinApi.getAllFieldMarshallers(Material).electricalConductivity).toBe(
      '/lib/persistence/QuantityMarshaller/S-per-m',
    );
  });

  it('defaults hardness and toughness to zero Quantities', () => {
    const m = makeStuff(() => new Material());
    expect(m.getHardness().rawValue()).toBe(0);
    expect(m.getHardness().unit).toBe('MPa');
    expect(m.getToughness().rawValue()).toBe(0);
    expect(m.getToughness().unit).toBe('MJ/m³');
  });

  it('binds QuantityMarshaller paths for hardness/toughness', () => {
    // Declarative marshaller binding (the density/specificHeat precedent);
    // the per-unit marshaller absorbs authoring shapes at the persistence
    // boundary. Assert the field→marshaller path is wired for both units.
    expect(MixinApi.getAllFieldMarshallers(Material).hardness).toBeDefined();
    expect(MixinApi.getAllFieldMarshallers(Material).toughness).toBeDefined();
    expect(MixinApi.getAllFieldMarshallers(Material).hardness).not.toBe(
      MixinApi.getAllFieldMarshallers(Material).toughness,
    );
  });

  it('round-trips the fire / phase-change properties, strict on units', () => {
    const m = makeStuff(() => new Material());
    m.setAutoignitionTemperature(Quantity.of(570, 'K'));
    m.setHeatOfCombustion(Quantity.of(16, 'MJ/kg'));
    m.setMeltingPoint(Quantity.of(1811, 'K'));
    m.setLatentHeatOfFusion(Quantity.of(247000, 'J/kg'));
    m.setBoilingPoint(Quantity.of(3134, 'K'));
    m.setLatentHeatOfVaporization(Quantity.of(6340000, 'J/kg'));

    expect(m.getAutoignitionTemperature().rawValue()).toBe(570);
    expect(m.getAutoignitionTemperature().unit).toBe('K');
    expect(m.getHeatOfCombustion().rawValue()).toBe(16);
    expect(m.getHeatOfCombustion().unit).toBe('MJ/kg');
    expect(m.getMeltingPoint().rawValue()).toBe(1811);
    expect(m.getLatentHeatOfFusion().rawValue()).toBe(247000);
    expect(m.getLatentHeatOfFusion().unit).toBe('J/kg');
    expect(m.getBoilingPoint().rawValue()).toBe(3134);
    expect(m.getLatentHeatOfVaporization().rawValue()).toBe(6340000);

    expect(() =>
      m.setHeatOfCombustion(
        Quantity.of(16, 'MJ/m³') as unknown as Quantity<'MJ/kg'>,
      ),
    ).toThrow(TypeError);
    expect(() =>
      m.setLatentHeatOfFusion(
        Quantity.of(1, 'J') as unknown as Quantity<'J/kg'>,
      ),
    ).toThrow(TypeError);
  });

  it('defaults the fire / phase-change properties to zero Quantities', () => {
    const m = makeStuff(() => new Material());
    // An unauthored material never ignites, never melts.
    expect(m.getAutoignitionTemperature().rawValue()).toBe(0);
    expect(m.getAutoignitionTemperature().unit).toBe('K');
    expect(m.getHeatOfCombustion().rawValue()).toBe(0);
    expect(m.getMeltingPoint().rawValue()).toBe(0);
    expect(m.getLatentHeatOfFusion().rawValue()).toBe(0);
    expect(m.getBoilingPoint().rawValue()).toBe(0);
    expect(m.getLatentHeatOfVaporization().rawValue()).toBe(0);
  });

  it('binds QuantityMarshaller paths for the fire / phase-change props', () => {
    expect(MixinApi.getAllFieldMarshallers(Material).autoignitionTemperature).toBeDefined();
    expect(MixinApi.getAllFieldMarshallers(Material).heatOfCombustion).toBeDefined();
    expect(MixinApi.getAllFieldMarshallers(Material).meltingPoint).toBeDefined();
    expect(MixinApi.getAllFieldMarshallers(Material).latentHeatOfFusion).toBeDefined();
    expect(MixinApi.getAllFieldMarshallers(Material).boilingPoint).toBeDefined();
    expect(MixinApi.getAllFieldMarshallers(Material).latentHeatOfVaporization).toBeDefined();
  });

  it('composes SingletonMixin and PropertiedMixin', () => {
    const m = makeStuff(() => new Material());
    expect(MixinApi.hasMixin(m, Mixins.Singleton)).toBe(true);
    expect(MixinApi.isPropertied(m)).toBe(true);
  });
});
