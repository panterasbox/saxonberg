import { describe, it, expect } from 'vitest';
import { SealableMixin } from '../Sealable';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { ProxyApi } from '../../../api/proxy';
import { PersistentHydrator } from '../../persistence/PersistentHydrator';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestSealable extends SealableMixin(Idea) {}

describe('SealableMixin', () => {
  it('defaults to closed', () => {
    const s = makeStuff(() => new TestSealable());
    expect(s.getIsOpen()).toBe(false);
  });

  it('open() and close() flip state idempotently', () => {
    const s = makeStuff(() => new TestSealable());
    s.open();
    expect(s.getIsOpen()).toBe(true);
    s.open();
    expect(s.getIsOpen()).toBe(true);
    s.close();
    expect(s.getIsOpen()).toBe(false);
    s.close();
    expect(s.getIsOpen()).toBe(false);
  });

  it('MixinApi.isSealable narrows correctly', () => {
    const s = makeStuff(() => new TestSealable());
    expect(MixinApi.isSealable(s)).toBe(true);
  });

  describe('persistence round-trip', () => {
    it('hydrates isOpen via bracket-assign, fires the setter', async () => {
      const s = makeStuff(() => new TestSealable());
      await new PersistentHydrator().hydrate(s, { isOpen: true });
      expect(s.getIsOpen()).toBe(true);
    });

    it('toDocument-shape bracket-read returns the hydrated value', async () => {
      const s = makeStuff(() => new TestSealable());
      await new PersistentHydrator().hydrate(s, { isOpen: true });
      // Mirrors `Persistable.toDocument`'s `self[field]` read: with
      // `isOpen` shaped as a protected accessor pair, the framework
      // round-trip relies on bracket-read seeing the getter.
      const raw = ProxyApi.unwrap(s) as unknown as { isOpen: boolean };
      expect(raw.isOpen).toBe(true);
    });

    it('hydrating a non-boolean throws via the setter guard', async () => {
      const s = makeStuff(() => new TestSealable());
      await expect(
        new PersistentHydrator().hydrate(s, {
          isOpen: 1 as unknown as boolean,
        })
      ).rejects.toThrow(TypeError);
    });
  });
});
