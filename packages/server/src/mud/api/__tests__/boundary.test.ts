/**
 * BoundaryApi tests.
 *
 * `attachExistingBoundary` and `destruct` are exercised in detail by
 * `lib/boundary/__tests__/Boundary.test.ts` against the concrete
 * Boundary class. This file targets:
 *
 *   - the async `create()` factory entry point (no coverage at the
 *     lib-level test, which always uses pre-built boundaries);
 *   - rejection paths surfaced by the Api wrapper itself.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { BoundaryApi } from '../boundary';
import { StuffApi } from '../stuff';
import { Boundary } from '../../lib/boundary/Boundary';
import CartesianLocation from '../../lib/location/CartesianLocation';
import CartesianZone from '../../lib/location/CartesianZone';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

describe('BoundaryApi.create', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('constructs via factory through StuffApi.create and installs on both hosts', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const boundary = await BoundaryApi.create({
      factory: () => new Boundary(),
      hostA: a,
      hostB: b,
    });

    // The returned boundary is fully wired.
    expect(boundary.getAnchorA()).not.toBeNull();
    expect(boundary.getAnchorB()).not.toBeNull();
    expect(boundary.getAnchorA()!.getAdornedTo()).toBe(a);
    expect(boundary.getAnchorB()!.getAdornedTo()).toBe(b);
    expect(a.getFixtures()).toContain(boundary.getAnchorA());
    expect(b.getFixtures()).toContain(boundary.getAnchorB());
  });

  it('returns the boundary for fluent chaining', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const built = await BoundaryApi.create({
      factory: () => new Boundary(),
      hostA: a,
      hostB: b,
    });

    expect(built).toBeInstanceOf(Object);
    expect(built.getOtherHost(a)).toBe(b);
    expect(built.getOtherHost(b)).toBe(a);
  });

  it('rejects hostA === hostB after the factory has already run', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);

    await expect(
      BoundaryApi.create({
        factory: () => new Boundary(),
        hostA: a,
        hostB: a,
      }),
    ).rejects.toThrow(/must differ/);
  });

  it('composes with destruct to fully tear down a created boundary', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const boundary = await BoundaryApi.create({
      factory: () => new Boundary(),
      hostA: a,
      hostB: b,
    });
    const anchorA = boundary.getAnchorA()!;
    const anchorB = boundary.getAnchorB()!;

    BoundaryApi.destruct(boundary);

    expect(boundary.isDestroyed()).toBe(true);
    expect((anchorA as unknown as { isDestroyed(): boolean }).isDestroyed()).toBe(true);
    expect((anchorB as unknown as { isDestroyed(): boolean }).isDestroyed()).toBe(true);
    expect(a.getFixtures()).toHaveLength(0);
    expect(b.getFixtures()).toHaveLength(0);
  });
});

describe('BoundaryApi.attachExistingBoundary — edge cases not covered by lib-level tests', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('preserves anchor side tags (A/B) deterministically', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const boundary = makeStuff(() => new Boundary());
    BoundaryApi.attachExistingBoundary({ boundary, hostA: a, hostB: b });

    // The side tag is part of the Boundary's symmetric model — anchors
    // expose 'A' / 'B' regardless of host identity. Future code (door
    // bearing, conduit walks) reads this; pin it.
    expect(boundary.getAnchorA()!.getSide()).toBe('A');
    expect(boundary.getAnchorB()!.getSide()).toBe('B');
  });

  it('returns the same boundary instance the caller supplied', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const boundary = makeStuff(() => new Boundary());
    const result = BoundaryApi.attachExistingBoundary({
      boundary,
      hostA: a,
      hostB: b,
    });
    expect(result).toBe(boundary);
  });
});
