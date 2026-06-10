import { describe, it, expect } from 'vitest';
import { AugmentMixin } from '../Augment';
import Thing from '../../stuff/Thing';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class BareAugment extends AugmentMixin(Thing) {}

class FooConferring extends AugmentMixin(Thing) {
  override confers(): readonly string[] {
    return ['FooMixin', 'BarMixin'];
  }
}

describe('AugmentMixin', () => {
  it('default confers() returns []', () => {
    const a = makeStuff(() => new BareAugment());
    expect(a.confers()).toEqual([]);
  });

  it('subclass override returns mixin names', () => {
    const a = makeStuff(() => new FooConferring());
    expect(a.confers()).toEqual(['FooMixin', 'BarMixin']);
  });

  it('MixinApi.isAugment narrows', () => {
    const a = makeStuff(() => new BareAugment());
    expect(MixinApi.isAugment(a)).toBe(true);
    const plain = makeStuff(() => new Thing());
    expect(MixinApi.isAugment(plain)).toBe(false);
  });
});
