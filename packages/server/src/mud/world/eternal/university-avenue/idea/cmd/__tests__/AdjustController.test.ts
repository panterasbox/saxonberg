/**
 * AdjustController — sets a reachable mechanical timepiece to an explicit
 * HH:MM; rejects a non-mechanical / missing target and an unparseable
 * time. A content verb gated on the MechanicalMovement mixin
 * (no `instanceof Watch`).
 */

import "../../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import AdjustController from '../AdjustController';
import Watch from '../../../Watch';
import Location from '../../../../../../lib/stuff/Location';
import Thing from '../../../../../../lib/stuff/Thing';
import { CommandGiverMixin } from '../../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../../../lib/description/Named';
import { VisibleMixin } from '../../../../../../lib/description/Visible';
import { MobileMixin } from '../../../../../../lib/spatial/Mobile';
import { CommandDefinition } from '../../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../../../api/stuff';
import { ContainmentApi } from '../../../../../../api/containment';
import { WorldClockApi } from '../../../../../../api/worldclock';
import '../../../../../../platform/idea/WorldClockRegistry';
import { makeStuff } from '../../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../../../../api/command';
import type { MqlOneResult } from '../../../../../../api/mql';

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
    commandText: 'adjust',
    executionId: 't',
    commandId: 'c',
    verb: 'adjust',
    command: CommandDefinition.fromYaml(
      'verbs: [adjust]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}

function one(stuff: unknown, raw: string): MqlOneResult {
  return { stuff, raw } as MqlOneResult;
}

describe('AdjustController', () => {
  let avatar: FakeAvatar;
  let room: Location;

  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
    room = makeStuff(() => new Location());
    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar as never, room as never);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
  });

  function openWatchInHand(): Watch {
    const w = makeStuff(() => new Watch());
    w.open();
    ContainmentApi.move(w as never, avatar as never);
    return w;
  }

  it('sets the named mechanical timepiece to the given time', async () => {
    const w = openWatchInHand();
    await makeStuff(() => new AdjustController()).execute(
      { target: one(w, 'watch'), time: '4:00' } as CommandModel,
      ctxFor(avatar, room),
    );
    expect(w.currentReading()?.format()).toBe('04:00');
  });

  it('rejects an unparseable time', async () => {
    const w = openWatchInHand();
    const ctx = ctxFor(avatar, room);
    await makeStuff(() => new AdjustController()).execute(
      { target: one(w, 'watch'), time: 'noon' } as CommandModel,
      ctx,
    );
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
  });

  it('rejects a non-mechanical target', async () => {
    const rock = makeStuff(() => new (class extends VisibleMixin(Thing) {})());
    const ctx = ctxFor(avatar, room);
    await makeStuff(() => new AdjustController()).execute(
      { target: one(rock, 'rock'), time: '4:00' } as CommandModel,
      ctx,
    );
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
  });

  it('rejects a missing target', async () => {
    const ctx = ctxFor(avatar, room);
    await makeStuff(() => new AdjustController()).execute(
      { time: '4:00' } as CommandModel,
      ctx,
    );
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
  });
});
