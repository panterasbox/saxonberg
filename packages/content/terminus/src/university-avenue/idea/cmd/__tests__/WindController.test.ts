/**
 * WindController — winds a reachable mechanical timepiece's mainspring
 * back to full; rejects a non-mechanical / missing target. The verb is a
 * content verb gated on the MechanicalMovement mixin (no
 * `instanceof Watch`), so it operates on any MechanicalMovement.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import WindController from '../WindController';
import Watch from '../../../Watch';
import { Reserve, type Reserved } from '@saxonberg/server/mud/lib/reserve';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { CommandGiverMixin } from '@saxonberg/server/mud/lib/command/CommandGiver';
import { SensorMixin } from '@saxonberg/server/mud/lib/message/Sensor';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { VisibleMixin } from '@saxonberg/server/mud/lib/description/Visible';
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
    commandText: 'wind',
    executionId: 't',
    commandId: 'c',
    verb: 'wind',
    command: CommandDefinition.fromYaml(
      'verbs: [wind]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}

function one(stuff: unknown, raw: string): MqlOneResult {
  return { stuff, raw } as MqlOneResult;
}

describe('WindController', () => {
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

  function drainedWatch(): Watch {
    const w = makeStuff(() => new Watch());
    w.open();
    (w as unknown as Reserved).setReserve(
      new Reserve(
        'mainspring',
        Quantity.of(600, 's'),
        Quantity.of(0, 's'),
        'mechanical',
        'stopped',
      ),
    );
    ContainmentApi.move(w as never, avatar as never);
    return w;
  }

  it('winds the named mechanical timepiece back to full', async () => {
    const w = drainedWatch();
    expect(w.mainspringRemaining()).toBe(0);

    await makeStuff(() => new WindController()).execute(
      { target: one(w, 'watch') } as CommandModel,
      ctxFor(avatar, room),
    );

    expect(w.mainspringRemaining()).toBe(600);
    expect(avatar.received.length).toBeGreaterThan(0);
  });

  it('rejects a non-mechanical target', async () => {
    const rock = makeStuff(() => new (class extends VisibleMixin(Thing) {})());
    const ctx = ctxFor(avatar, room);
    await makeStuff(() => new WindController()).execute(
      { target: one(rock, 'rock') } as CommandModel,
      ctx,
    );
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
  });

  it('rejects a missing target', async () => {
    const ctx = ctxFor(avatar, room);
    await makeStuff(() => new WindController()).execute(
      {} as CommandModel,
      ctx,
    );
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
  });
});
