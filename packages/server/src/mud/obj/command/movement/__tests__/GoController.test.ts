import { describe, it, expect, beforeEach } from 'vitest';
import GoController from '../GoController';
import CartesianZone from '../../../location/CartesianZone';
import CartesianLocation from '../../../../lib/location/CartesianLocation';
import SphericalZone from '../../../location/SphericalZone';
import SphericalLocation from '../../../location/SphericalLocation';
import ExitableVessel from '../../../../lib/boundary/ExitableVessel';
import Exit from '../../../../lib/boundary/Exit';
import Door from '../../../Door';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { ContainmentApi } from '../../../../api/containment';
import { MqlApi, type MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../lib/description/Named';
import { MobileMixin } from '../../../../lib/spatial/Mobile';
import type Interactive from '../../../Interactive';
import type Location from '../../../../lib/stuff/Location';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type ModelData,
} from '../../../../api/command';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';

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
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import { Idea } from "../../../../lib/stuff/Idea";
import { buildMode } from '../../../../lib/locomotion/__tests__/test-helpers';

/**
 * Resolve a target string through MQL exactly as the dispatcher
 * would and bundle the result into the {@link MqlOneResult} wrapper the
 * controller now reads from `model.target`.
 */
function resolveTarget(giver: Stuff, raw: string): MqlOneResult {
  const r = MqlApi.resolveOne(raw, {
    commandGiver: giver as Parameters<typeof MqlApi.resolveOne>[1]['commandGiver'],
    scope: 'reachable',
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
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText,
    executionId: 'test-execution',
    commandId: 'test-command-id',
    verb: 'go',
    command: stubCommand('go'),
  });
}

/**
 * Resolve `raw` through MQL and run GoController as the dispatcher
 * would: build the `MqlOneResult` wrapper for `model.target` and run the
 * controller. Returns void; tests assert on world state and on
 * frames captured by `avatar.received`.
 */
async function goCmd(
  controller: GoController,
  avatar: FakeAvatar,
  location: Location,
  raw: string
): Promise<void> {
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

  beforeEach(async () => {
    // GoController now extends LocomotionControllerBase, which resolves
    // the walk LocomotionMode singleton via LocomotionApi.modeOfOrThrow.
    // Seed the singleton up-front (in production the SeederManager does this).
    buildMode('walk');

    zone = makeStuff(() => new CartesianZone());

    locA = makeStuff(() => new CartesianLocation());
    locA.setShortDescription('Location A');
    locB = makeStuff(() => new CartesianLocation());
    locB.setShortDescription('Location B');
    zone.addLocation(locA, 0, 0, 0);
    zone.addLocation(locB, 0, 1, 0);
    // Exits are explicit (no grid-derivation): declare both sides.
    await locA.addExit(
      makeStuff(() => new Exit({ direction: 'north', source: locA, destination: locB })),
    );
    await locB.addExit(
      makeStuff(() => new Exit({ direction: 'south', source: locB, destination: locA })),
    );

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
      await goCmd(controller, avatar, locA, 'north');
      expect(avatar.getContainer()).toBe(locB);

      const depText = JSON.stringify(peerInA.received);
      expect(depText).toContain('leaves to the');
      expect(depText).toContain('north');
      const arrText = JSON.stringify(peerInB.received);
      expect(arrText).toContain('arrives from the');
      expect(arrText).toContain('south');
    });

    it('round trip with south returns avatar to location A', async () => {
      await goCmd(controller, avatar, locA, 'north');
      await goCmd(controller, avatar, locB, 'south');
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
          (f as { topic: string }).topic.startsWith('act.')
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
      const ctx = makeContext(avatar, locA, '');
      await controller.execute(makeModel(), ctx);
      // Post-locomotion: rejection prose is mode-templated and lands
      // through the exitMode gate. The summary field is gone — read
      // it off the actor's Scene frames + the ctx note.
      const shellFrames = avatar.received.filter((f) =>
        ((f as { topic?: string })?.topic ?? '').startsWith(
          'shell.result',
        ),
      );
      expect(
        shellFrames.some((f) =>
          ((f as { body?: string }).body ?? '').match(/can't walk that way/i),
        ),
      ).toBe(true);
      expect(ctx.getNotes()).toContainEqual(
        expect.objectContaining({
          kind: 'locomotion-gate-failed',
          gate: 'exit-mode',
        }),
      );
    });

    it("returns rejection prose when the input doesn't resolve", async () => {
      // Post-wrapper cutover: the dispatcher lands an `MqlOneResult`
      // wrapper on `model.target` with `stuff: null` for an
      // unresolved input. LocomotionControllerBase's exitMode gate
      // fires with verb-templated prose.
      await goCmd(controller, avatar, locA, 'south');
      const shellFrames = avatar.received.filter((f) =>
        ((f as { topic?: string })?.topic ?? '').startsWith(
          'shell.result',
        ),
      );
      expect(
        shellFrames.some((f) =>
          ((f as { body?: string }).body ?? '').match(/can't walk that way/i),
        ),
      ).toBe(true);
    });

    it('blocks traversal through a closed door', async () => {
      const door = makeStuff(() => new Door());
      door.setShortDescription('oak door');
      await locA.addExit(
        makeStuff(() => new Exit({ direction: 'east', source: locA, destination: locB, door }))
      );
      await goCmd(controller, avatar, locA, 'east');
      const shellFrames = avatar.received.filter((f) =>
        ((f as { topic?: string })?.topic ?? '').startsWith(
          'shell.result',
        ),
      );
      expect(
        shellFrames.some((f) =>
          ((f as { body?: string }).body ?? '').match(/closed/i),
        ),
      ).toBe(true);
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
      await plaza.addExit(makeStuff(() => new Exit({ direction: 'office', source: plaza, destination: office })));

      const visitor = makeStuff(() => new FakeAvatar());
      visitor.setName('Carol');
      ContainmentApi.move(visitor, plaza);

      const spherePeer = makeStuff(() => new PeerSensor());
      ContainmentApi.move(spherePeer, office);

      await goCmd(controller, visitor, plaza, 'office');
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

      await goCmd(controller, avatar, locA, 'wardrobe');
      expect(avatar.getContainer()).toBe(wardrobe);
    });

    it('go out from inside a vessel returns to the environment', async () => {
      const wardrobe = makeStuff(() => new ExitableVessel());
      wardrobe.setShortDescription('wardrobe');
      ContainmentApi.move(wardrobe, locA);
      ContainmentApi.move(avatar, wardrobe);

      await goCmd(
        controller,
        avatar,
        wardrobe as unknown as Location,
        'out'
      );
      expect(avatar.getContainer()).toBe(locA);
    });

  });
});
