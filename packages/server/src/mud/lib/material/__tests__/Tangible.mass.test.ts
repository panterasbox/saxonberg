import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TangibleMixin } from '../Tangible';
import Thing from '../../stuff/Thing';
import PersistentHydrator from '../../../obj/persistence/PersistentHydrator';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TangibleThing extends TangibleMixin(Thing) {}

describe('TangibleMixin — mass', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
    installV1QuantityMarshallers();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('defaults to zero kg', () => {
    const t = makeStuff(() => new TangibleThing());
    expect(t.getMass().rawValue()).toBe(0);
    expect(t.getMass().unit).toBe('kg');
  });

  it('setMass accepts Quantity<kg>', () => {
    const t = makeStuff(() => new TangibleThing());
    t.setMass(Quantity.of(5, 'kg'));
    expect(t.getMass().rawValue()).toBe(5);
  });

  it('setMass is strict — rejects bare numerics, strings, or wrong-unit Quantities', () => {
    const t = makeStuff(() => new TangibleThing());
    expect(() =>
      t.setMass(12 as unknown as Quantity<'kg'>)
    ).toThrow();
    expect(() =>
      t.setMass('medium' as unknown as Quantity<'kg'>)
    ).toThrow();
    expect(() =>
      t.setMass(Quantity.of(5, 'g') as unknown as Quantity<'kg'>)
    ).toThrow();
  });

  describe('PersistentHydrator round-trip — marshaller-shape coercion', () => {
    it('hydrates bare-number canonical kg', async () => {
      const t = makeStuff(() => new TangibleThing());
      await makeStuff(() => new PersistentHydrator()).hydrate(t, {
        mass: 5,
      });
      expect(t.getMass().rawValue()).toBe(5);
    });

    it('hydrates "heavy" tag string via KG_TAGS', async () => {
      const t = makeStuff(() => new TangibleThing());
      await makeStuff(() => new PersistentHydrator()).hydrate(t, {
        mass: 'heavy',
      });
      expect(t.getMass().rawValue()).toBe(50);
    });

    it('hydrates a canonical literal "5 kg"', async () => {
      const t = makeStuff(() => new TangibleThing());
      await makeStuff(() => new PersistentHydrator()).hydrate(t, {
        mass: '5 kg',
      });
      expect(t.getMass().rawValue()).toBe(5);
    });

    it('hydrates an alt-unit literal "12000 g" via the converter', async () => {
      const t = makeStuff(() => new TangibleThing());
      await makeStuff(() => new PersistentHydrator()).hydrate(t, {
        mass: '12000 g',
      });
      expect(t.getMass().rawValue()).toBe(12);
    });

    it('hydrates from {value, unit} JSON shape', async () => {
      const t = makeStuff(() => new TangibleThing());
      await makeStuff(() => new PersistentHydrator()).hydrate(t, {
        mass: { value: 12, unit: 'kg' },
      });
      expect(t.getMass().rawValue()).toBe(12);
    });
  });
});
