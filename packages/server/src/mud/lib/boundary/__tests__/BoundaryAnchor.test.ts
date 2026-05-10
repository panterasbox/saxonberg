import { describe, it, expect, afterEach } from 'vitest';
import { Boundary } from '../Boundary';
import { BoundaryAnchor } from '../BoundaryAnchor';
import { CartesianLocation } from '../../spatial/CartesianLocation';
import { CartesianZone } from '../../spatial/CartesianZone';
import { BoundaryApi } from '../../../api/boundary';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi, ContainmentError } from '../../../api/containment';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('BoundaryAnchor', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('is an Adornment and a Containable Thing', () => {
    const anchor = makeStuff(() => new BoundaryAnchor('A'));
    expect(MixinApi.isAdornment(anchor)).toBe(true);
    expect(MixinApi.isContainable(anchor)).toBe(true);
  });

  it('getSide() returns the side passed at construction', () => {
    const a = makeStuff(() => new BoundaryAnchor('A'));
    const b = makeStuff(() => new BoundaryAnchor('B'));
    expect(a.getSide()).toBe('A');
    expect(b.getSide()).toBe('B');
  });

  it('getOtherHost walks through the boundary to the opposite side', () => {
    const zone = makeStuff(() => new CartesianZone());
    const roomA = makeStuff(() => new CartesianLocation());
    const roomB = makeStuff(() => new CartesianLocation());
    zone.addLocation(roomA, 0, 0, 0);
    zone.addLocation(roomB, 0, 1, 0);

    const boundary = makeStuff(() => new Boundary());
    BoundaryApi.attachExistingBoundary({
      boundary,
      hostA: roomA,
      hostB: roomB,
    });
    const anchorA = boundary.getAnchorA()!;
    const anchorB = boundary.getAnchorB()!;

    expect(anchorA.getOtherHost()).toBe(roomB);
    expect(anchorB.getOtherHost()).toBe(roomA);
  });

  it('an attached anchor cannot be moved into a Container via ContainmentApi', () => {
    const zone = makeStuff(() => new CartesianZone());
    const roomA = makeStuff(() => new CartesianLocation());
    const roomB = makeStuff(() => new CartesianLocation());
    const trash = makeStuff(() => new CartesianLocation());
    zone.addLocation(roomA, 0, 0, 0);
    zone.addLocation(roomB, 0, 1, 0);
    zone.addLocation(trash, 1, 0, 0);

    const boundary = makeStuff(() => new Boundary());
    BoundaryApi.attachExistingBoundary({
      boundary,
      hostA: roomA,
      hostB: roomB,
    });
    const anchorA = boundary.getAnchorA()!;

    expect(() => ContainmentApi.move(anchorA, trash)).toThrow(ContainmentError);
  });

  it('onDestruct clears the boundary slot for this anchor', () => {
    const zone = makeStuff(() => new CartesianZone());
    const roomA = makeStuff(() => new CartesianLocation());
    const roomB = makeStuff(() => new CartesianLocation());
    zone.addLocation(roomA, 0, 0, 0);
    zone.addLocation(roomB, 0, 1, 0);

    const boundary = makeStuff(() => new Boundary());
    BoundaryApi.attachExistingBoundary({
      boundary,
      hostA: roomA,
      hostB: roomB,
    });
    const anchorA = boundary.getAnchorA()!;
    // Detach from the host's fixture set first so we don't trip the
    // pre-flight veto when the destruction-induced inventory walk
    // touches us.
    roomA.removeFixture(anchorA);
    StuffApi.destruct(anchorA);

    expect(boundary.getAnchorA()).toBeNull();
    // Side B is unaffected.
    expect(boundary.getAnchorB()).not.toBeNull();
  });
});
