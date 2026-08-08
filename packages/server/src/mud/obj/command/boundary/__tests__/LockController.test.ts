/**
 * LockController / UnlockController — lock and unlock a Lockable in
 * scope; reject a non-lockable target.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import LockController from '../LockController';
import UnlockController from '../UnlockController';
import Door from '../../../Door';
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

function ctxFor(avatar: FakeAvatar, loc: Location, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    location: loc as never,
    commandText: verb,
    executionId: 't',
    commandId: 'c',
    verb,
    command: CommandDefinition.fromYaml(
      `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
      '<test>',
    ),
  });
}

function one(stuff: unknown, raw: string): MqlOneResult {
  return { stuff, raw } as MqlOneResult;
}

describe('LockController / UnlockController', () => {
  let avatar: FakeAvatar;
  let room: Location;
  let door: Door;

  beforeEach(() => {
    room = makeStuff(() => new Location());
    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar as never, room as never);
    door = makeStuff(() => new Door());
    door.setShortDescription('iron gate');
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('locks an unlocked door', async () => {
    expect(door.isLocked()).toBe(false);
    await makeStuff(() => new LockController()).execute(
      { target: one(door, 'gate') } as CommandModel,
      ctxFor(avatar, room, 'lock'),
    );
    expect(door.isLocked()).toBe(true);
  });

  it('unlocks a locked door', async () => {
    door.setLocked(true);
    await makeStuff(() => new UnlockController()).execute(
      { target: one(door, 'gate') } as CommandModel,
      ctxFor(avatar, room, 'unlock'),
    );
    expect(door.isLocked()).toBe(false);
  });

  it('rejects a non-lockable target', async () => {
    const rock = makeStuff(() => new (class extends VisibleMixin(Thing) {})());
    const ctx = ctxFor(avatar, room, 'lock');
    await makeStuff(() => new LockController()).execute(
      { target: one(rock, 'rock') } as CommandModel,
      ctx,
    );
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
  });
});
