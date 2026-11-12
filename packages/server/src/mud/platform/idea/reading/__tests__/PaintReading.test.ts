/**
 * A building's outside, read from its landing (paint D13) — the two
 * halves of the retired `survey <building>` (controller-liquidity W17):
 *
 *   - `measure paint <building>` — the job: the area to the weather, the
 *     litres one coat takes, and the structure's own word for what the
 *     weather meets (*wall and roof*; a ship's *hull*). An instrument rung:
 *     no rule, no figure.
 *   - `analyze condition <building>` — the WHY on the condition word: the
 *     weather's work on the coat.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { withRow } from './row';
import { driveAnalyze, driveMeasure, instrumentWith } from './drive';
import PaintReading from '../PaintReading';
import ConditionReading from '../ConditionReading';
import Location from '../../../../lib/location/Location';
import BuildingBase from '../../../../lib/structure/Building';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../lib/description/Named';
import { MobileMixin } from '../../../../lib/spatial/Mobile';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../api/stuff';
import { AppApi } from '../../../../api/app';
import { ContainmentApi } from '../../../../api/containment';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import { CommandApi, type CommandContext } from '../../../../api/command';
import type Interactive from '../../Interactive';
import type { Stuff } from '../../../../lib/stuff/Stuff';

const FakeAvatarBase = CommandGiverMixin(
  NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea))))),
);
class FakeAvatar extends FakeAvatarBase {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

/** A building whose weather is not walked here — its condition is set by the test. */
class TestHouse extends BuildingBase {
  static _mixinName = 'PaintTestHouse';
  public override weatherScope(): Stuff | null {
    return null;
  }
  public override coatAreaM2(): number {
    return 120;
  }
}

/** The same, with a ship's word for what the weather meets. */
class TestHull extends TestHouse {
  static _mixinName = 'PaintTestHull';
  public override weatherSurface(): string {
    return 'hull';
  }
}

function ctx(avatar: FakeAvatar, room: Location, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location: room,
    commandText: `${verb} paint house`,
    executionId: 't',
    commandId: 'c',
    verb,
    command: CommandDefinition.fromYaml(`verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`, '<test>'),
  });
}

describe('a building, read from its landing', () => {
  let room: Location;
  let avatar: FakeAvatar;

  beforeEach(() => {
    StuffApi.clearAll();
    vi.spyOn(AppApi, 'setting').mockReturnValue('');
    room = makeStuff(() => new Location());
    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const said = (): string => avatar.received.map((f) => (f as { body: string }).body).join('\n');

  async function measurePaint(house: Stuff, tools: Stuff[]): Promise<string> {
    const reading = withRow(await StuffApi.create(() => new PaintReading()), 'paint');
    avatar.received = [];
    await driveMeasure(reading, ctx(avatar, room, 'measure'), {
      subject: { stuff: house, raw: 'house' } as never,
      tools,
    });
    return said();
  }

  it('⭐ `measure paint` gives the area, the surface and the litres one coat takes', async () => {
    const house = makeStuff(() => new TestHouse());
    const body = await measurePaint(house, [await instrumentWith('gauging')]);
    expect(body).toMatch(/about 120 square meters of wall and roof/);
    // 120 m² × the 0.05 mm film fallback = 6 L.
    expect(body).toMatch(/one coat of paint would take about 6 litres/);
  });

  it('a ship says *hull*', async () => {
    const hull = makeStuff(() => new TestHull());
    expect(await measurePaint(hull, [await instrumentWith('gauging')])).toMatch(/square meters of hull/);
  });

  it('with nothing to measure by, it names the route — a rule or a gauging rod', async () => {
    const house = makeStuff(() => new TestHouse());
    const body = await measurePaint(house, []);
    expect(body).toMatch(/a rule or a gauging rod/);
    expect(body).not.toMatch(/square meters/);
  });

  it('⭐ `analyze condition <building>` says WHY — the weather at the fabric', async () => {
    const house = makeStuff(() => new TestHouse());
    house.setCondition(0.5);
    const reading = withRow(await StuffApi.create(() => new ConditionReading()), 'condition');
    avatar.received = [];
    await driveAnalyze(reading, ctx(avatar, room, 'analyze'), {
      subject: { stuff: house, raw: 'house' } as never,
    });
    const body = said();
    expect(body).toMatch(/It is worn — the paint has gone; the weather is at what was under it\./);
  });
});
