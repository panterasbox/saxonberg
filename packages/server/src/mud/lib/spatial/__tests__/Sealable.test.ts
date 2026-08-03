import { describe, it, expect } from 'vitest';
import { SealableMixin } from '../Sealable';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import PersistentHydrator from '../../../obj/persistence/PersistentHydrator';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestSealable extends SealableMixin(Idea) {}

describe('SealableMixin', () => {
  it('defaults to closed', () => {
    const s = makeStuff(() => new TestSealable());
    expect(s.isOpen()).toBe(false);
  });

  it('open() and close() flip state idempotently', () => {
    const s = makeStuff(() => new TestSealable());
    s.open();
    expect(s.isOpen()).toBe(true);
    s.open();
    expect(s.isOpen()).toBe(true);
    s.close();
    expect(s.isOpen()).toBe(false);
    s.close();
    expect(s.isOpen()).toBe(false);
  });

  it('setOpen flips state and rejects non-boolean', () => {
    const s = makeStuff(() => new TestSealable());
    s.setOpen(true);
    expect(s.isOpen()).toBe(true);
    s.setOpen(false);
    expect(s.isOpen()).toBe(false);
    expect(() => s.setOpen(1 as unknown as boolean)).toThrow(TypeError);
  });

  it('MixinApi.isSealable narrows correctly', () => {
    const s = makeStuff(() => new TestSealable());
    expect(MixinApi.isSealable(s)).toBe(true);
  });

  it('declares persistent field "open" (noun form)', () => {
    expect(
      MixinApi.getAllPersistentFields(TestSealable)
    ).toContain('open');
  });

  describe('persistence round-trip', () => {
    it('hydrates open via the new method-first dispatch (setOpen)', async () => {
      const s = makeStuff(() => new TestSealable());
      await makeStuff(() => new PersistentHydrator()).hydrate(s, { open: true });
      expect(s.isOpen()).toBe(true);
    });

    it('hydrating a non-boolean throws via setOpen guard', async () => {
      const s = makeStuff(() => new TestSealable());
      await expect(
        makeStuff(() => new PersistentHydrator()).hydrate(s, {
          open: 1 as unknown as boolean,
        })
      ).rejects.toThrow(TypeError);
    });

    it('the old "isOpen" key is ignored — no dispatch happens', async () => {
      const s = makeStuff(() => new TestSealable());
      await makeStuff(() => new PersistentHydrator()).hydrate(s, {
        isOpen: true,
      } as unknown as Record<string, unknown>);
      // No persistent field 'isOpen' is declared, so the data key is
      // silently skipped. State remains the default (closed).
      expect(s.isOpen()).toBe(false);
    });
  });
});
