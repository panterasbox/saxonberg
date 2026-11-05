/**
 * BailController — ⭐⭐ `bail` is the bucket over ANY lift source (harbors
 * review 1; pump.md family A). The controller reads the source (how deep;
 * what it lifts into) and the tool, and nothing else: a spell is the
 * handling plus the rope down and back, a bucketful is the tool's, and what
 * the source says is its own (`bucketRefusal`, `bucketLanded`).
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BailController from '../BailController';
import { EngagedActController } from '../../../../../lib/command/EngagedActController';
import Place from '../../../../../lib/stuff/Place';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../../lib/description/Named';
import { MobileMixin } from '../../../../../lib/spatial/Mobile';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../lib/stuff/Idea';
import Good from '../../../../../lib/stuff/Good';
import { StuffApi } from '../../../../../api/stuff';
import { MessageApi } from '../../../../../api/message';
import { ContainmentApi } from '../../../../../api/containment';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import { CommandApi, type CommandContext, type CommandModel } from '../../../../../api/command';
import { Mml } from '../../../../../api/mml';
import type { MqlOneResult } from '../../../../../api/mql';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import type { Container } from '../../../../../lib/spatial/Container';
import type { LiftSource, BucketLanding } from '../../../../../lib/pump/Pumpable';

const FakeAvatarBase = CommandGiverMixin(NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea))))));
class FakeAvatar extends FakeAvatarBase {
  protected override handleMessage(): void {}
}

/** A lift source the test controls: water `depthM` down, `standingL` of it. */
class TestSource extends Good implements LiftSource {
  public depthM = 0.4;
  public standingL = 100;
  public lifted: number[] = [];
  public landed: BucketLanding[] = [];
  public refuse: string | null = null;
  standingDepthM(): number { return this.depthM; }
  async standingMaterial(): Promise<string | null> { return '/stuff/idea/material/bulk/water'; }
  async standingAvailableL(): Promise<number> { return this.standingL; }
  receivableL(): number { return Infinity; }
  async liftInto(litres: number): Promise<number> {
    const moved = Math.min(litres, this.standingL);
    this.standingL -= moved;
    this.lifted.push(moved);
    return moved;
  }
  liftScope(): (Stuff & Container) | null { return null; }
  async bucketRefusal(): Promise<{ reason: string; line: Mml } | null> {
    return this.refuse === null ? null : { reason: this.refuse, line: Mml.compose`No.` };
  }
  async bucketLanded(_by: Stuff, landing: BucketLanding): Promise<Mml | null> {
    this.landed.push(landing);
    return Mml.compose`Over the side.`;
  }
}

const one = (stuff: unknown, raw: string): MqlOneResult => ({ stuff, raw }) as MqlOneResult;

let avatar: FakeAvatar;
let room: Place;
let said: string[];
let engaged: { durationMs: number; cost: number; onComplete(): void }[];

function ctx(): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    location: room as never,
    commandText: 'bail',
    executionId: 't',
    commandId: 'c',
    verb: 'bail',
    command: CommandDefinition.fromYaml('verbs: [bail]\ncontroller: NoopController\ndescription: stub\n', '<test>'),
  });
}

async function bail(model: Record<string, unknown>): Promise<CommandContext> {
  const c = ctx();
  await makeStuff(() => new BailController()).execute(model as CommandModel, c);
  return c;
}

const reasons = (c: CommandContext): string[] =>
  c.getNotes().filter((n) => n.kind === 'controller-rejected').map((n) => (n as { reason: string }).reason);

beforeEach(() => {
  room = makeStuff(() => new Place());
  avatar = makeStuff(() => new FakeAvatar());
  ContainmentApi.move(avatar as never, room as never);
  said = [];
  engaged = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b = { topic: () => b, toSelf: (m: unknown) => (said.push(String(m)), b), toPeers: () => b, send: () => undefined };
    return b as never;
  });
  vi.spyOn(EngagedActController.prototype as never, 'engageAct').mockImplementation(((_c: unknown, opts: never) => {
    engaged.push(opts);
  }) as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('BailController — the bucket over any lift source', () => {
  it('⭐ a spell is the handling plus the rope: 20 s at a boat\'s bilge, 30 s down a 25 m bore', async () => {
    const shallow = makeStuff(() => new TestSource());
    await bail({ target: one(shallow, 'boat') });
    const deep = makeStuff(() => new TestSource());
    deep.depthM = 25;
    await bail({ target: one(deep, 'bore'), tool: one(makeStuff(() => new Good()), 'bailer') });
    expect(engaged.map((e) => e.durationMs)).toEqual([20_160, 30_000]);
    expect(engaged.map((e) => e.cost)).toEqual([4, 9]);
  });

  it('⭐⭐ a bucketful is the tool\'s — 10 L by hand, 12 with a bailer — lifted through the source, in its own words', async () => {
    const src = makeStuff(() => new TestSource());
    await bail({ target: one(src, 'boat') });
    await bail({ target: one(src, 'boat'), tool: one(makeStuff(() => new Good()), 'bailer') });
    for (const e of engaged) e.onComplete();
    await new Promise((r) => setTimeout(r, 0));
    expect(src.lifted).toEqual([10, 12]);
    expect(src.landed.map((l) => l.litres)).toEqual([10, 12]);
    expect(said.join(' ')).toMatch(/Over the side/);
  });

  it('the source\'s refusal is its own; something that is no lift source has nothing to bail', async () => {
    const src = makeStuff(() => new TestSource());
    src.refuse = 'no-derrick';
    expect(reasons(await bail({ target: one(src, 'bore') }))).toEqual(['no-derrick']);
    expect(reasons(await bail({ target: one(makeStuff(() => new Good()), 'chair') }))).toEqual(['nothing-to-bail']);
    expect(engaged).toHaveLength(0);
  });

  it('⭐ unnamed, it bails what you sit in — a boat is a lift source you are inside', async () => {
    const boat = makeStuff(() => new TestSource());
    vi.spyOn(avatar, 'getContainer').mockReturnValue(boat as never);
    await bail({});
    expect(engaged).toHaveLength(1);
    vi.restoreAllMocks();
  });
});
