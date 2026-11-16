/**
 * ⭐ What is IN something another body wears or carries is seen in the
 * light that body stands in (size and carrying finalize drive, step 15).
 *
 * W9 made a pocket a CHAMBER of its garment: the letter in a coat's inner
 * pocket has `container = the coat`. `canSee` climbed from a thing to the
 * person who holds it, and from an open container to its room — but from a
 * coat to the person wearing it, never: the light inside a coat is no light
 * at all, so the letter a search had FOUND read *"You see something"* and
 * `get letter from <them>` could not name it.
 *
 * Whether the thing is in view at all is rule 2's (`PerceptionApi`), not
 * this gate's: this is only the light it is seen by.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VisionModality } from '../VisionModality';
import Location from '../../../../lib/location/Location';
import CartesianZone from '../../location/CartesianZone';
import { AmbientLitMixin } from '../../../../lib/perception/AmbientLit';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityTagTables } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../../../../lib/perception/modalities/__tests__/test-helpers';
import { installShapes } from '../../../../lib/spatial/__tests__/size-fixture';
import { makeBody, tool, pack, carry } from '../../../../lib/slot/__tests__/carrying-fixture';
import { PerceptionApi } from '../../../../api/perception';
import { ContainmentApi } from '../../../../api/containment';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { PerceptionMixin } from '../../../../lib/perception/Perception';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { Idea } from '../../../../lib/stuff/Idea';

const vision = (): VisionModality => PerceptionApi.modalityByName('vision') as VisionModality;

class AmbientRoom extends AmbientLitMixin(Location) {}
class Viewer extends PerceptionMixin(SensorMixin(ContainerMixin(ContainableMixin(Idea)))) {}

describe('what another body bears is seen in the light they stand in', () => {
  let room: AmbientRoom;
  let viewer: Viewer;

  beforeEach(() => {
    installV1QuantityTagTables();
    installShapes();
    buildAllModalities();
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    room = makeStuff(() => new AmbientRoom());
    zone.addLocation(room, 0, 0, 0);
    room.setAmbientFlux(120);
    viewer = makeStuff(() => new Viewer());
    ContainmentApi.move(viewer, room);
  });

  afterEach(() => StuffApi.clearAll());

  function borne() {
    const { me: other } = makeBody();
    ContainmentApi.move(other, room);
    const bag = pack('satchel', 0.5, [0.3, 0.1, 0.25]);
    ContainmentApi.move(bag, room);
    carry(other, bag);
    const letter = tool('letter', 0.01, [0.2, 0.1, 0.001]);
    ContainmentApi.move(letter, bag);
    bag.setOpen(false);
    return { other, bag, letter };
  }

  it('⭐ a thing in a bag another person carries, in a LIT room, can be seen', () => {
    const { other, bag, letter } = borne();
    expect(bag.getContainer()).toBe(other);
    expect(letter.getContainer()).toBe(bag);
    expect(vision().canSee(viewer, letter)).toBe(true);
  });

  it('⭐ …and in an OPEN one too — the open bag is no light, and neither is the person carrying it', () => {
    // Finalize drive run 15, step 15: a coat with an open pocket is an open
    // container, so the walk climbed one level from the coat and landed ON
    // the person — whose inside is dark — and the found letter read
    // "You see something".
    const { bag, letter } = borne();
    bag.setOpen(true);
    expect(vision().canSee(viewer, letter)).toBe(true);
    room.setAmbientFlux(0);
    expect(vision().canSee(viewer, letter)).toBe(false);
  });

  it('⚠ and it is the ROOM\'s light — a dark room hides it', () => {
    const { letter } = borne();
    room.setAmbientFlux(0);
    expect(vision().canSee(viewer, letter)).toBe(false);
  });

  it('a thing in a shut box standing in the room is unaffected (the box\'s own dark)', () => {
    const box = pack('box', 0.5, [0.3, 0.3, 0.3]);
    ContainmentApi.move(box, room);
    const t = tool('letter', 0.01, [0.2, 0.1, 0.001]);
    ContainmentApi.move(t, box);
    box.setOpen(false);
    const before = vision().canSee(viewer, t);
    expect(before).toBe(false);
  });
});
