/**
 * TallyController — appends one mark to a CrossingLog. The edge matrix
 * from crossing-log.md: lid open + wound → timed mark; lid shut or no
 * timepiece → untimed tick. Stores when, never who.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import TallyController from '../TallyController';
import CrossingLog from '../../../thing/CrossingLog';
import Watch from '../../../thing/Watch';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import { CommandGiverMixin } from '@saxonberg/server/mud/lib/command/CommandGiver';
import { SensorMixin } from '@saxonberg/server/mud/lib/message/Sensor';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { MobileMixin } from '@saxonberg/server/mud/lib/spatial/Mobile';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';

const FakeAvatarBase = CommandGiverMixin(
  NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea))))),
);
class FakeAvatar extends FakeAvatarBase {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

function ctxFor(avatar: FakeAvatar, loc: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    location: loc as never,
    commandText: 'tally',
    executionId: 't',
    commandId: 'c',
    verb: 'tally',
    command: CommandDefinition.fromYaml(
      'verbs: [tally]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}

function one(stuff: unknown, raw: string): MqlOneResult {
  return { stuff, raw } as MqlOneResult;
}

describe('TallyController', () => {
  let avatar: FakeAvatar;
  let room: Location;
  let log: CrossingLog;

  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
    room = makeStuff(() => new Location());
    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar as never, room as never);
    log = makeStuff(() => new CrossingLog());
    ContainmentApi.move(log as never, room as never);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
  });

  async function tally(): Promise<void> {
    await makeStuff(() => new TallyController()).execute(
      { target: one(log, 'log') } as CommandModel,
      ctxFor(avatar, room),
    );
  }

  it('stamps the time when the actor holds an open, readable watch', async () => {
    const w = makeStuff(() => new Watch());
    w.open();
    w.setTime(600); // 10:00
    ContainmentApi.move(w as never, avatar as never);

    await tally();

    expect(log.getMarks()).toEqual([600]);
  });

  it('writes an untimed tick when the watch lid is shut', async () => {
    const w = makeStuff(() => new Watch());
    // default: lid shut → currentReading() null
    ContainmentApi.move(w as never, avatar as never);

    await tally();

    expect(log.getMarks()).toEqual([null]);
  });

  it('writes an untimed tick when the actor has no timepiece', async () => {
    await tally();
    expect(log.getMarks()).toEqual([null]);
  });

  it('rejects a non-log target', async () => {
    const rock = makeStuff(() => new Watch());
    const ctx = ctxFor(avatar, room);
    await makeStuff(() => new TallyController()).execute(
      { target: one(rock, 'rock') } as CommandModel,
      ctx,
    );
    expect(log.getMarks().length).toBe(0);
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
  });
});
