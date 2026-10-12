/**
 * PumpController — one `pump` verb behind one interface (pump build W1).
 *
 * ⭐⭐ AC 10 pinned for the first time: before this build the controller
 * had NO test, and the only assertion of `pump forge` anywhere was a wire
 * checkpoint that it was *understood*. The bellows now speaks the
 * `Pumpable` protocol, so the three refusals and both scenes are asserted
 * here word for word — they must read exactly as they did.
 *
 * And the new half: a well holding a hand pump starts a spell on the hands
 * with real watts; a well with nothing in it says so; a chair has nothing
 * to pump.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PumpController from '../PumpController';
import { ManualBuildController } from '../../crafting/ManualBuildController';
import { BurnerMixin } from '../../../../../lib/fire/Burner';
import { ThermalMixin } from '../../../../../lib/thermal/Thermal';
import Location from '../../../../../lib/stuff/Location';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../../lib/description/Named';
import { MobileMixin } from '../../../../../lib/spatial/Mobile';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../lib/stuff/Idea';
import Good from '../../../../../lib/stuff/Good';
import Well from '../../../../thing/Well';
import { StuffApi } from '../../../../../api/stuff';
import { MessageApi } from '../../../../../api/message';
import { ContainmentApi } from '../../../../../api/containment';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import type { Pumpable, PumpPrognosis, PumpResult } from '../../../../../lib/pump/Pumpable';
import { Mml } from '../../../../../api/mml';
import type { BuildStepOptions } from '../../crafting/ManualBuildController';

const FakeAvatarBase = CommandGiverMixin(
  NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea))))),
);
class FakeAvatar extends FakeAvatarBase {
  protected override handleMessage(): void {}
}

/** A furnace whose fire state the test sets directly. */
class TestForge extends BurnerMixin(ThermalMixin(Good)) {
  static _mixinName = 'TestForge';
  public fuelKg = 5;
  public override fuelRemaining(): number {
    return this.fuelKg;
  }
}

/** A pump the test controls — the protocol, not the physics (W0 owns that). */
class FakePump extends Good implements Pumpable {
  async planPump(): Promise<PumpPrognosis> {
    return {
      kind: 'plan',
      durationMs: 20_000,
      effortW: 240,
      beginSelf: Mml.compose`You take the handle and work it.`,
      token: 'stroke',
    };
  }
  async completePump(): Promise<PumpResult> {
    return { self: Mml.compose`Water comes up.`, litres: 10 };
  }
}

function ctxFor(avatar: FakeAvatar, loc: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    location: loc as never,
    commandText: 'pump',
    executionId: 't',
    commandId: 'c',
    verb: 'pump',
    command: CommandDefinition.fromYaml(
      'verbs: [pump]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}

const one = (stuff: unknown, raw: string): MqlOneResult =>
  ({ stuff, raw }) as MqlOneResult;

/** Every line the actor and the room were told, as text. */
function capture(): { self: string[]; peers: string[] } {
  const said = { self: [] as string[], peers: [] as string[] };
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b = {
      topic: () => b,
      toSelf: (m: unknown) => (said.self.push(String(m)), b),
      toPeers: (m: unknown) => (said.peers.push(String(m)), b),
      send: () => undefined,
    };
    return b as never;
  });
  return said;
}

async function pump(target: Stuff, raw: string, avatar: FakeAvatar, room: Location): Promise<CommandContext> {
  const ctx = ctxFor(avatar, room);
  await makeStuff(() => new PumpController()).execute(
    { target: one(target, raw) } as CommandModel,
    ctx,
  );
  return ctx;
}

const reasons = (ctx: CommandContext): string[] =>
  ctx
    .getNotes()
    .filter((n) => n.kind === 'controller-rejected')
    .map((n) => (n as { reason: string }).reason);

