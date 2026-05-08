import { describe, it, expect } from 'vitest';
import { Thing } from '../../stuff/Thing';
import { AdornmentMixin } from '../Adornment';
import { CartesianLocation } from '../CartesianLocation';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestAdornment extends AdornmentMixin(Thing) {}

describe('AdornmentMixin', () => {
  it('exposes Adornment surface and is detected by MixinApi', () => {
    const fx = makeStuff(() => new TestAdornment());
    expect(MixinApi.isAdornment(fx)).toBe(true);
    expect(MixinApi.hasMixin(TestAdornment, Mixins.Adornment)).toBe(true);
  });

  it('starts with adornedTo === null', () => {
    const fx = makeStuff(() => new TestAdornment());
    expect(fx.getAdornedTo()).toBeNull();
  });

  it('setAdornedTo updates and clears the back-reference', () => {
    const loc = makeStuff(() => new CartesianLocation());
    const fx = makeStuff(() => new TestAdornment());

    fx.setAdornedTo(loc);
    expect(fx.getAdornedTo()).toBe(loc);
    fx.setAdornedTo(null);
    expect(fx.getAdornedTo()).toBeNull();
  });
});
