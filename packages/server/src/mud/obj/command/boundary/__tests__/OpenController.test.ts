import { describe, it, expect, beforeEach } from 'vitest';
import OpenController from '../OpenController';
import CloseController from '../CloseController';
import GoController from '../../movement/GoController';
import CartesianZone from '../../../location/CartesianZone';
import CartesianLocation from '../../../../lib/location/CartesianLocation';
import Door from '../../../Door';
import { ContainmentApi } from '../../../../api/containment';
import { MqlApi, type MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
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
import { buildMode } from '../../../../lib/locomotion/__tests__/test-helpers';

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

const FakeAvatarBase = CommandGiverMixin(
  NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea)))))
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
    verb: 'open',
    command: stubCommand('open'),
  });
}

/**
 * Resolve a target string against `scope` and bundle the result
 * into the {@link MqlOneResult} wrapper the controller now reads from
 * `model.target`.
 */
function buildMqlOneResult(giver: Stuff, raw: string, scope: string): MqlOneResult {
  const r = MqlApi.resolveOne(raw, {
    commandGiver: giver as Parameters<typeof MqlApi.resolveOne>[1]['commandGiver'],
    scope,
  });
  const bound: MqlOneResult = { stuff: r.stuff, raw };
  if (r.via) bound.via = r.via;
  return bound;
}

async function openCmd(
  controller: OpenController,
  avatar: FakeAvatar,
  location: Location,
  raw: string
): Promise<void> {
  const ctx = makeContext(avatar, location, `open ${raw}`);
  const target = buildMqlOneResult(avatar as unknown as Stuff, raw, 'inventory, here');
  return controller.execute(makeModel({ target } as ModelData), ctx);
}

async function closeCmd(
  controller: CloseController,
  avatar: FakeAvatar,
  location: Location,
  raw: string
): Promise<void> {
  const ctx = makeContext(avatar, location, `close ${raw}`);
  const target = buildMqlOneResult(avatar as unknown as Stuff, raw, 'inventory, here');
  return controller.execute(makeModel({ target } as ModelData), ctx);
}

async function goCmd(
  controller: GoController,
  avatar: FakeAvatar,
  location: Location,
  raw: string
): Promise<void> {
  const ctx = makeContext(avatar, location, `go ${raw}`);
  const target = buildMqlOneResult(avatar as unknown as Stuff, raw, 'here');
  return controller.execute(makeModel({ target } as ModelData), ctx);
}

