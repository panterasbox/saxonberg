import { describe, it, expect } from 'vitest';
import Thing from '../../stuff/Thing';
import { ConcealableMixin } from '../Concealable';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Idea } from '../../stuff/Idea';

// Compose onto a bare Idea so the test exercises the mixin in isolation
// (Thing already composes it — see the registration assertion below).
const ConcealableIdea = ConcealableMixin(Idea);

describe('ConcealableMixin', () => {
  it('is registered and narrows via MixinApi.isConcealable', () => {
    const c = makeStuff(() => new ConcealableIdea());
    expect(MixinApi.hasMixin(c, Mixins.Concealable)).toBe(true);
    expect(MixinApi.isConcealable(c)).toBe(true);
  });

  it('defaults to obvious (an un-authored thing is not concealed)', () => {
    const c = makeStuff(() => new ConcealableIdea());
    expect(c.getConcealment()).toBe('obvious');
    expect(c.isConcealed()).toBe(false);
  });

  it('round-trips a set concealment band', () => {
    const c = makeStuff(() => new ConcealableIdea());
    c.setConcealment('deep');
    expect(c.getConcealment()).toBe('deep');
    expect(c.isConcealed()).toBe(true);

    c.setConcealment('obvious');
    expect(c.getConcealment()).toBe('obvious');
    expect(c.isConcealed()).toBe(false);
  });

  it('rejects an unknown band on set', () => {
    const c = makeStuff(() => new ConcealableIdea());
    // @ts-expect-error — deliberately off-vocabulary
    expect(() => c.setConcealment('nonsense')).toThrow(RangeError);
  });

  it('exposes concealment as a persistent field', () => {
    // The mixin contributes `concealment` to the composed class's
    // persistent-field set (collected across the mixin chain).
    const fields = MixinApi.getAllPersistentFields(ConcealableIdea);
    expect(fields).toContain('concealment');
  });

  it('Thing composes ConcealableMixin (every loose object can carry a level)', () => {
    const t = makeStuff(() => new Thing());
    expect(MixinApi.isConcealable(t)).toBe(true);
    expect(t.getConcealment()).toBe('obvious');
  });
});
