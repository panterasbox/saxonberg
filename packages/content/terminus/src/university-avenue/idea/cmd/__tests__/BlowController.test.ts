/**
 * BlowController — blows an Audible whistle the actor carries or wears;
 * rejects when the actor holds nothing to blow.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BlowController from '../BlowController';
import Whistle from '../../../thing/Whistle';
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
    commandText: 'blow',
    executionId: 't',
    commandId: 'c',
    verb: 'blow',
    command: CommandDefinition.fromYaml(
      'verbs: [blow]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}

function one(stuff: unknown, raw: string): MqlOneResult {
  return { stuff, raw } as MqlOneResult;
}

describe('BlowController', () => {
  let avatar: FakeAvatar;
  let room: Location;

  beforeEach(() => {
    installV1QuantityMarshallers();
    room = makeStuff(() => new Location());
    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar as never, room as never);
  });
  afterEach(() => StuffApi.clearAll());

  it('blows a whistle in hand — emits the discrete event', async () => {
    const whistle = makeStuff(() => new Whistle());
    ContainmentApi.move(whistle as never, avatar as never);
    const emit = vi.spyOn(whistle, 'emit');

    await makeStuff(() => new BlowController()).execute(
      {} as CommandModel,
      ctxFor(avatar, room),
    );

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0]?.[0]).toMatchObject({
      db: 110,
      character: 'whistle',
    });
    expect(avatar.received.length).toBeGreaterThan(0);
  });

  it('blows the named whistle target', async () => {
    const whistle = makeStuff(() => new Whistle());
    ContainmentApi.move(whistle as never, avatar as never);
    const emit = vi.spyOn(whistle, 'emit');

    await makeStuff(() => new BlowController()).execute(
      { target: one(whistle, 'whistle') } as CommandModel,
      ctxFor(avatar, room),
    );

    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('rejects when the actor has no whistle', async () => {
    const ctx = ctxFor(avatar, room);
    await makeStuff(() => new BlowController()).execute(
      {} as CommandModel,
      ctx,
    );
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
  });
});
