/**
 * FoldController / UnfoldController — fold and unfold a Foldable in
 * scope; refuse folding an occupied chair; reject a non-foldable target.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import FoldController from '../FoldController';
import UnfoldController from '../UnfoldController';
import { FoldableMixin } from '../../../../lib/slot/Foldable';
import { PosturedMixin } from '../../../../lib/slot/Postured';
import { SlottedMixin } from '../../../../lib/slot/Slotted';
import { SlottableMixin } from '../../../../lib/slot/Slottable';
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

class FoldingChair extends FoldableMixin(
  PosturedMixin(SlottedMixin(VisibleMixin(Thing))),
) {}
class Sitter extends SlottableMixin(Idea) {}

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

describe('FoldController / UnfoldController', () => {
  let avatar: FakeAvatar;
  let room: Location;
  let chair: FoldingChair;

  beforeEach(() => {
    room = makeStuff(() => new Location());
    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar as never, room as never);
    chair = makeStuff(() => new FoldingChair());
    chair.setShortDescription('camp chair');
    chair.setStaticSlots([
      { name: 'sit', accepts: 'SlottableMixin', postures: ['sit'] },
    ]);
    ContainmentApi.move(chair as never, room as never);
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('folds an unfolded chair', async () => {
    expect(chair.isFolded()).toBe(false);
    await makeStuff(() => new FoldController()).execute(
      { target: one(chair, 'chair') } as CommandModel,
      ctxFor(avatar, room, 'fold'),
    );
    expect(chair.isFolded()).toBe(true);
  });

  it('unfolds a folded chair', async () => {
    chair.fold();
    await makeStuff(() => new UnfoldController()).execute(
      { target: one(chair, 'chair') } as CommandModel,
      ctxFor(avatar, room, 'unfold'),
    );
    expect(chair.isFolded()).toBe(false);
  });

  it('refuses to fold an occupied chair', async () => {
    const sitter = makeStuff(() => new Sitter());
    chair.occupy(sitter, 'sit');
    const ctx = ctxFor(avatar, room, 'fold');
    await makeStuff(() => new FoldController()).execute(
      { target: one(chair, 'chair') } as CommandModel,
      ctx,
    );
    expect(chair.isFolded()).toBe(false);
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
  });

  it('rejects a non-foldable target', async () => {
    const rock = makeStuff(() => new (class extends VisibleMixin(Thing) {})());
    const ctx = ctxFor(avatar, room, 'fold');
    await makeStuff(() => new FoldController()).execute(
      { target: one(rock, 'rock') } as CommandModel,
      ctx,
    );
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
  });
});