describe('OpenController / CloseController / doors integration', () => {
  let zone: CartesianZone;
  let locA: CartesianLocation;
  let locB: CartesianLocation;
  let avatar: FakeAvatar;
  let peerInA: PeerSensor;
  let door: Door;

  beforeEach(async () => {
    buildMode('walk');
    zone = makeStuff(() => new CartesianZone());
    locA = makeStuff(() => new CartesianLocation());
    locA.setShortDescription('Location A');
    locB = makeStuff(() => new CartesianLocation());
    locB.setShortDescription('Location B');
    zone.addLocation(locA, 0, 0, 0);
    zone.addLocation(locB, 0, 1, 0);

    door = makeStuff(() => new Door());
    door.setShortDescription('heavy oak door');
    door.setKeywords(['oak']);
    await locA.addBidirectionalExit(locB, 'north', { door });

    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, locA);

    peerInA = makeStuff(() => new PeerSensor());
    peerInA.setName('Bob');
    ContainmentApi.move(peerInA, locA);
  });

  it('go north fails while door is closed', async () => {
    const go = makeStuff(() => new GoController());
    await goCmd(go, avatar, locA, 'north');
    // Locomotion rejection prose now arrives via Scene.send at
    // `shell.result` instead of result.summary.
    const shellFrames = avatar.received.filter((f) =>
      ((f as { topic?: string })?.topic ?? '').startsWith(
        'shell.result',
      ),
    );
    const bodies = shellFrames.map((f) => (f as { body?: string }).body ?? '');
    expect(bodies.some((b) => /closed/i.test(b))).toBe(true);
    // Sentence-start: the door presentation is capitalized ("Heavy oak
    // door is closed."), no re-prefixed article.
    expect(bodies.some((b) => /heavy oak door/i.test(b))).toBe(true);
  });

  it('open <keyword> resolves via MQL and opens the door', async () => {
    const open = makeStuff(() => new OpenController());
    await openCmd(open, avatar, locA, 'oak');
    expect(door.isOpen()).toBe(true);

    const peerText = JSON.stringify(peerInA.received);
    expect(peerText).toContain('Alice');
    expect(peerText).toContain('opens');
    expect(peerText).toContain('heavy oak door');

    // Mover gets a self frame ("You open ..."), not the peer broadcast
    // (which names the mover).
    const moverFrames = avatar.received as Array<{ body?: string }>;
    expect(moverFrames.length).toBe(1);
    expect(moverFrames[0]!.body).toContain('You open');
  });

  it('already-open door returns a friendly error', async () => {
    door.open();
    const open = makeStuff(() => new OpenController());
    avatar.received.length = 0;
    await openCmd(open, avatar, locA, 'oak');
    const bodies = avatar.received
      .filter((f) => ((f as { topic?: string })?.topic ?? '') !== '')
      .map((f) => (f as { body?: string }).body ?? '');
    expect(bodies.some((b) => /already open/i.test(b))).toBe(true);
  });

  it('no sealable matching the name: clear error', async () => {
    const open = makeStuff(() => new OpenController());
    avatar.received.length = 0;
    await openCmd(open, avatar, locA, 'bathtub');
    const bodies = avatar.received
      .filter((f) => ((f as { topic?: string })?.topic ?? '') !== '')
      .map((f) => (f as { body?: string }).body ?? '');
    expect(bodies.some((b) => /don't see/i.test(b))).toBe(true);
  });

  it('go north succeeds after opening; close from destination closes same door', async () => {
    await openCmd(makeStuff(() => new OpenController()), avatar, locA, 'oak');
    await goCmd(
      makeStuff(() => new GoController()),
      avatar,
      locA,
      'north'
    );
    expect(avatar.getContainer()).toBe(locB);

    await closeCmd(
      makeStuff(() => new CloseController()),
      avatar,
      locB,
      'oak'
    );
    expect(door.isOpen()).toBe(false);

    // Both sides share the same Door instance — going south is now blocked.
    avatar.received.length = 0;
    await goCmd(
      makeStuff(() => new GoController()),
      avatar,
      locB,
      'south'
    );
    const shellFrames = avatar.received.filter((f) =>
      ((f as { topic?: string })?.topic ?? '').startsWith(
        'shell.result',
      ),
    );
    const bodies = shellFrames.map((f) => (f as { body?: string }).body ?? '');
    expect(bodies.some((b) => /closed|way/i.test(b))).toBe(true);
  });

  it('already-closed door on close returns friendly error', async () => {
    const close = makeStuff(() => new CloseController());
    avatar.received.length = 0;
    await closeCmd(close, avatar, locA, 'oak');
    const bodies = avatar.received
      .filter((f) => ((f as { topic?: string })?.topic ?? '') !== '')
      .map((f) => (f as { body?: string }).body ?? '');
    expect(bodies.some((b) => /already closed/i.test(b))).toBe(true);
  });

  it('open north resolves via direction and opens the exit door', async () => {
    // The direction match lands on the location with via.exit; the
    // controller fetches the door from via.exit.getDoor().
    const open = makeStuff(() => new OpenController());
    await openCmd(open, avatar, locA, 'north');
    expect(door.isOpen()).toBe(true);
  });

  it('close north resolves via direction and closes the exit door', async () => {
    door.open();
    const close = makeStuff(() => new CloseController());
    await closeCmd(close, avatar, locA, 'north');
    expect(door.isOpen()).toBe(false);
  });
});
