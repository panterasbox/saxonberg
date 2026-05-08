import { describe, it, expect, afterEach } from 'vitest';
import { CartesianLocation } from '../../spatial/CartesianLocation';
import { CartesianZone } from '../../spatial/CartesianZone';
import { Thing } from '../../stuff/Thing';
import { AdornmentMixin } from '../Adornment';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi, ContainmentError } from '../../../api/containment';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestFixture extends AdornmentMixin(Thing) {}

describe('AdornableMixin (composed on Location)', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('Location is Adornable', () => {
    const loc = makeStuff(() => new CartesianLocation());
    expect(MixinApi.isAdornable(loc)).toBe(true);
    expect(MixinApi.hasMixin(CartesianLocation, Mixins.Adornable)).toBe(true);
  });

  it('addFixture / hasFixture / getFixtures round-trip and stamp adornedTo', () => {
    const loc = makeStuff(() => new CartesianLocation());
    const fx = makeStuff(() => new TestFixture());

    expect(loc.addFixture(fx)).toBe(true);
    expect(loc.hasFixture(fx)).toBe(true);
    expect(loc.getFixtures()).toContain(fx);
    expect(fx.getAdornedTo()).toBe(loc);
  });

  it('addFixture is idempotent — second add returns false', () => {
    const loc = makeStuff(() => new CartesianLocation());
    const fx = makeStuff(() => new TestFixture());

    expect(loc.addFixture(fx)).toBe(true);
    expect(loc.addFixture(fx)).toBe(false);
    expect(loc.getFixtures()).toHaveLength(1);
  });

  it('removeFixture clears adornedTo and detaches', () => {
    const loc = makeStuff(() => new CartesianLocation());
    const fx = makeStuff(() => new TestFixture());
    loc.addFixture(fx);

    expect(loc.removeFixture(fx)).toBe(true);
    expect(loc.hasFixture(fx)).toBe(false);
    expect(fx.getAdornedTo()).toBeNull();
  });

  it('removeFixture returns false for an unknown fixture', () => {
    const loc = makeStuff(() => new CartesianLocation());
    const fx = makeStuff(() => new TestFixture());
    expect(loc.removeFixture(fx)).toBe(false);
  });

  it('removeFixture only clears adornedTo when it still points at us (re-attach safety)', () => {
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    const fx = makeStuff(() => new TestFixture());

    a.addFixture(fx);
    expect(fx.getAdornedTo()).toBe(a);
    // Re-attach without going through removeFixture first — the
    // adornedTo back-ref repoints atomically inside addFixture.
    b.addFixture(fx);
    expect(fx.getAdornedTo()).toBe(b);
    // Now remove from `a`. The collection on `a` still happens to
    // contain the fixture (we never removed it), but the back-ref
    // points at `b`. removeFixture must NOT stomp `b`'s claim.
    a.removeFixture(fx);
    expect(fx.getAdornedTo()).toBe(b);
  });

  it('AdornableMixin.prepareDestroy destructs every fixture', () => {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new CartesianLocation());
    zone.addLocation(loc, 0, 0, 0);

    const fx1 = makeStuff(() => new TestFixture());
    const fx2 = makeStuff(() => new TestFixture());
    loc.addFixture(fx1);
    loc.addFixture(fx2);

    StuffApi.destruct(loc);

    expect(fx1.isDestroyed()).toBe(true);
    expect(fx2.isDestroyed()).toBe(true);
  });

  it('ContainmentApi.move rejects an attached Adornment with a ContainmentError', () => {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new CartesianLocation());
    const dest = makeStuff(() => new CartesianLocation());
    zone.addLocation(loc, 0, 0, 0);
    zone.addLocation(dest, 0, 1, 0);

    const fx = makeStuff(() => new TestFixture());
    loc.addFixture(fx);

    expect(() => ContainmentApi.move(fx, dest)).toThrow(ContainmentError);
  });

  it('ContainmentApi.move accepts a detached Adornment', () => {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new CartesianLocation());
    zone.addLocation(loc, 0, 0, 0);

    const fx = makeStuff(() => new TestFixture());
    loc.addFixture(fx);
    loc.removeFixture(fx);

    expect(() => ContainmentApi.move(fx, loc)).not.toThrow();
    expect(loc.getContents()).toContain(fx);
  });
});
