import { describe, it, expect, beforeEach } from 'vitest';
import { GoController } from '../GoController';
import { CartesianZone } from '../../../lib/spatial/CartesianZone';
import { CartesianLocation } from '../../../lib/spatial/CartesianLocation';
import { SphericalZone } from '../../../lib/spatial/SphericalZone';
import { SphericalLocation } from '../../../lib/spatial/SphericalLocation';
import { ExitableVessel } from '../../../lib/spatial/ExitableVessel';
import { Exit } from '../../../lib/spatial/Exit';
import { Door } from '../../../lib/spatial/Door';
import { CommandGiverMixin } from '../../../lib/command/CommandGiver';
import { ContainmentApi } from '../../../api/containment';
import { MqlApi, type MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { SensorMixin } from '../../../lib/message/Sensor';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { NamedMixin } from '../../../lib/description/Named';
import { MobileMixin } from '../../../lib/spatial/Mobile';
import type { Interactive } from '../../Interactive';
import type { Location } from '../../../lib/stuff/Location';
import type {
  CommandContext,
  CommandModel,
  ModelData,
} from '../../../api/command';
import { CommandDefinition } from '../../../lib/command/CommandDefinition';

function makeModel(
  fields: ModelData = {},
  subcommand?: string
): CommandModel {
  const model: CommandModel = { ...fields };
  if (subcommand !== undefined) model.subcommand = subcommand;
  return model;
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    "<test>"
  );
}
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import { Idea } from "../../../lib/stuff/Idea";

/**
 * Resolve a target string through MQL exactly as the dispatcher
 * would and bundle the result into the {@link MqlOneResult} wrapper the
 * controller now reads from `model.target`.
 */
function resolveTarget(giver: Stuff, raw: string): MqlOneResult {
  const r = MqlApi.resolveOne(raw, {
    commandGiver: giver as Parameters<typeof MqlApi.resolveOne>[1]['commandGiver'],
    scope: 'here',
  });
  const bound: MqlOneResult = { stuff: r.stuff, raw };
  if (r.via) bound.via = r.via;
  return bound;
}

const FakeAvatarBase = CommandGiverMixin(
  NamedMixin(MobileMixin(SensorMixin(ContainableMixin(Idea))))
);
class FakeAvatar extends FakeAvatarBase {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

class PeerSensor extends NamedMixin(SensorMixin(ContainableMixin(Idea))) {
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
  verb: 'go',
  command: stubCommand('go'),
  };
}

/**
 * Resolve `raw` through MQL and run GoController as the dispatcher
 * would: build the `MqlOneResult` wrapper for `model.target` and run the
 * controller. Returns the controller's CommandResult.
 */
async function goCmd(
  controller: GoController,
  avatar: FakeAvatar,
  location: Location,
  raw: string
): Promise<ReturnType<GoController['execute']> extends Promise<infer T> ? T : never> {
  const ctx = makeContext(avatar, location, `go ${raw}`);
  const target = resolveTarget(avatar as unknown as Stuff, raw);
  return controller.execute(makeModel({ target } as ModelData), ctx);
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

    controller = makeStuff(() => new GoController());
  });

  describe('golden path (cartesian)', () => {
    it('go north moves the avatar and emits departure/arrival messages', async () => {
      const result = await goCmd(controller, avatar, locA, 'north');
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
      await goCmd(controller, avatar, locA, 'north');
      const back = await goCmd(controller, avatar, locB, 'south');
      expect(back.success).toBe(true);
      expect(avatar.getContainer()).toBe(locA);
    });

    it('mover is excluded from peer broadcasts', async () => {
      await goCmd(controller, avatar, locA, 'north');
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
      const result = await controller.execute(makeModel(), makeContext(avatar, locA, ''));
      expect(result.success).toBe(false);
      expect(result.summary).toMatch(/where/i);
    });

    it("returns \"can't go that way\" when the input doesn't resolve", async () => {
      // Post-wrapper cutover: the dispatcher lands an `MqlOneResult`
      // wrapper on `model.target` with `stuff: null` for an
      // unresolved input. Controller fires its null-stuff branch
      // and reports "can't go that way".
      const result = await goCmd(controller, avatar, locA, 'south');
      expect(result.success).toBe(false);
      expect(result.summary).toMatch(/can't go that way/i);
    });

    it('blocks traversal through a closed door', async () => {
      const door = makeStuff(() => new Door());
      door.setShortDescription('oak door');
      locA.addExit(
        makeStuff(() => new Exit({ direction: 'east', source: locA, destination: locB, door }))
      );
      const result = await goCmd(controller, avatar, locA, 'east');
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

      const result = await goCmd(controller, visitor, plaza, 'office');
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

      const result = await goCmd(controller, avatar, locA, 'wardrobe');
      expect(result.success).toBe(true);
      expect(avatar.getContainer()).toBe(wardrobe);
    });

    it('go out from inside a vessel returns to the environment', async () => {
      const wardrobe = makeStuff(() => new ExitableVessel());
      wardrobe.setShortDescription('wardrobe');
      ContainmentApi.move(wardrobe, locA);
      ContainmentApi.move(avatar, wardrobe);

      const result = await goCmd(
        controller,
        avatar,
        wardrobe as unknown as Location,
        'out'
      );
      expect(result.success).toBe(true);
      expect(avatar.getContainer()).toBe(locA);
    });

  });
});
