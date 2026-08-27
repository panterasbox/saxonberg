import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ExitableVessel from '../ExitableVessel';
import Door from '../../../platform/thing/Door';
import CartesianLocation from '../../location/CartesianLocation';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import { VisionModality } from '../../../platform/idea/modalities/VisionModality';
import { buildAllModalities } from '../../perception/modalities/__tests__/test-helpers';
import { Light } from '../../perception/Light';
import { AmbientLitMixin } from '../../perception/AmbientLit';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

class AmbientCartesianLocation extends AmbientLitMixin(CartesianLocation) {}

describe('ExitableVessel — door boundary on (vessel, environment)', () => {
  beforeEach(() => {
    buildAllModalities();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('a wardrobe with an open door leaks ambient room light into its interior', () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    room.setAmbientFlux(60);

    const wardrobe = makeStuff(() => new ExitableVessel());
    wardrobe.setShortDescription('oak wardrobe');
    const door = makeStuff(() => new Door());
    door.setShortDescription('wardrobe door');
    door.open();
    wardrobe.setDoor(door);

    ContainmentApi.move(wardrobe, room);

    // The (vessel, env) anchor pair is now wired on `wardrobe` and
    // `room`. With the door open and base transmissivity 1, the
    // wardrobe interior reads the room's ambient.
    expect(VisionModality.lightAt(wardrobe).intensity.rawValue()).toBe(60);
  });

  it('a wardrobe with a closed door reads ZERO inside even when the room is bright', () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    room.setAmbientFlux(60);

    const wardrobe = makeStuff(() => new ExitableVessel());
    wardrobe.setShortDescription('oak wardrobe');
    const door = makeStuff(() => new Door());
    door.setShortDescription('wardrobe door');
    // door starts closed
    wardrobe.setDoor(door);

    ContainmentApi.move(wardrobe, room);

    expect(VisionModality.lightAt(wardrobe)).toBe(Light.ZERO);

    door.open();
    expect(VisionModality.lightAt(wardrobe).intensity.rawValue()).toBe(60);
  });

  it('moving the wardrobe migrates the door anchor to the new environment', () => {
    // Two rooms in DIFFERENT cartesian zones so cardinal-derived
    // exits don't bleed light between them — we want to read each
    // wardrobe-interior contribution independently.
    const zoneA = makeStuff(() => new CartesianZone());
    const zoneB = makeStuff(() => new CartesianZone());
    const dim = makeStuff(() => new CartesianLocation());
    const bright = makeStuff(() => new AmbientCartesianLocation());
    zoneA.addLocation(dim, 0, 0, 0);
    zoneB.addLocation(bright, 0, 0, 0);
    bright.setAmbientFlux(80);

    const wardrobe = makeStuff(() => new ExitableVessel());
    wardrobe.setShortDescription('oak wardrobe');
    const door = makeStuff(() => new Door());
    door.setShortDescription('wardrobe door');
    door.open();
    wardrobe.setDoor(door);

    ContainmentApi.move(wardrobe, dim);
    expect(VisionModality.lightAt(wardrobe)).toBe(Light.ZERO);

    ContainmentApi.move(wardrobe, bright);
    expect(VisionModality.lightAt(wardrobe).intensity.rawValue()).toBe(80);
  });

  it('setDoor swaps the boundary anchor from old door to new', () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    room.setAmbientFlux(60);

    const wardrobe = makeStuff(() => new ExitableVessel());
    wardrobe.setShortDescription('oak wardrobe');
    const oldDoor = makeStuff(() => new Door());
    oldDoor.setShortDescription('old door');
    oldDoor.open();
    wardrobe.setDoor(oldDoor);

    ContainmentApi.move(wardrobe, room);
    expect(VisionModality.lightAt(wardrobe).intensity.rawValue()).toBe(60);

    // Swap to a closed door — interior should go dark.
    const newDoor = makeStuff(() => new Door());
    newDoor.setShortDescription('new door');
    // newDoor closed
    wardrobe.setDoor(newDoor);

    expect(VisionModality.lightAt(wardrobe)).toBe(Light.ZERO);
    // Old door is no longer wired to the wardrobe boundary.
    expect(oldDoor.getAnchorA()).toBeNull();
    expect(oldDoor.getAnchorB()).toBeNull();
    // New door owns the boundary.
    expect(newDoor.getAnchorA()).not.toBeNull();
    expect(newDoor.getAnchorB()).not.toBeNull();
  });

  it('the synthesized "out" exit still uses the door as a Door (attachedTo intact)', () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    const wardrobe = makeStuff(() => new ExitableVessel());
    wardrobe.setShortDescription('oak wardrobe');
    const door = makeStuff(() => new Door());
    door.setShortDescription('wardrobe door');
    wardrobe.setDoor(door);
    ContainmentApi.move(wardrobe, room);

    // 'out' synthesizes; the door's attachedTo should pick up the
    // synth exit (in addition to whatever boundary-side wiring we
    // installed for the (vessel, room) pair).
    const out = wardrobe.getExit('out');
    expect(out).not.toBeUndefined();
    expect(door.hasAttached(out!)).toBe(true);
    // Boundary anchors are also live.
    expect(door.getAnchorA()).not.toBeNull();
    expect(door.getAnchorB()).not.toBeNull();
  });
});
