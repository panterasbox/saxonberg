/**
 * Locomotion integration tests — § 16 compositions from the
 * locomotion-plan slate. Verifies the substrate as a whole behaves
 * correctly across the verb / Api / mixin / mode-singleton seams.
 *
 * Each test composes a minimal but realistic scenario (location +
 * exit + actor + relevant enablement scope) and asserts both the
 * behavior (did the move happen) and the engagement bookkeeping
 * (engagedMode set / cleared correctly).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocomotionApi } from '../../api/locomotion';
import { ContainmentApi } from '../../api/containment';
import { CartesianZone } from '../../lib/spatial/CartesianZone';
import { CartesianLocation } from '../../lib/spatial/CartesianLocation';
import { Exit } from '../../lib/boundary/Exit';
import { ClimbableMixin } from '../../lib/locomotion/Climbable';
import { SwimmableMixin } from '../../lib/locomotion/Swimmable';
import { FlyableMixin } from '../../lib/locomotion/Flyable';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { MobileMixin } from '../../lib/spatial/Mobile';
import { SlottableMixin } from '../../lib/slot/Slottable';
import { SlottedMixin } from '../../lib/slot/Slotted';
import { MountableMixin } from '../../lib/slot/Mountable';
import { DrivableMixin } from '../../lib/slot/Drivable';
import { Idea } from '../../lib/stuff/Idea';
import { Thing } from '../../lib/stuff/Thing';
import { PropertiedMixin } from '../../lib/stuff/Propertied';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { buildAllModes, buildMode } from '../../lib/locomotion/__tests__/test-helpers';

const ClimbableLoc = ClimbableMixin(CartesianLocation);
class ClimbZoneLocation extends ClimbableLoc {}

const SwimmableLoc = SwimmableMixin(CartesianLocation);
class SwimZoneLocation extends SwimmableLoc {}

const FlyableLoc = FlyableMixin(CartesianLocation);
class FlyZoneLocation extends FlyableLoc {}

const ClimbableLadderBase = ClimbableMixin(ContainableMixin(Thing));
class Ladder extends ClimbableLadderBase {}

const MoverBase = PropertiedMixin(MobileMixin(SlottableMixin(ContainableMixin(Idea))));
class Mover extends MoverBase {}

const MountBase = MobileMixin(MountableMixin(SlottedMixin(ContainableMixin(Idea))));
class TestMount extends MountBase {}

const CartBase = MobileMixin(DrivableMixin(SlottedMixin(ContainableMixin(Idea))));
class TestCart extends CartBase {}

describe('Locomotion integration — § 16 compositions', () => {
  beforeEach(() => {
    buildAllModes();
  });

  it('walks corridor: actor + walk-allowed exit → success', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const locA = makeStuff(() => new CartesianLocation());
    const locB = makeStuff(() => new CartesianLocation());
    zone.addLocation(locA, 0, 0, 0);
    zone.addLocation(locB, 0, 1, 0);
    const exit = makeStuff(() => new Exit({
      direction: 'north', source: locA, destination: locB,
    }));
    locA.addExit(exit);
    const actor = makeStuff(() => new Mover());
    ContainmentApi.move(actor, locA);

    await LocomotionApi.traverseWithDefault(actor, exit);

    expect(actor.getContainer()).toBe(locB);
    expect(actor.getEngagedMode()).toBeNull(); // walk is transient
  });

  it('climbs ladder up attic: ladder in scope, climb-allowed exit → success', async () => {
    const climb = buildMode('climb');
    const zone = makeStuff(() => new CartesianZone());
    const locA = makeStuff(() => new CartesianLocation());
    const locB = makeStuff(() => new CartesianLocation()); // attic, not Climbable
    zone.addLocation(locA, 0, 0, 0);
    zone.addLocation(locB, 0, 0, 1);
    const ladder = makeStuff(() => new Ladder());
    ladder.setAxes(['up']);
    ContainmentApi.move(ladder, locA);
    const exit = makeStuff(() => new Exit({
      direction: 'up', source: locA, destination: locB,
      media: ['vertical'],
    }));
    locA.addExit(exit);
    const actor = makeStuff(() => new Mover());
    ContainmentApi.move(actor, locA);

    const guard = LocomotionApi.canTraverseExit(actor, exit, climb, 'up');
    expect(guard.ok).toBe(true);

    await LocomotionApi.engageAround(actor, climb, exit, () =>
      actor.traverse(exit, climb.getName()),
    );
    expect(actor.getContainer()).toBe(locB);
    // Destination isn't Climbable and has no Climbable contents — transient.
    expect(actor.getEngagedMode()).toBeNull();
  });

  it('walk fails through climb-only exit (gate=exitMode)', () => {
    const walk = buildMode('walk');
    const locA = makeStuff(() => new CartesianLocation());
    const locB = makeStuff(() => new CartesianLocation());
    const exit = makeStuff(() => new Exit({
      direction: 'up', source: locA, destination: locB,
      media: ['vertical'],
    }));
    const actor = makeStuff(() => new Mover());
    ContainmentApi.move(actor, locA);

    const guard = LocomotionApi.canTraverseExit(actor, exit, walk, 'up');
    expect(guard.ok).toBe(false);
    expect(guard.gate).toBe('exitMode');
  });

  it('swims a pond Location: Swimmable Location + swim-allowed exit → success', async () => {
    const swim = buildMode('swim');
    const zone = makeStuff(() => new CartesianZone());
    const pond = makeStuff(() => new SwimZoneLocation());
    pond.setAxes(['*']);
    const beach = makeStuff(() => new CartesianLocation());
    zone.addLocation(pond, 0, 0, 0);
    zone.addLocation(beach, 0, 1, 0);
    const exit = makeStuff(() => new Exit({
      direction: 'north', source: pond, destination: beach,
      media: ['water'],
    }));
    pond.addExit(exit);
    const swimmer = makeStuff(() => new Mover());
    ContainmentApi.move(swimmer, pond);

    const guard = LocomotionApi.canTraverseExit(swimmer, exit, swim, 'north');
    expect(guard.ok).toBe(true);

    await LocomotionApi.engageAround(swimmer, swim, exit, () =>
      swimmer.traverse(exit, swim.getName()),
    );
    expect(swimmer.getContainer()).toBe(beach);
    // Beach isn't Swimmable; engagement is transient.
    expect(swimmer.getEngagedMode()).toBeNull();
  });

  it('persistent swim engagement: destination Swimmable → engagedMode stays set', async () => {
    const swim = buildMode('swim');
    const zone = makeStuff(() => new CartesianZone());
    const pond1 = makeStuff(() => new SwimZoneLocation());
    pond1.setAxes(['*']);
    const pond2 = makeStuff(() => new SwimZoneLocation());
    pond2.setAxes(['*']);
    zone.addLocation(pond1, 0, 0, 0);
    zone.addLocation(pond2, 0, 1, 0);
    const exit = makeStuff(() => new Exit({
      direction: 'north', source: pond1, destination: pond2,
      media: ['water'],
    }));
    pond1.addExit(exit);
    const swimmer = makeStuff(() => new Mover());
    ContainmentApi.move(swimmer, pond1);

    await LocomotionApi.engageAround(swimmer, swim, exit, () =>
      swimmer.traverse(exit, swim.getName()),
    );
    expect(swimmer.getEngagedMode()).toBe(swim);
  });

  it('rider on horse: ride passthrough → host traverses, rider rides along', async () => {
    const ride = buildMode('ride');
    const walk = buildMode('walk');
    const zone = makeStuff(() => new CartesianZone());
    const locA = makeStuff(() => new CartesianLocation());
    const locB = makeStuff(() => new CartesianLocation());
    zone.addLocation(locA, 0, 0, 0);
    zone.addLocation(locB, 0, 1, 0);
    const horse = makeStuff(() => new TestMount());
    horse.setStaticSlots([{ name: 'mount:1', accepts: 'SlottableMixin' }]);
    horse.setMountSlot('mount:1');
    ContainmentApi.move(horse, locA);
    const rider = makeStuff(() => new Mover());
    horse.occupy(rider, 'mount:1');
    ContainmentApi.move(rider, locA);
    const exit = makeStuff(() => new Exit({
      direction: 'north', source: locA, destination: locB,
    }));
    locA.addExit(exit);

    // Rider engaged in ride mode; host carries them.
    rider.setEngagedMode(ride);
    const hostMode = LocomotionApi.resolveHostMode(horse);
    expect(hostMode).toBe(walk); // no vehicularMode authored
    await LocomotionApi.engageAround(horse, hostMode, exit, () =>
      horse.traverse(exit, hostMode.getName()),
    );

    expect(horse.getContainer()).toBe(locB);
    expect(rider.getContainer()).toBe(locB);
    // Rider's engagedMode persists (ride is passthrough — not transient).
    expect(rider.getEngagedMode()).toBe(ride);
  });

  it('rider dismount: vacate clears engagedMode via onSlotReleased witness', () => {
    const ride = buildMode('ride');
    const horse = makeStuff(() => new TestMount());
    horse.setStaticSlots([{ name: 'mount:1', accepts: 'SlottableMixin' }]);
    const rider = makeStuff(() => new Mover());
    horse.occupy(rider, 'mount:1');
    rider.setEngagedMode(ride);
    horse.vacate('mount:1', rider);
    expect(rider.getEngagedMode()).toBeNull();
  });

  it('driver in cart: cart engages wheeled vehicularMode', async () => {
    const drive = buildMode('drive');
    const wheeled = buildMode('wheeled');
    const zone = makeStuff(() => new CartesianZone());
    const locA = makeStuff(() => new CartesianLocation());
    const locB = makeStuff(() => new CartesianLocation());
    zone.addLocation(locA, 0, 0, 0);
    zone.addLocation(locB, 0, 1, 0);
    const cart = makeStuff(() => new TestCart());
    cart.setStaticSlots([{ name: 'driver:1', accepts: 'SlottableMixin' }]);
    cart.setControllerSlot('driver:1');
    cart.setVehicularMode(wheeled);
    ContainmentApi.move(cart, locA);
    const driver = makeStuff(() => new Mover());
    cart.occupy(driver, 'driver:1');
    ContainmentApi.move(driver, locA);
    const exit = makeStuff(() => new Exit({
      direction: 'east', source: locA, destination: locB,
      media: ['ground'],
    }));
    locA.addExit(exit);

    driver.setEngagedMode(drive);
    const hostMode = LocomotionApi.resolveHostMode(cart);
    expect(hostMode).toBe(wheeled);

    await LocomotionApi.engageAround(cart, hostMode, exit, () =>
      cart.traverse(exit, hostMode.getName()),
    );

    expect(cart.getContainer()).toBe(locB);
    expect(driver.getContainer()).toBe(locB);
  });

  it('mountain face too hard for novice (capability < difficulty)', () => {
    const climb = buildMode('climb');
    const mountain = makeStuff(() => new ClimbZoneLocation());
    mountain.setAxes(['up']);
    mountain.setDifficulty(5);
    const novice = makeStuff(() => new Mover());
    ContainmentApi.move(novice, mountain);
    // CLIMBING_CAPABILITY_PROP defaults to 1; difficulty 5; rejects.
    const guard = LocomotionApi.checkEnablement(novice, climb, 'up');
    expect(guard.ok).toBe(false);
    expect(guard.gate).toBe('capability');
  });

  it('mountain face passes for experienced climber', async () => {
    const climb = buildMode('climb');
    const mountain = makeStuff(() => new ClimbZoneLocation());
    mountain.setAxes(['up']);
    mountain.setDifficulty(5);
    const climber = makeStuff(() => new Mover());
    const { CLIMBING_CAPABILITY_PROP } = await import('../../lib/locomotion/Climbable');
    climber.setProp(CLIMBING_CAPABILITY_PROP, 8);
    ContainmentApi.move(climber, mountain);
    const guard = LocomotionApi.checkEnablement(climber, climb, 'up');
    expect(guard.ok).toBe(true);
  });

  it('fly mode finds a Flyable Location', () => {
    const fly = buildMode('fly');
    const sky = makeStuff(() => new FlyZoneLocation());
    sky.setAxes(['*']);
    const flyer = makeStuff(() => new Mover());
    ContainmentApi.move(flyer, sky);
    const guard = LocomotionApi.checkEnablement(flyer, fly, 'up');
    expect(guard.ok).toBe(true);
  });

  it('emissionAt walks the passthrough chain: rider on walking horse reads walk emission', async () => {
    const ride = buildMode('ride');
    const walk = buildMode('walk');
    const horse = makeStuff(() => new TestMount());
    horse.setStaticSlots([{ name: 'mount:1', accepts: 'SlottableMixin' }]);
    const rider = makeStuff(() => new Mover());
    horse.occupy(rider, 'mount:1');
    rider.setEngagedMode(ride);
    horse.setEngagedMode(walk);

    const emission = LocomotionApi.emissionAt(rider);
    expect(emission?.modeName).toBe('walk');
    expect(emission?.resolvedHostChain).toContain(rider);
  });

  it('emissionAt returns null when nothing is engaged', () => {
    const actor = makeStuff(() => new Mover());
    expect(LocomotionApi.emissionAt(actor)).toBeNull();
  });

  it('Capability exactly equals difficulty (off-by-one verification)', async () => {
    const climb = buildMode('climb');
    const mountain = makeStuff(() => new ClimbZoneLocation());
    mountain.setAxes(['*']);
    mountain.setDifficulty(3);
    const actor = makeStuff(() => new Mover());
    const { CLIMBING_CAPABILITY_PROP } = await import('../../lib/locomotion/Climbable');
    actor.setProp(CLIMBING_CAPABILITY_PROP, 3);
    ContainmentApi.move(actor, mountain);
    const guard = LocomotionApi.checkEnablement(actor, climb, 'up');
    expect(guard.ok).toBe(true);
  });
});
