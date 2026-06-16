/**
 * AnalyzeAddressController — `analyze address [<location>]` renders the
 * resolved address, its provenance, the covering Locality, and the
 * longest-prefix chain. No instrument required. Mirrors the
 * AnalyzeSkyController test harness; additionally installs the
 * AddressRegistry + a Locality roster (the harness skips postRegister,
 * so Localities are registered explicitly).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import AnalyzeAddressController from '../AnalyzeAddressController';
import Location from '../../../../lib/stuff/Location';
import Locality from '../../../../lib/address/Locality';
import AddressRegistry from '../../../AddressRegistry';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../lib/description/Named';
import { MobileMixin } from '../../../../lib/spatial/Mobile';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../api/stuff';
import { AddressApi } from '../../../../api/address';
import { ContainmentApi } from '../../../../api/containment';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type ModelData,
} from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type Interactive from '../../../Interactive';

class TestLocation extends Location {}

const FakeAvatarBase = CommandGiverMixin(
  NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea))))),
);
class FakeAvatar extends FakeAvatarBase {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [analyze]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(
  avatar: FakeAvatar,
  location: TestLocation,
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: 'analyze address',
    executionId: 't',
    commandId: 'c',
    verb: 'analyze',
    command: stubCommand(),
  });
}

function makeModel(fields: ModelData): CommandModel {
  return { ...fields, subcommand: 'address' };
}

const here = (room: TestLocation): MqlOneResult =>
  ({ stuff: room, raw: 'here' }) as unknown as MqlOneResult;

function installRoster(): void {
  makeStuffAtPath(() => new AddressRegistry(), '/obj/AddressRegistry');
  const mint = (path: string, name: string, address: string): void => {
    const loc = makeStuffAtPath(() => {
      const l = new Locality();
      l.setName(name);
      l.setAddress(address);
      return l;
    }, path);
    AddressApi.registerLocality(loc);
  };
  mint('/lib/address/narnia', 'Narnia', 'narnia');
  mint('/lib/address/cair-paravel', 'Cair Paravel', 'narnia/castle');
}

describe('AnalyzeAddressController', () => {
  beforeEach(() => {
    AddressApi._resetRegistryRefForReload();
    installRoster();
  });

  afterEach(() => {
    StuffApi.clearAll();
    AddressApi._resetRegistryRefForReload();
  });

  it('renders the covering Locality, provenance, and the prefix chain', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setAddress('narnia/castle');
    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const ctrl = await StuffApi.create(() => new AnalyzeAddressController());
    await ctrl.execute(makeModel({ location: here(room) }), makeContext(avatar, room));

    expect(avatar.received).toHaveLength(1);
    const body = (avatar.received[0] as { body: string }).body;
    expect(body).toContain('narnia/castle');
    expect(body).toContain('declared here');
    expect(body).toContain('Cair Paravel');
    expect(body).toContain('winner');
  });

  it('reports the global / off-grid case when no address resolves', async () => {
    const room = makeStuff(() => new TestLocation());
    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const ctrl = await StuffApi.create(() => new AnalyzeAddressController());
    await ctrl.execute(makeModel({ location: here(room) }), makeContext(avatar, room));

    const body = (avatar.received[0] as { body: string }).body;
    expect(body).toContain('(none)');
    expect(body).toContain('global');
  });

  it('rejects a non-place target', async () => {
    const room = makeStuff(() => new TestLocation());
    const thing = makeStuff(() => new Idea());
    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const ctrl = await StuffApi.create(() => new AnalyzeAddressController());
    const ctx = makeContext(avatar, room);
    await ctrl.execute(
      makeModel({
        location: { stuff: thing, raw: 'thing' } as unknown as MqlOneResult,
      }),
      ctx,
    );
    expect(ctx.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(
      true,
    );
  });
});
