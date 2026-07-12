import { describe, it, expect } from 'vitest';
import Thing from '../../stuff/Thing';
import { ConstructedMixin } from '../Constructed';
import { Construction } from '../Construction';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

const ConstructedThing = ConstructedMixin(Thing);

describe('ConstructedMixin', () => {
  it('is registered and narrows via MixinApi.isConstructed', () => {
    const t = makeStuff(() => new ConstructedThing());
    expect(MixinApi.hasMixin(t, Mixins.Constructed)).toBe(true);
    expect(MixinApi.isConstructed(t)).toBe(true);
  });

  it('defaults to no construction', () => {
    const t = makeStuff(() => new ConstructedThing());
    expect(t.getConstructionForm()).toBe('');
    expect(t.getConstruction()).toBeNull();
  });

  it('round-trips the form word and the value-object', () => {
    const t = makeStuff(() => new ConstructedThing());
    t.setConstructionForm('plate');
    expect(t.getConstructionForm()).toBe('plate');
    expect(t.getConstruction()!.getForm()).toBe('plate');

    t.setConstruction(Construction.of('bladed'));
    expect(t.getConstructionForm()).toBe('bladed');
    expect(t.getConstruction()!.isWeapon()).toBe(true);
  });

  it('validates the form on set (empty clears)', () => {
    const t = makeStuff(() => new ConstructedThing());
    expect(() => t.setConstructionForm('nonsense')).toThrow(RangeError);
    t.setConstructionForm('');
    expect(t.getConstruction()).toBeNull();
  });
});
