/**
 * BoundaryApi tests — `attach` / `detach`, the one two-object act.
 *
 * ⭐ A boundary is ONE object; each place's exit is a SIDE of it. The Api
 * refuses a third side, an exit already on another boundary and the same
 * exit twice, and is idempotent for a side already attached.
 */

import "../../../test-bootstrap";
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { BoundaryApi } from '../boundary';
import { BoundaryLogic } from '../../platform/idea/api/BoundaryLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import { Boundary } from '../../lib/boundary/Boundary';
import Exit from '../../lib/boundary/Exit';
import Location from '../../lib/location/Location';
import CartesianZone from '../../platform/idea/location/CartesianZone';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../lib/security/__tests__/test-setup';

describe('BoundaryApi.attach / detach', () => {
  let a: Location;
  let b: Location;

  beforeEach(() => {
    seedKernelContentStore();
    const zone = makeStuff(() => new CartesianZone());
    a = makeStuff(() => new Location());
    b = makeStuff(() => new Location());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  function exit(direction: string): Exit {
    return makeStuff(() => new Exit({ direction, source: a, destination: b }));
  }

  it('returns the boundary it was given', async () => {
    const boundary = await StuffApi.create(() => new Boundary());
    expect(BoundaryApi.attach(boundary, exit('north'))).toBe(boundary);
  });

  it('is idempotent for a side already attached', async () => {
    const boundary = await StuffApi.create(() => new Boundary());
    const north = exit('north');
    BoundaryApi.attach(boundary, north);
    expect(() => BoundaryApi.attach(boundary, north)).not.toThrow();
    expect(boundary.getSides()).toEqual([north, null]);
  });

  it('⛔ refuses a third side — a way has only two', async () => {
    const boundary = await StuffApi.create(() => new Boundary());
    BoundaryApi.attach(boundary, exit('north'), exit('south'));
    const third = exit('east');
    expect(() => BoundaryApi.attach(boundary, third)).toThrow(/two sides/);
    expect(third.getBoundary()).toBeNull();
  });

  it('⛔ refuses an exit already on another boundary', async () => {
    const one = await StuffApi.create(() => new Boundary());
    const two = await StuffApi.create(() => new Boundary());
    const north = exit('north');
    BoundaryApi.attach(one, north);
    expect(() => BoundaryApi.attach(two, north)).toThrow(/already has a boundary/);
    expect(north.getBoundary()).toBe(one);
    expect(two.sideOf(north)).toBeNull();
  });

  it('⛔ refuses the same exit as both sides', async () => {
    const boundary = await StuffApi.create(() => new Boundary());
    const north = exit('north');
    expect(() => BoundaryApi.attach(boundary, north, north)).toThrow(/both sides/);
    expect(boundary.getSides()).toEqual([null, null]);
  });

  it('detach lets a side go and the boundary keeps the other', async () => {
    const boundary = await StuffApi.create(() => new Boundary());
    const north = exit('north');
    const south = exit('south');
    BoundaryApi.attach(boundary, north, south);

    BoundaryApi.detach(north);
    expect(north.getBoundary()).toBeNull();
    expect(boundary.sideOf(north)).toBeNull();
    expect(boundary.sideOf(south)).toBe('B');

    // Idempotent, and an exit with no boundary is a no-op.
    expect(() => BoundaryApi.detach(north)).not.toThrow();

    // The freed slot takes a new side.
    const east = exit('east');
    BoundaryApi.attach(boundary, east);
    expect(boundary.getSides()).toEqual([east, south]);
  });

  it('⛔ Exit._setBoundary is BoundaryLogic-only', async () => {
    const boundary = await StuffApi.create(() => new Boundary());
    expect(() => exit('north')._setBoundary(boundary)).toThrow(SecurityError);
  });
});

describe('BoundaryLogic singleton encapsulation', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('lives at /platform/idea/api/boundary once the facade has materialized it', () => {
    BoundaryApi.mintKeyway();
    expect(StuffApi.findByTemplatePath('/platform/idea/api/boundary')).toBeDefined();
  });

  it('denies a direct logic-method call from a non-BoundaryApi caller', async () => {
    BoundaryApi.mintKeyway();
    const logic = StuffApi.findByTemplatePath<BoundaryLogic>(
      '/platform/idea/api/boundary'
    );
    expect(logic).toBeDefined();
    const victim = await StuffApi.create(() => new Boundary());
    expect(() => logic!.attach(victim, [])).toThrow(SecurityError);
  });
});