describe('PumpController — ⭐⭐ the bellows reads exactly as it did (AC 10)', () => {
  let avatar: FakeAvatar;
  let room: Location;
  let forge: TestForge;

  beforeEach(() => {
    room = makeStuff(() => new Location());
    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar as never, room as never);
    forge = makeStuff(() => new TestForge());
    forge.setShortDescription('forge');
    forge.setBellowsMultiplier(1.6);
    forge.lit = true;
    ContainmentApi.move(forge as never, room as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a furnace with no bellows declines no-bellows, word for word', async () => {
    forge.bellowsMultiplier = 1;
    const said = capture();
    const ctx = await pump(forge, 'forge', avatar, room);
    expect(reasons(ctx)).toEqual(['no-bellows']);
    expect(said.self.join('')).toMatch(/forge.* has no bellows to work\.$/);
  });

  it('a cold furnace declines not-lit, word for word', async () => {
    forge.lit = false;
    const said = capture();
    const ctx = await pump(forge, 'forge', avatar, room);
    expect(reasons(ctx)).toEqual(['not-lit']);
    expect(said.self.join('')).toMatch(
      /^You work the bellows, but .*forge.* is cold — air without fire moves nothing\.$/,
    );
  });

  it('an unfuelled furnace declines not-lit the same way', async () => {
    forge.fuelKg = 0;
    capture();
    expect(reasons(await pump(forge, 'forge', avatar, room))).toEqual(['not-lit']);
  });

  it('a lit one roars up white-hot, and again settles back', async () => {
    let said = capture();
    await pump(forge, 'forge', avatar, room);
    expect(forge.isBellowsActive()).toBe(true);
    expect(said.self.join('')).toMatch(/^You lean into the bellows, and .*forge.* roars up white-hot\.$/);
    expect(said.peers.join('')).toMatch(/works the bellows; .*forge.* roars up white-hot\.$/);
    vi.restoreAllMocks();
    said = capture();
    await pump(forge, 'forge', avatar, room);
    expect(forge.isBellowsActive()).toBe(false);
    expect(said.self.join('')).toMatch(/^You ease off the bellows, and .*forge.* settles back to its banked glow\.$/);
    expect(said.peers.join('')).toMatch(/eases off the bellows of .*forge/);
  });
});

describe('PumpController — a well, and things that are not', () => {
  let avatar: FakeAvatar;
  let room: Location;

  beforeEach(() => {
    room = makeStuff(() => new Location());
    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar as never, room as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a chair has nothing to pump', async () => {
    const chair = makeStuff(() => new Good());
    chair.setShortDescription('chair');
    capture();
    expect(reasons(await pump(chair, 'chair', avatar, room))).toEqual(['nothing-to-pump']);
  });

  it('a well with nothing set in it says so', async () => {
    const well = makeStuff(() => new Well());
    well.setShortDescription('well');
    ContainmentApi.move(well as never, room as never);
    const said = capture();
    expect(reasons(await pump(well, 'well', avatar, room))).toEqual(['no-pump']);
    expect(said.self.join('')).toMatch(/^Nothing is set in .*well.* to work\.$/);
  });

  it('⭐ a well holding a pump starts a spell on the hands with real watts', async () => {
    const well = makeStuff(() => new Well());
    ContainmentApi.move(well as never, room as never);
    const p = makeStuff(() => new FakePump());
    // The fake speaks the protocol; the well is told it holds it, so the
    // controller's HOP is what is under test (W0 tests the veto).
    vi.spyOn(well, 'pumpFitted').mockReturnValue(p);
    const engaged: BuildStepOptions[] = [];
    vi.spyOn(ManualBuildController.prototype as never, 'engageStep').mockImplementation(
      ((_ctx: CommandContext, opts: BuildStepOptions) => {
        engaged.push(opts);
      }) as never,
    );
    capture();
    await pump(well, 'well', avatar, room);
    expect(engaged).toHaveLength(1);
    expect(engaged[0]!.durationMs).toBe(20_000);
    expect(engaged[0]!.effortW).toBe(240);
  });
});
