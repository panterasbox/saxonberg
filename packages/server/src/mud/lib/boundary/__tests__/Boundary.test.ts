import "../../../../test-bootstrap";
import { describe, it, expect, afterEach , beforeEach } from 'vitest';
import { Boundary } from '../Boundary';
import CartesianLocation from '../../location/CartesianLocation';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import { BoundaryApi } from '../../../api/boundary';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../security/__tests__/test-setup';

describe('Boundary', () => {
  beforeEach(() => {
    seedKernelContentStore();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it('⭐ mints its anchor pair at registration, adorned to nobody', async () => {
    // The pair is CLONED (`/platform/thing/BoundaryAnchor`) at
    // postRegister and lives as long as the boundary does, migrating
    // between hosts rather than being destroyed and rebuilt. Before
    // template inheritance they were `createSync`'d at install time.
    const b = await StuffApi.create(() => new Boundary());
    expect(b.getAnchorA()).not.toBeNull();
    expect(b.getAnchorB()).not.toBeNull();
    expect(b.getAnchorA()!.getSide()).toBe('A');
    expect(b.getAnchorB()!.getSide()).toBe('B');
    // Minted, but installed nowhere.
    expect(b.getAnchorA()!.getAdornedTo()).toBeNull();
    expect(b.getConduits()).toEqual([]);
  });

  it('is Visible and Perceptible', async () => {
    const b = await StuffApi.create(() => new Boundary());
    expect(MixinApi.isVisible(b)).toBe(true);
    expect(MixinApi.isPerceptible(b)).toBe(true);
  });

  it('BoundaryApi.attachExistingBoundary wires anchors on both hosts', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const boundary = await StuffApi.create(() => new Boundary());
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

  it('attachExistingBoundary rejects a hostA === hostB install', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    const boundary = await StuffApi.create(() => new Boundary());
    expect(() =>
      BoundaryApi.attachExistingBoundary({ boundary, hostA: a, hostB: a })
    ).toThrow(/must differ/);
  });

  it('attachExistingBoundary rejects re-installing on an already-wired boundary', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    const c = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    zone.addLocation(c, 1, 0, 0);

    const boundary = await StuffApi.create(() => new Boundary());
    BoundaryApi.attachExistingBoundary({ boundary, hostA: a, hostB: b });
    expect(() =>
      BoundaryApi.attachExistingBoundary({ boundary, hostA: a, hostB: c })
    ).toThrow(/already installed/);
  });

  it('getOtherSide / getOtherAnchor / getOtherHost walk the pair correctly', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const boundary = await StuffApi.create(() => new Boundary());
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

  it('detach() removes both anchors from their hosts and KEEPS the pair', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const boundary = await StuffApi.create(() => new Boundary());
    BoundaryApi.attachExistingBoundary({ boundary, hostA: a, hostB: b });
    const anchorA = boundary.getAnchorA()!;
    const anchorB = boundary.getAnchorB()!;

    boundary.detach();

    // ⭐ The SLOTS survive: an anchor is the boundary's own per-side
    // proxy, minted once with it, and detach only drops the host link.
    // (It used to null the slots and let the next install mint a fresh
    // pair synchronously — which a clone cannot do.)
    expect(boundary.getAnchorA()).toBe(anchorA);
    expect(boundary.getAnchorB()).toBe(anchorB);
    expect(anchorA.getAdornedTo()).toBeNull();
    expect(anchorB.getAdornedTo()).toBeNull();
    expect(a.getFixtures()).not.toContain(anchorA);
    expect(b.getFixtures()).not.toContain(anchorB);
  });

  it('detach() is idempotent', async () => {
    const boundary = await StuffApi.create(() => new Boundary());
    expect(() => boundary.detach()).not.toThrow();
    expect(() => boundary.detach()).not.toThrow();
  });

  it('BoundaryApi.destruct destructs the boundary and its anchors', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const boundary = await StuffApi.create(() => new Boundary());
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

  it('Adornable.getFixtureBoundaries dedupes the boundary across anchor walks', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const boundary = await StuffApi.create(() => new Boundary());
    BoundaryApi.attachExistingBoundary({ boundary, hostA: a, hostB: b });

    expect(a.getFixtureBoundaries()).toEqual([boundary]);
    expect(b.getFixtureBoundaries()).toEqual([boundary]);
  });

  it('host destruct walks fixtures and tears down the anchor on that side', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const boundary = await StuffApi.create(() => new Boundary());
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
