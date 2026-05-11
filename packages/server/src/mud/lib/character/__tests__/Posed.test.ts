import { describe, it, expect, beforeEach } from 'vitest';
import { PosedMixin } from '../Posed';
import { Postures } from '../../slot/Postured';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestPosed extends PosedMixin(Idea) {}

describe('PosedMixin', () => {
  let p: TestPosed;
  beforeEach(() => {
    p = makeStuff(() => new TestPosed());
  });

  it('default posture is Postures.Stand', () => {
    expect(p.getPosture()).toBe(Postures.Stand);
  });

  it('round-trips setPosture/getPosture', () => {
    p.setPosture(Postures.Sit);
    expect(p.getPosture()).toBe(Postures.Sit);
  });

  it('passes the MixinApi.isPosed predicate', () => {
    expect(MixinApi.isPosed(p)).toBe(true);
    expect(MixinApi.hasMixin(p, Mixins.Posed)).toBe(true);
  });
});
