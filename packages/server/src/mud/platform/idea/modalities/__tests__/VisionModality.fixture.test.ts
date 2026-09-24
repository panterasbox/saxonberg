/**
 * ⭐⭐ **A fixture is seen in its HOST's light.**
 *
 * ⚠⚠ Found by driving the ground build in a BROWSER, and neither the wire
 * tier nor 11 000 unit tests could see it. In a lit room:
 *
 *     search rack   →  "You begin searching a weapons-check rack."
 *     search floor  →  "You begin searching something."
 *
 * `canSee` walked `target.getContainer()`, and a **fixture is not in
 * anybody's contents** — it hangs in `Adornable.fixtureSlots` — so a
 * `Containable` fixture answered `null` and the gate read that as *cannot be
 * seen*. `RecognitionLogic` then rendered its `obscured()` form. Every
 * sconce, sign, neon and BoundaryAnchor read as *"something"* anywhere scene
 * prose named it; the ground build made it universal by giving every room a
 * floor.
 *
 * ⚠ The card surface was unaffected, which is why this survived: `look
 * floor` rendered *"a featureless plain floor"* on its inspection card while
 * the same object read *"something"* in prose two lines earlier. Two
 * renderers, one honest and one not.
 *
 * The rule is the one already two lines below it in `canSee`: what you HOLD
 * you see in the room's light, not in the dark of your own pocket.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VisionModality } from '../VisionModality';
import CartesianLocation from '../../../../lib/location/CartesianLocation';
import CartesianZone from '../../location/CartesianZone';
import Floor from '../../../thing/Floor';
import { AmbientLitMixin } from '../../../../lib/perception/AmbientLit';
import { StuffApi } from '../../../../api/stuff';
import { MixinApi } from '../../../../api/mixin';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityTagTables } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../../../../lib/perception/modalities/__tests__/test-helpers';
import { PerceptionApi } from '../../../../api/perception';
import { ContainmentApi } from '../../../../api/containment';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { PerceptionMixin } from '../../../../lib/perception/Perception';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { Idea } from '../../../../lib/stuff/Idea';

const vision = (): VisionModality =>
  PerceptionApi.modalityByName('vision') as VisionModality;

class AmbientRoom extends AmbientLitMixin(CartesianLocation) {}
class Viewer extends PerceptionMixin(
  SensorMixin(ContainerMixin(ContainableMixin(Idea))),
) {}

describe('a fixture is seen in its host’s light', () => {
  let room: AmbientRoom;
  let viewer: Viewer;
  let floor: Floor;

  beforeEach(() => {
    installV1QuantityTagTables();
    buildAllModalities();
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    room = makeStuff(() => new AmbientRoom());
    zone.addLocation(room, 0, 0, 0);
    room.setAmbientFlux(120);          // plainly lit
    viewer = makeStuff(() => new Viewer());
    ContainmentApi.move(viewer, room);
    floor = makeStuff(() => new Floor());
    room.addFixture(floor, 'floor');
  });

  afterEach(() => StuffApi.clearAll());

  it('the premise: a fixture is NOT in the room’s contents', () => {
    // If this ever changed, the bug below would have fixed itself and this
    // whole file would be measuring nothing.
    expect(room.getContents()).not.toContain(floor);
    expect(MixinApi.isContainable(floor)).toBe(true);
    expect(floor.getContainer()).toBeNull();
    expect(floor.getAdornedTo()).toBe(room);
  });

  it('⭐ a floor in a LIT room can be seen', () => {
    expect(vision().canSee(viewer, floor)).toBe(true);
  });

  it('⚠ and it is the HOST’s light that decides — a dark room hides it', () => {
    // The fix must not make fixtures unconditionally visible: that would
    // trade a wrong "something" for a wrong "you can see it in the dark".
    room.setAmbientFlux(0);
    expect(vision().canSee(viewer, floor)).toBe(false);
  });

  it('a DETACHED fixture is still unseeable — it is nowhere', () => {
    const loose = makeStuff(() => new Floor());
    expect(loose.getAdornedTo()).toBeNull();
    expect(vision().canSee(viewer, loose)).toBe(false);
  });

  it('an ordinary CONTAINED thing is unaffected', () => {
    const thing = makeStuff(() => new Floor());
    ContainmentApi.move(thing, room);
    expect(vision().canSee(viewer, thing)).toBe(true);
  });
});
