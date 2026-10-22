/**
 * DensityReading — the egg and the glass on a lye (potash D7).
 *
 * ⭐ A lye's strength is read in WORDS at both rungs — the egg by eye
 * (`analyze density`, the `flotation` hand tool) and the glass
 * (`measure density`) — because it is a band a soapmaker acts on, never a
 * figure (AC 12). A ferment still reads its gravity as a figure.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { withRow } from './row';
import { driveAnalyze, driveMeasure, instrumentWith } from './drive';
import DensityReading from '../DensityReading';
import Location from '../../../../lib/location/Location';
import Vat from '../../../thing/Vat';
import Material from '../../../../lib/material/Material';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../lib/description/Named';
import { MobileMixin } from '../../../../lib/spatial/Mobile';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../lib/stuff/Idea';
import { Quantity } from '../../../../lib/quantity';
import { StuffApi } from '../../../../api/stuff';
import { AppApi } from '../../../../api/app';
import { ContainmentApi } from '../../../../api/containment';
import { makeStuff, makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { CommandApi, type CommandContext } from '../../../../api/command';
import type Interactive from '../../Interactive';
import type { CompetenceBandName } from '../../../../lib/advancement/CompetenceBand';
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

class BandedDensityReading extends DensityReading {
  public band: CompetenceBandName = 'competent';
  protected override async bandOf(_actor: Stuff): Promise<CompetenceBandName> {
    return this.band;
  }
}

function ctx(avatar: FakeAvatar, room: Location, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location: room,
    commandText: `${verb} density pot`,
    executionId: 't',
    commandId: 'c',
    verb,
    command: CommandDefinition.fromYaml(`verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`, '<test>'),
  });
}

let seq = 0;
function liquor(tags: string[]): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`liquor-${seq}`);
    m.setTags(tags);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    return m;
  }, `/stuff/idea/material/_density/${seq}`);
}

describe('density on a lye', () => {
  let room: Location;
  let avatar: FakeAvatar;

  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
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

  function pot(tags: string[], kgPerL: number | null): Vat {
    const v = makeStuff(() => new Vat());
    v.setInteriorCapacity(Quantity.of(20, 'L'));
    v.setBulkMaterial('interior', liquor(tags));
    v.setBulkAmount('interior', Quantity.of(10, 'L'));
    if (kgPerL !== null) v.setBulkPayload('interior', { dissolvedSolidsKgPerL: kgPerL });
    ContainmentApi.move(v, room);
    return v;
  }
  const LYE = ['liquid', 'caustic', 'alkali', 'lye'];

  async function read(
    verb: 'analyze' | 'measure',
    subject: Stuff,
    tools: Stuff[],
    band: CompetenceBandName = 'competent',
  ): Promise<string> {
    const reading = withRow(await StuffApi.create(() => new BandedDensityReading()), 'density');
    reading.band = band;
    avatar.received = [];
    const drive = verb === 'analyze' ? driveAnalyze : driveMeasure;
    await drive(reading, ctx(avatar, room, verb), { subject: { stuff: subject, raw: 'pot' } as never, tools });
    // The prose only — an MML element's stuff-id is not something a
    // player reads.
    return avatar.received
      .map((f) => (f as { body: string }).body)
      .join('\n')
      .replace(/<[^>]*>/g, '');
  }

  it('⭐ the egg reads the four bands in words, and no number', async () => {
    const egg = await instrumentWith('flotation', { grade: 'poor' });
    const lines = [
      await read('analyze', pot(LYE, 0.001), [egg]),
      await read('analyze', pot(LYE, 0.02), [egg]),
      await read('analyze', pot(LYE, 0.04), [egg]),
      await read('analyze', pot(LYE, 0.08), [egg]),
    ];
    expect(lines[0]).toMatch(/sinks and lies on its side/);
    expect(lines[1]).toMatch(/stands up on its point/);
    expect(lines[2]).toMatch(/coin of shell/);
    expect(lines[3]).toMatch(/rides high/);
    for (const l of lines) expect(l).not.toMatch(/\d/);
  });

  it('⭐ a novice tells the weak lye from water no better than "it sinks"', async () => {
    const egg = await instrumentWith('flotation', { grade: 'poor' });
    const body = await read('analyze', pot(LYE, 0.02), [egg], 'novice');
    expect(body).toMatch(/The egg sinks\./);
    expect(body).not.toMatch(/point/);
  });

  it('water floats no egg', async () => {
    const egg = await instrumentWith('flotation', { grade: 'poor' });
    expect(await read('analyze', pot(['liquid', 'water'], null), [egg])).toMatch(/nothing in this but water/);
  });

  it('with no egg the eye has nothing to read, and says what would', async () => {
    const body = await read('analyze', pot(LYE, 0.04), []);
    expect(body).not.toMatch(/egg rides|coin of shell/);
  });

  it('⭐ the glass reads a lye in words too (AC 12) — and a must still as a figure', async () => {
    const glass = await instrumentWith('hydrometry', { grade: 'fair' });
    const lye = await read('measure', pot(LYE, 0.08), [glass]);
    expect(lye).toMatch(/Strong lye/);
    expect(lye).not.toMatch(/\d/);
    const must = await read('measure', pot(['liquid', 'water'], null), [glass]);
    expect(must).toMatch(/specific gravity of 1\.000/);
  });
});
