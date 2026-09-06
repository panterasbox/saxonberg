/**
 * `Exit.edgeMinutes` — the one number a road needs.
 *
 * ⚠ The load-bearing assertion is the LAST one: nothing in the kernel
 * reads it, so ordinary movement stays instantaneous. A duration on
 * `go north` would be a real-time toll on every step in the game.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import Exit from '../Exit';
import { MobileMixin } from '../../spatial/Mobile';
import { ContainableMixin } from '../../spatial/Containable';
import { Idea } from '../../stuff/Idea';
import { ContainmentApi } from '../../../api/containment';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import CartesianLocation from '../../location/CartesianLocation';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

/** The plainest thing that can walk through an exit. */
class Walker extends MobileMixin(ContainableMixin(Idea)) {
  static _mixinName = 'EdgeMinutesWalker';
}

function endpoints(): { locA: CartesianLocation; locB: CartesianLocation } {
  const zone = makeStuff(() => new CartesianZone());
  const locA = makeStuff(() => new CartesianLocation());
  const locB = makeStuff(() => new CartesianLocation());
  zone.addLocation(locA, 0, 0, 0);
  zone.addLocation(locB, 0, 1, 0);
  return { locA, locB };
}

describe('Exit.edgeMinutes', () => {
  afterEach(() => StuffApi.clearAll());

  it('defaults to null — the corridor default answers instead', () => {
    const { locA, locB } = endpoints();
    const exit = makeStuff(
      () => new Exit({ direction: 'north', source: locA, destination: locB }),
    );
    expect(exit.getEdgeMinutes()).toBeNull();
  });

  it('round-trips through the constructor and the setter', () => {
    const { locA, locB } = endpoints();
    const exit = makeStuff(
      () =>
        new Exit({
          direction: 'north',
          source: locA,
          destination: locB,
          edgeMinutes: 12,
        }),
    );
    expect(exit.getEdgeMinutes()).toBe(12);
    exit.setEdgeMinutes(3);
    expect(exit.getEdgeMinutes()).toBe(3);
    exit.setEdgeMinutes(null);
    expect(exit.getEdgeMinutes()).toBeNull();
  });

  it('refuses a negative or non-finite budget', () => {
    const { locA, locB } = endpoints();
    const exit = makeStuff(
      () => new Exit({ direction: 'north', source: locA, destination: locB }),
    );
    expect(() => exit.setEdgeMinutes(-1)).toThrow(TypeError);
    expect(() => exit.setEdgeMinutes(Number.NaN)).toThrow(TypeError);
  });

  it('is declared persistent so a kind template can author it', () => {
    expect(Exit.fieldMeta._edgeMinutes).toEqual({ persistent: true });
  });

  it('⚠ nothing in the kernel reads it — traverse stays instantaneous', async () => {
    const { locA, locB } = endpoints();
    const exit = makeStuff(
      () =>
        new Exit({
          direction: 'north',
          source: locA,
          destination: locB,
          // Ten game HOURS on one edge. If anything in the kernel spent
          // this, `go north` would be unplayable.
          edgeMinutes: 600,
        }),
    );
    const walker = makeStuff(() => new Walker());
    ContainmentApi.move(walker, locA);

    const before = Date.now();
    await walker.traverse(exit, 'walk');
    expect(Date.now() - before).toBeLessThan(500);
    expect(walker.getContainer()).toBe(locB);
  });
});
