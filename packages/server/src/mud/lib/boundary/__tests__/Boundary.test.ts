import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import { Boundary } from '../Boundary';
import CartesianLocation from '../../location/CartesianLocation';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import { BoundaryApi } from '../../../api/boundary';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('Boundary', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('constructs with no anchors and an empty conduit registry', () => {
    const b = makeStuff(() => new Boundary());
    expect(b.getAnchorA()).toBeNull();
    expect(b.getAnchorB()).toBeNull();
    expect(b.getAnchors()).toEqual([null, null]);
    expect(b.getConduits()).toEqual([]);
  });

  it('is Visible and Perceptible', () => {
    const b = makeStuff(() => new Boundary());
    expect(MixinApi.isVisible(b)).toBe(true);
    expect(MixinApi.isPerceptible(b)).toBe(true);
  });

  it('BoundaryApi.attachExistingBoundary wires anchors on both hosts', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const boundary = makeStuff(() => new Boundary());
    BoundaryApi.attachExistingBoundary({ boundary, hostA: a, hostB: b });

    const anchorA = boundary.getAnchorA();
    const anchorB = boundary.getAnchorB();
    expect(anchorA).not.toBeNull();
    expect(anchorB).not.toBeNull();
    expect(anchorA!.getSide()).toBe('A');
    expect(anchorB!.getSide()).toBe('B');
    expect(anchorA!.getBoundary()).toBe(boundary);
    expect(anchorB!.getBoundary()).toBe(boundary);
    expect(a.getFixtures()).toContain(anchorA);
    expect(b.getFixtures()).toContain(anchorB);
    expect(anchorA!.getAdornedTo()).toBe(a);
    expect(anchorB!.getAdornedTo()).toBe(b);
  });

  it('attachExistingBoundary rejects a hostA === hostB install', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    const boundary = makeStuff(() => new Boundary());
    expect(() =>
      BoundaryApi.attachExistingBoundary({ boundary, hostA: a, hostB: a })
    ).toThrow(/must differ/);
  });

  it('attachExistingBoundary rejects re-installing on an already-wired boundary', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    const c = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    zone.addLocation(c, 1, 0, 0);

    const boundary = makeStuff(() => new Boundary());
    BoundaryApi.attachExistingBoundary({ boundary, hostA: a, hostB: b });
    expect(() =>
      BoundaryApi.attachExistingBoundary({ boundary, hostA: a, hostB: c })
    ).toThrow(/already has anchors/);
  });

  it('getOtherSide / getOtherAnchor / getOtherHost walk the pair correctly', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const boundary = makeStuff(() => new Boundary());
    BoundaryApi.attachExistingBoundary({ boundary, hostA: a, hostB: b });

    const anchorA = boundary.getAnchorA()!;
    const anchorB = boundary.getAnchorB()!;
    expect(boundary.getOtherSide(anchorA)).toBe('B');
    expect(boundary.getOtherSide(anchorB)).toBe('A');
    expect(boundary.getOtherAnchor(anchorA)).toBe(anchorB);
    expect(boundary.getOtherAnchor(anchorB)).toBe(anchorA);
    expect(boundary.getOtherHost(a)).toBe(b);
    expect(boundary.getOtherHost(b)).toBe(a);
  });

  it('detach() removes both anchors from their hosts and clears the slots', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const boundary = makeStuff(() => new Boundary());
    BoundaryApi.attachExistingBoundary({ boundary, hostA: a, hostB: b });
    const anchorA = boundary.getAnchorA()!;
    const anchorB = boundary.getAnchorB()!;

    boundary.detach();

    expect(boundary.getAnchorA()).toBeNull();
    expect(boundary.getAnchorB()).toBeNull();
    expect(a.getFixtures()).not.toContain(anchorA);
    expect(b.getFixtures()).not.toContain(anchorB);
  });

  it('detach() is idempotent', () => {
    const boundary = makeStuff(() => new Boundary());
    expect(() => boundary.detach()).not.toThrow();
    expect(() => boundary.detach()).not.toThrow();
  });

  it('BoundaryApi.destruct destructs the boundary and its anchors', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const boundary = makeStuff(() => new Boundary());
    BoundaryApi.attachExistingBoundary({ boundary, hostA: a, hostB: b });
    const anchorA = boundary.getAnchorA()!;
    const anchorB = boundary.getAnchorB()!;

    BoundaryApi.destruct(boundary);

    expect(boundary.isDestroyed()).toBe(true);
    expect((anchorA as unknown as { isDestroyed(): boolean }).isDestroyed()).toBe(true);
    expect((anchorB as unknown as { isDestroyed(): boolean }).isDestroyed()).toBe(true);
    expect(a.getFixtures()).toHaveLength(0);
    expect(b.getFixtures()).toHaveLength(0);
  });

  it('Adornable.getFixtureBoundaries dedupes the boundary across anchor walks', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const boundary = makeStuff(() => new Boundary());
    BoundaryApi.attachExistingBoundary({ boundary, hostA: a, hostB: b });

    expect(a.getFixtureBoundaries()).toEqual([boundary]);
    expect(b.getFixtureBoundaries()).toEqual([boundary]);
  });

  it('host destruct walks fixtures and tears down the anchor on that side', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const boundary = makeStuff(() => new Boundary());
    BoundaryApi.attachExistingBoundary({ boundary, hostA: a, hostB: b });
    const anchorA = boundary.getAnchorA()!;

    StuffApi.destruct(a);

    // Anchor on side A is destructed via Adornable.onDestruct.
    expect((anchorA as unknown as { isDestroyed(): boolean }).isDestroyed()).toBe(true);
    // The boundary's slot for that side is cleared.
    expect(boundary.getAnchorA()).toBeNull();
    // Side B's anchor is intact (host B still alive).
    expect(boundary.getAnchorB()).not.toBeNull();
  });
});
