/**
 * DouseController — ⭐⭐ **a FURNACE can be doused**, and for a long time
 * it could not.
 *
 * The controller's target filter admits `isCombustible(s) ||
 * isFurnace(s)`, and the line that acted on the result then narrowed to
 * `isCombustible` alone and threw the furnace half away. A forge, an
 * oven, a kiln, a campfire: every one has a working
 * `FurnaceMixin.douse()`, every one is reachable by the verb, and
 * **every one answered *"that isn't burning"* while burning.** The
 * method was unreachable from the only verb that calls it.
 *
 * ⚠ It surfaced in the envelope build because a lantern is now a
 * furnace, so `douse lantern` hit it on a thing a player carries — but
 * it was never about lanterns, and no controller test existed to see
 * it. Found by the drive (2026-09-24).
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import DouseController from '../DouseController';
import Lamp from '../../../../thing/Lamp';
import Location from '../../../../../lib/stuff/Location';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../../lib/description/Named';
import { MobileMixin } from '../../../../../lib/spatial/Mobile';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { Reserve } from '../../../../../lib/reserve';
import { Quantity } from '../../../../../lib/quantity';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';

const FakeAvatarBase = CommandGiverMixin(
  NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea))))),
);
class FakeAvatar extends FakeAvatarBase {
  protected override handleMessage(): void {}
}

function ctxFor(avatar: FakeAvatar, loc: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    location: loc as never,
    commandText: 'douse',
    executionId: 't',
    commandId: 'c',
    verb: 'douse',
    command: CommandDefinition.fromYaml(
      'verbs: [douse]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}

const one = (stuff: unknown, raw: string): MqlOneResult =>
  ({ stuff, raw }) as MqlOneResult;

describe('DouseController — a furnace', () => {
  let avatar: FakeAvatar;
  let room: Location;
  let lamp: Lamp;

  beforeEach(() => {
    installV1QuantityMarshallers();
    room = makeStuff(() => new Location());
    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar as never, room as never);
    lamp = makeStuff(() => {
      const l = new Lamp();
      l.setEmittedFlux(220);
      l.setReserve(
        new Reserve(
          'fuel',
          Quantity.of(100, '%'),
          Quantity.of(100, '%'),
          'combustion',
          null,
        ),
      );
      return l;
    }) as Lamp;
    ContainmentApi.move(lamp as never, room as never);
  });
  afterEach(() => StuffApi.clearAll());

  it('⭐⭐ puts a LIT furnace out — the case that never worked', async () => {
    lamp.ignite();
    expect(lamp.isLit()).toBe(true);

    await makeStuff(() => new DouseController()).execute(
      { target: one(lamp, 'lantern') } as CommandModel,
      ctxFor(avatar, room),
    );

    expect(lamp.isLit()).toBe(false);
    expect(lamp.getEmittedFlux().rawValue()).toBe(0);
  });

  it('refuses an unlit one, and that refusal is honest', async () => {
    expect(lamp.isLit()).toBe(false);
    const ctx = ctxFor(avatar, room);
    await makeStuff(() => new DouseController()).execute(
      { target: one(lamp, 'lantern') } as CommandModel,
      ctx,
    );
    expect(lamp.isLit()).toBe(false);
  });
});
