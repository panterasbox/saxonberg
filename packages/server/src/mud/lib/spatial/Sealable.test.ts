import { describe, it, expect } from 'vitest';
import { SealableMixin } from './Sealable';
import { Idea } from '../stuff/Idea';
import { MixinApi } from '../../api/mixin';
import { makeStuff } from '../security/test-setup';

class TestSealable extends SealableMixin(Idea) {}

describe('SealableMixin', () => {
  it('defaults to closed', () => {
    const s = makeStuff(() => new TestSealable());
    expect(s.isOpen).toBe(false);
  });

  it('open() and close() flip state idempotently', () => {
    const s = makeStuff(() => new TestSealable());
    s.open();
    expect(s.isOpen).toBe(true);
    s.open();
    expect(s.isOpen).toBe(true);
    s.close();
    expect(s.isOpen).toBe(false);
    s.close();
    expect(s.isOpen).toBe(false);
  });

  it('MixinApi.isSealable narrows correctly', () => {
    const s = makeStuff(() => new TestSealable());
    expect(MixinApi.isSealable(s)).toBe(true);
  });
});
