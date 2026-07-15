/**
 * SwitchController — toggles / sets a Switchable in scope; rejects a
 * non-switchable target.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import SwitchController from '../SwitchController';
import { SwitchableMixin } from '../../../../lib/boundary/Switchable';
import Location from '../../../../lib/stuff/Location';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../lib/description/Named';
import { VisibleMixin } from '../../../../lib/description/Visible';
import { MobileMixin } from '../../../../lib/spatial/Mobile';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../lib/stuff/Idea';
import Thing from '../../../../lib/stuff/Thing';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';

const FakeAvatarBase = CommandGiverMixin(
  NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea))))),
);
class FakeAvatar extends FakeAvatarBase {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

class Lamp extends SwitchableMixin(VisibleMixin(Thing)) {}

function ctxFor(avatar: FakeAvatar, loc: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    location: loc as never,
    commandText: 'switch',
    executionId: 't',
    commandId: 'c',
    verb: 'switch',
    command: CommandDefinition.fromYaml(
      'verbs: [switch]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}

function one(stuff: unknown, raw: string): MqlOneResult {
  return { stuff, raw } as MqlOneResult;
}

describe('SwitchController', () => {
  let avatar: FakeAvatar;
  let room: Location;
  let lamp: Lamp;

  beforeEach(() => {
    room = makeStuff(() => new Location());
    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar as never, room as never);
    lamp = makeStuff(() => new Lamp());
    lamp.setShortDescription('lamppost');
    ContainmentApi.move(lamp as never, room as never);
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('toggles an off lamp on', async () => {
    expect(lamp.isOn()).toBe(false);
    await makeStuff(() => new SwitchController()).execute(
      { target: one(lamp, 'lamp') } as CommandModel,
      ctxFor(avatar, room),
    );
    expect(lamp.isOn()).toBe(true);
  });

  it('sets explicit off', async () => {
    lamp.switchOn();
    await makeStuff(() => new SwitchController()).execute(
      { target: one(lamp, 'lamp'), state: 'off' } as CommandModel,
      ctxFor(avatar, room),
    );
    expect(lamp.isOn()).toBe(false);
  });

  it('rejects a non-switchable target', async () => {
    const rock = makeStuff(() => new (class extends VisibleMixin(Thing) {})());
    const ctx = ctxFor(avatar, room);
    await makeStuff(() => new SwitchController()).execute(
      { target: one(rock, 'rock') } as CommandModel,
      ctx,
    );
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
  });
});
