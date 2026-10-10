/**
 * PumpReading — `analyze pump` (pump build W1, D9).
 *
 * ⭐ An eye rung that explains nothing: the packing in five words and no
 * digit; for a pump that PULLS, about how deep it will draw from where it
 * stands, bracketed — a bracket containing ≈ 10.33 m at sea level; for a
 * pump that PUSHES, no depth at all. And never a word about the air.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { withRow } from './row';
import { driveAnalyze } from './drive';
import PumpReading from '../PumpReading';
import CartesianLocation from '../../../../lib/location/CartesianLocation';
import Biome from '../../../../lib/biome/Biome';
import Pump from '../../../thing/Pump';
import Tool from '../../../thing/Tool';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../lib/description/Named';
import { MobileMixin } from '../../../../lib/spatial/Mobile';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../api/stuff';
import { BiomeApi } from '../../../../api/biome';
import { AppApi } from '../../../../api/app';
import { ContainmentApi } from '../../../../api/containment';
import { Quantity } from '../../../../lib/quantity';
import { PersistenceManager, Collections } from '../../../../../backend/PersistenceManager';
import { makeStuff, makeStuffAtPath, EXIT_KIND_TEST_ROWS } from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { CommandApi, type CommandContext } from '../../../../api/command';
import type Interactive from '../../Interactive';

const SUCTION = '/platform/idea/PumpMechanism/suction';
const FORCE = '/platform/idea/PumpMechanism/force';

const FakeAvatarBase = CommandGiverMixin(
  NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea))))),
);
class FakeAvatar extends FakeAvatarBase {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

function installStore(): void {
  const rows = [
    ...(EXIT_KIND_TEST_ROWS as unknown as Array<{ path: string }>),
    { path: SUCTION, class: '/platform/idea/PumpMechanism', data: { name: 'suction', pulls: true, description: 'It draws.' } },
    { path: FORCE, class: '/platform/idea/PumpMechanism', data: { name: 'force', pulls: false, description: 'It drives.' } },
  ].map((r, i) => ({ ...r, _id: String(i + 1) }));
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save: vi.fn(async () => '1'),
    find: vi.fn(async (c: string, q: Record<string, unknown>) =>
      c !== Collections.Content ? [] : typeof q.path === 'string' ? rows.filter((r) => r.path === q.path) : rows.slice(),
    ),
  } as unknown as PersistenceManager);
}

function ctx(avatar: FakeAvatar, room: CartesianLocation): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location: room,
    commandText: 'analyze pump pump',
    executionId: 't',
    commandId: 'c',
    verb: 'analyze',
    command: CommandDefinition.fromYaml('verbs: [analyze]\ncontroller: NoopController\ndescription: stub\n', '<test>'),
  });
}

describe('analyze pump', () => {
  let room: CartesianLocation;
  let avatar: FakeAvatar;

  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    vi.spyOn(AppApi, 'setting').mockReturnValue('');
    installStore();
    makeStuffAtPath(() => {
      const b = new Biome();
      b.setDefaultTemperature(Quantity.of(288, 'K'));
      b.setDefaultPressure(Quantity.of(101_325, 'Pa'));
      b.setDefaultHumidity(Quantity.of(50, '%'));
      b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
      b.setDefaultWind(Quantity.of(0, 'm/s'));
      b.setDefaultAtmosphere('air');
      return b;
    }, '/stuff/idea/biome/universe');
    room = makeStuff(() => new CartesianLocation());
    room.setBiome(BiomeApi.getRootBiome());
    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  async function analyze(pump: Pump): Promise<string> {
    const reading = withRow(await StuffApi.create(() => new PumpReading()), 'pump');
    await driveAnalyze(reading, ctx(avatar, room), { subject: { stuff: pump, raw: 'pump' } as never });
    return avatar.received.map((f) => (f as { body: string }).body).join('\n');
  }

  function pumpOf(mechanism: string, condition = 1): Pump {
    const p = makeStuff(() => new Pump());
    p.setShortDescription('pump');
    p.mechanism = mechanism;
    const leather = makeStuff(() => new Tool());
    leather.setCapabilities(['packing']);
    leather.setCondition(condition);
    ContainmentApi.move(leather, p);
    ContainmentApi.move(p, room);
    return p;
  }

  it('a pulling pump reports a draw depth whose bracket holds ≈ 10.33 m, and no reason', async () => {
    const body = await analyze(pumpOf(SUCTION));
    expect(body).toContain('It draws.');
    expect(body).toContain('sound');
    const m = body.match(/no deeper than about[^0-9]*([0-9.]+)[^±]*(?:±[^0-9]*([0-9.]+))?/);
    expect(m).not.toBeNull();
    const centre = Number(m![1]);
    const half = Number(m![2] ?? 0);
    expect(centre - half).toBeLessThanOrEqual(10.34);
    expect(centre + half).toBeGreaterThanOrEqual(10.32);
    expect(body).not.toMatch(/air|atmospher|pressure|vacuum/i);
  });

  it('a pushing pump reports no depth at all', async () => {
    const body = await analyze(pumpOf(FORCE));
    expect(body).toContain('It drives.');
    expect(body).not.toMatch(/no deeper than/);
  });

  it('the packing reads in words, and the words carry no digit', async () => {
    const body = await analyze(pumpOf(FORCE, 0.4));
    expect(body).toContain('leaking');
    const packingLine = body.split('\n').find((l) => l.includes('leather in the barrel'))!;
    expect(packingLine).not.toMatch(/[0-9]/);
  });
});
