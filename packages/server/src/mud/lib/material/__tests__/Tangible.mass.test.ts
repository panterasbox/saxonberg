import { describe, it, expect } from 'vitest';
import { TangibleMixin } from '../Tangible';
import { Thing } from '../../stuff/Thing';
import { PersistentHydrator } from '../../persistence/PersistentHydrator';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';
// Trigger MaterialApi tag-table registrations.
import '../../../api/material';

class TangibleThing extends TangibleMixin(Thing) {}

describe('TangibleMixin — mass (Step G)', () => {
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

  it('setMass accepts numeric (kg canonical)', () => {
    const t = makeStuff(() => new TangibleThing());
    t.setMass(12);
    expect(t.getMass().rawValue()).toBe(12);
  });

  it('setMass accepts a tag string ("medium")', () => {
    const t = makeStuff(() => new TangibleThing());
    t.setMass('medium');
    expect(t.getMass().rawValue()).toBe(5);
  });

  it('setMass accepts an alt-unit literal ("12000 g")', () => {
    const t = makeStuff(() => new TangibleThing());
    t.setMass('12000 g');
    expect(t.getMass().rawValue()).toBe(12);
  });

  it('rejects non-Quantity unit', () => {
    const t = makeStuff(() => new TangibleThing());
    expect(() =>
      t.setMass(Quantity.of(5, 'g') as unknown as Quantity<'kg'>)
    ).toThrow();
  });

  it('persists across PersistentHydrator round-trip — bare-number canonical kg', async () => {
    const t = makeStuff(() => new TangibleThing());
    await makeStuff(() => new PersistentHydrator()).hydrate(t, {
      mass: 5,
    });
    expect(t.getMass().rawValue()).toBe(5);
  });

  it('hydrates "heavy" tag string', async () => {
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

  it('hydrates from {value, unit} JSON shape', async () => {
    const t = makeStuff(() => new TangibleThing());
    await makeStuff(() => new PersistentHydrator()).hydrate(t, {
      mass: { value: 12, unit: 'kg' },
    });
    expect(t.getMass().rawValue()).toBe(12);
  });
});
