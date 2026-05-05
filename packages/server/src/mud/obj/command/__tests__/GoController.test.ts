import { describe, it, expect, beforeEach } from 'vitest';
import { GoController } from '../GoController';
import { CartesianZone } from '../../../lib/spatial/CartesianZone';
import { CartesianLocation } from '../../../lib/spatial/CartesianLocation';
import { SphericalZone } from '../../../lib/spatial/SphericalZone';
import { SphericalLocation } from '../../../lib/spatial/SphericalLocation';
import { ExitableVessel } from '../../../lib/spatial/ExitableVessel';
import { Exit } from '../../../lib/spatial/Exit';
import { Door } from '../../../lib/spatial/Door';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { Stuff } from '../../../lib/stuff/Stuff';
import { SensorMixin } from '../../../lib/message/Sensor';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { NamedMixin } from '../../../lib/description/Named';
import { MobileMixin } from '../../../lib/spatial/Mobile';
import type { Interactive } from '../../Interactive';
import type { Location } from '../../../lib/stuff/Location';
import type { CommandContext } from '../../../api/command';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

const FakeAvatarBase = NamedMixin(MobileMixin(SensorMixin(ContainableMixin(Stuff))));
class FakeAvatar extends FakeAvatarBase {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

class PeerSensor extends NamedMixin(SensorMixin(ContainableMixin(Stuff))) {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

function makeContext(
  avatar: FakeAvatar,
  location: Location,
  commandText: string
): CommandContext {
  return {
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText,
    executionId: 'test-execution',
    commandId: 'test-command-id',
  };
}

describe('GoController', () => {
  let zone: CartesianZone;
  let roomA: CartesianLocation;
  let roomB: CartesianLocation;
  let avatar: FakeAvatar;
  let peerInA: PeerSensor;
  let peerInB: PeerSensor;
  let controller: GoController;

  beforeEach(() => {
    zone = makeStuff(() => new CartesianZone());

    roomA = makeStuff(() => new CartesianLocation());
    roomA.shortDescription = 'Room A';
    roomB = makeStuff(() => new CartesianLocation());
    roomB.shortDescription = 'Room B';
    zone.addRoom(roomA, 0, 0, 0);
    zone.addRoom(roomB, 0, 1, 0);

    avatar = makeStuff(() => new FakeAvatar());
    avatar.name = 'Alice';
    ContainmentApi.move(avatar, roomA);

    peerInA = makeStuff(() => new PeerSensor());
    peerInA.name = 'BobA';
    ContainmentApi.move(peerInA, roomA);

    peerInB = makeStuff(() => new PeerSensor());
    peerInB.name = 'BobB';
    ContainmentApi.move(peerInB, roomB);

    controller = new GoController();
  });

  describe('golden path (cartesian)', () => {
    it('go north moves the avatar and emits departure/arrival messages', async () => {
      const result = await controller.execute(
        { target: 'north' },
        makeContext(avatar, roomA, 'go north')
      );
      expect(result.success).toBe(true);
      expect(avatar.getContainer()).toBe(roomB);
      expect(result.summary).toContain('Room B');

      const depText = JSON.stringify(peerInA.received);
      expect(depText).toContain('leaves to the');
      expect(depText).toContain('north');
      const arrText = JSON.stringify(peerInB.received);
      expect(arrText).toContain('arrives from the');
      expect(arrText).toContain('south');
    });

    it('round trip with south returns avatar to room A', async () => {
      await controller.execute({ target: 'north' }, makeContext(avatar, roomA, 'go north'));
      const back = await controller.execute(
        { target: 'south' },
        makeContext(avatar, roomB, 'go south')
      );
      expect(back.success).toBe(true);
      expect(avatar.getContainer()).toBe(roomA);
    });

    it('mover is excluded from peer broadcasts', async () => {
      await controller.execute(
        { target: 'north' },
        makeContext(avatar, roomA, 'go north')
      );
      // The mover sees its own toSelf frames ("You leave...", "You
      // arrive..."), but never the peer-broadcast frames that name
      // the mover ("<name>Alice</name> leaves..."). Auto-emit
      // command-outcome frames also land on the mover; filter to
      // movement frames only.
      const movementFrames = avatar.received.filter(
        (f) =>
          typeof (f as { topic?: unknown })?.topic === 'string' &&
          (f as { topic: string }).topic.startsWith('world.narration.')
      );
      const peerLikeFrames = movementFrames.filter((f) =>
        ((f as { body: string }).body ?? '').includes('Alice')
      );
      expect(peerLikeFrames).toEqual([]);
      // Mover does receive its own self-perspective frames.
      const selfFrames = movementFrames.filter((f) =>
        ((f as { body: string }).body ?? '').includes('You ')
      );
      expect(selfFrames.length).toBeGreaterThan(0);
    });
  });

  describe('guards and errors', () => {
    it('returns an error when no direction is given', async () => {
      const result = await controller.execute({}, makeContext(avatar, roomA, ''));
      expect(result.success).toBe(false);
      expect(result.summary).toMatch(/where/i);
    });

    it("returns 'can't go that way' for unmatched directions", async () => {
      const result = await controller.execute(
        { target: 'south' },
        makeContext(avatar, roomA, 'go south')
      );
      expect(result.success).toBe(false);
      expect(result.summary).toMatch(/can't go that way/i);
    });

    it('blocks traversal through a closed door', async () => {
      const door = makeStuff(() => new Door());
      door.shortDescription = 'oak door';
      roomA.addExit(
        makeStuff(() => new Exit({ direction: 'east', source: roomA, destination: roomB, door }))
      );
      const result = await controller.execute(
        { target: 'east' },
        makeContext(avatar, roomA, 'go east')
      );
      expect(result.success).toBe(false);
      expect(result.summary).toMatch(/closed/i);
      expect(avatar.getContainer()).toBe(roomA);
    });
  });

  describe('spherical zone with semantic exits', () => {
    it('traverses explicit semantic exit and arrival degrades to "arrives"', async () => {
      const sphZone = makeStuff(() => new SphericalZone());
      const plaza = makeStuff(() => new SphericalLocation());
      plaza.shortDescription = 'Plaza';
      const office = makeStuff(() => new SphericalLocation());
      office.shortDescription = 'Office';
      sphZone.addRoom(plaza);
      sphZone.addRoom(office);
      plaza.addExit(makeStuff(() => new Exit({ direction: 'office', source: plaza, destination: office })));

      const visitor = makeStuff(() => new FakeAvatar());
      visitor.name = 'Carol';
      ContainmentApi.move(visitor, plaza);

      const spherePeer = makeStuff(() => new PeerSensor());
      ContainmentApi.move(spherePeer, office);

      const result = await controller.execute(
        { target: 'office' },
        makeContext(visitor, plaza, 'go office')
      );
      expect(result.success).toBe(true);
      expect(visitor.getContainer()).toBe(office);

      const arrText = JSON.stringify(spherePeer.received);
      expect(arrText).toContain('arrives');
      expect(arrText).not.toContain('from the');
    });
  });

  describe('vessel entry and exit', () => {
    it('go <vessel-keyword> enters a sibling ExitableVessel', async () => {
      const wardrobe = makeStuff(() => new ExitableVessel());
      wardrobe.shortDescription = 'wardrobe';
      ContainmentApi.move(wardrobe, roomA);

      const result = await controller.execute(
        { target: 'wardrobe' },
        makeContext(avatar, roomA, 'go wardrobe')
      );
      expect(result.success).toBe(true);
      expect(avatar.getContainer()).toBe(wardrobe);
    });

    it('go out from inside a vessel returns to the environment', async () => {
      const wardrobe = makeStuff(() => new ExitableVessel());
      wardrobe.shortDescription = 'wardrobe';
      ContainmentApi.move(wardrobe, roomA);
      ContainmentApi.move(avatar, wardrobe);

      const result = await controller.execute(
        { target: 'out' },
        makeContext(avatar, wardrobe as unknown as Location, 'go out')
      );
      expect(result.success).toBe(true);
      expect(avatar.getContainer()).toBe(roomA);
    });

  });
});
