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
  let locA: CartesianLocation;
  let locB: CartesianLocation;
  let avatar: FakeAvatar;
  let peerInA: PeerSensor;
  let peerInB: PeerSensor;
  let controller: GoController;

  beforeEach(() => {
    zone = makeStuff(() => new CartesianZone());

    locA = makeStuff(() => new CartesianLocation());
    locA.setShortDescription('Location A');
    locB = makeStuff(() => new CartesianLocation());
    locB.setShortDescription('Location B');
    zone.addLocation(locA, 0, 0, 0);
    zone.addLocation(locB, 0, 1, 0);

    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, locA);

    peerInA = makeStuff(() => new PeerSensor());
    peerInA.setName('BobA');
    ContainmentApi.move(peerInA, locA);

    peerInB = makeStuff(() => new PeerSensor());
    peerInB.setName('BobB');
    ContainmentApi.move(peerInB, locB);

    controller = new GoController();
  });

  describe('golden path (cartesian)', () => {
    it('go north moves the avatar and emits departure/arrival messages', async () => {
      const result = await controller.execute(
        { target: 'north' },
        makeContext(avatar, locA, 'go north')
      );
      expect(result.success).toBe(true);
      expect(avatar.getContainer()).toBe(locB);
      expect(result.summary).toContain('Location B');

      const depText = JSON.stringify(peerInA.received);
      expect(depText).toContain('leaves to the');
      expect(depText).toContain('north');
      const arrText = JSON.stringify(peerInB.received);
      expect(arrText).toContain('arrives from the');
      expect(arrText).toContain('south');
    });

    it('round trip with south returns avatar to location A', async () => {
      await controller.execute({ target: 'north' }, makeContext(avatar, locA, 'go north'));
      const back = await controller.execute(
        { target: 'south' },
        makeContext(avatar, locB, 'go south')
      );
      expect(back.success).toBe(true);
      expect(avatar.getContainer()).toBe(locA);
    });

    it('mover is excluded from peer broadcasts', async () => {
      await controller.execute(
        { target: 'north' },
        makeContext(avatar, locA, 'go north')
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
      const result = await controller.execute({}, makeContext(avatar, locA, ''));
      expect(result.success).toBe(false);
      expect(result.summary).toMatch(/where/i);
    });

    it("returns 'can't go that way' for unmatched directions", async () => {
      const result = await controller.execute(
        { target: 'south' },
        makeContext(avatar, locA, 'go south')
      );
      expect(result.success).toBe(false);
      expect(result.summary).toMatch(/can't go that way/i);
    });

    it('blocks traversal through a closed door', async () => {
      const door = makeStuff(() => new Door());
      door.setShortDescription('oak door');
      locA.addExit(
        makeStuff(() => new Exit({ direction: 'east', source: locA, destination: locB, door }))
      );
      const result = await controller.execute(
        { target: 'east' },
        makeContext(avatar, locA, 'go east')
      );
      expect(result.success).toBe(false);
      expect(result.summary).toMatch(/closed/i);
      expect(avatar.getContainer()).toBe(locA);
    });
  });

  describe('spherical zone with semantic exits', () => {
    it('traverses explicit semantic exit and arrival degrades to "arrives"', async () => {
      const sphZone = makeStuff(() => new SphericalZone());
      const plaza = makeStuff(() => new SphericalLocation());
      plaza.setShortDescription('Plaza');
      const office = makeStuff(() => new SphericalLocation());
      office.setShortDescription('Office');
      sphZone.addLocation(plaza);
      sphZone.addLocation(office);
      plaza.addExit(makeStuff(() => new Exit({ direction: 'office', source: plaza, destination: office })));

      const visitor = makeStuff(() => new FakeAvatar());
      visitor.setName('Carol');
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
      wardrobe.setShortDescription('wardrobe');
      ContainmentApi.move(wardrobe, locA);

      const result = await controller.execute(
        { target: 'wardrobe' },
        makeContext(avatar, locA, 'go wardrobe')
      );
      expect(result.success).toBe(true);
      expect(avatar.getContainer()).toBe(wardrobe);
    });

    it('go out from inside a vessel returns to the environment', async () => {
      const wardrobe = makeStuff(() => new ExitableVessel());
      wardrobe.setShortDescription('wardrobe');
      ContainmentApi.move(wardrobe, locA);
      ContainmentApi.move(avatar, wardrobe);

      const result = await controller.execute(
        { target: 'out' },
        makeContext(avatar, wardrobe as unknown as Location, 'go out')
      );
      expect(result.success).toBe(true);
      expect(avatar.getContainer()).toBe(locA);
    });

  });
});
