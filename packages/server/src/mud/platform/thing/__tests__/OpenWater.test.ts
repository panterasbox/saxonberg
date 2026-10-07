/**
 * ⭐⭐ `OpenWater` — the realm's `Swimmable` host, over the **Ladder
 * shape**: a THING standing in the room, not a property of the room.
 *
 * The distinction is the whole reason the class exists, and it is
 * testable: `LocomotionLogic.findEnablementHost` looks at the actor's
 * container **and that container's contents**, so a plain room with open
 * water in it is swimmable and the same plain room without it is not.
 * That is also what makes a fifth reach one authored row rather than a
 * fifth Location subclass.
 *
 * ⚠ The gate ORDER is asserted too, and it is why `axes: ['*']` on the
 * row is safe rather than lax: body plan → posture →
 * `exit.canTraverse` (the **media** gate) → enablement. A dry exit in
 * the same room as the water is refused at the media gate, before any
 * enablement host is looked for — so the water cannot make a footpath
 * swimmable no matter what axes it claims.
 *
 * ⚠⚠ Why this file is new: the only composition of `SwimmableMixin`
 * anywhere was `__tests__/integration/locomotion.test.ts`, which
 * MANUFACTURES its own `SwimZoneLocation`. It passed nightly for three
 * builds while `swim` was afforded by nobody and no water existed in the
 * world. These assertions are about the shipped class.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import OpenWater from '../OpenWater';
import { LocomotionApi } from '../../../api/locomotion';
import { ContainmentApi } from '../../../api/containment';
import CartesianZone from '../../idea/location/CartesianZone';
import CartesianLocation from '../../../lib/location/CartesianLocation';
import Exit from '../../../lib/boundary/Exit';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { MobileMixin } from '../../../lib/spatial/Mobile';
import { SlottableMixin } from '../../../lib/slot/Slottable';
import { PropertiedMixin } from '../../../lib/stuff/Propertied';
import { Idea } from '../../../lib/stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../../lib/mixin';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import {
  buildAllModes,
  buildMode,
} from '../../../lib/locomotion/__tests__/test-helpers';

const MoverBase = PropertiedMixin(
  MobileMixin(SlottableMixin(ContainableMixin(Idea))),
);
class Mover extends MoverBase {}

/** A reach, a shore, and a water exit between them. */
function estuary(): {
  reach: CartesianLocation;
  shore: CartesianLocation;
  wet: Exit;
  dry: Exit;
} {
  const zone = makeStuff(() => new CartesianZone());
  const reach = makeStuff(() => new CartesianLocation());
  const shore = makeStuff(() => new CartesianLocation());
  zone.addLocation(reach, 0, 0, 0);
  zone.addLocation(shore, 0, 1, 0);
  const wet = makeStuff(
    () =>
      new Exit({
        direction: 'north',
        source: reach,
        destination: shore,
        media: ['ground', 'water'],
      }),
  );
  const dry = makeStuff(
    () =>
      new Exit({
        direction: 'east',
        source: reach,
        destination: shore,
        media: ['ground'],
      }),
  );
  return { reach, shore, wet, dry };
}

describe('OpenWater — the thing in the room', () => {
  beforeEach(() => {
    buildAllModes();
  });

  it('composes SwimmableMixin', () => {
    expect(MixinApi.hasMixin(OpenWater, Mixins.Swimmable)).toBe(true);
  });

  it('⭐ affords `swim` from the environment and from peers', () => {
    const buckets = OpenWater.commandContributions;
    expect(buckets.environment).toContain('platform/cmd/movement/swim.yaml');
    expect(buckets.peers).toContain('platform/cmd/movement/swim.yaml');
  });

  it('⭐⭐ water in the room makes a water exit swimmable', async () => {
    const { reach, wet } = estuary();
    await reach.addExit(wet);
    const water = makeStuff(() => new OpenWater());
    water.setAxes(['*']);
    ContainmentApi.move(water, reach);
    const swimmer = makeStuff(() => new Mover());
    ContainmentApi.move(swimmer, reach);

    const guard = LocomotionApi.canTraverseExit(
      swimmer,
      wet,
      buildMode('swim'),
      'north',
    );
    expect(guard.ok).toBe(true);
  });

  it('⭐⭐ and the SAME room without it is not — taking the water away is what makes it not', async () => {
    const { reach, wet } = estuary();
    await reach.addExit(wet);
    const swimmer = makeStuff(() => new Mover());
    ContainmentApi.move(swimmer, reach);

    const guard = LocomotionApi.canTraverseExit(
      swimmer,
      wet,
      buildMode('swim'),
      'north',
    );
    expect(guard.ok).toBe(false);
    expect(guard.gate).toBe('enablement');
  });

  it('⚠ the MEDIA gate runs first, so `axes: [*]` cannot wet a footpath', async () => {
    const { reach, dry } = estuary();
    await reach.addExit(dry);
    const water = makeStuff(() => new OpenWater());
    water.setAxes(['*']);
    ContainmentApi.move(water, reach);
    const swimmer = makeStuff(() => new Mover());
    ContainmentApi.move(swimmer, reach);

    const guard = LocomotionApi.canTraverseExit(
      swimmer,
      dry,
      buildMode('swim'),
      'east',
    );
    expect(guard.ok).toBe(false);
    // Refused BEFORE enablement is consulted — which is the reason the
    // row may claim every axis without claiming every exit.
    expect(guard.gate).toBe('exitMode');
  });
});
