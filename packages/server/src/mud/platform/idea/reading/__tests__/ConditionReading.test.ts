/**
 * ConditionReading — `analyze condition` (repair W2, D11).
 *
 * ⭐ Competence resolves DETAIL, never ACCESS: every band reads the word
 * and whether it was mended; a novice how often; a competent eye the worst
 * hand in it and the grade; a proficient one part by part; an expert the
 * menders by name. And never a number.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { withRow } from './row';
import { driveAnalyze } from './drive';
import ConditionReading from '../ConditionReading';
import Location from '../../../../lib/location/Location';
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
import { AppApi } from '../../../../api/app';
import { ContainmentApi } from '../../../../api/containment';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import { CommandApi, type CommandContext } from '../../../../api/command';
import type Interactive from '../../Interactive';
import type { CompetenceBandName } from '../../../../lib/advancement/CompetenceBand';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { MendRecord } from '../../../../lib/material/Durable';

const FakeAvatarBase = CommandGiverMixin(
  NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea))))),
);
class FakeAvatar extends FakeAvatarBase {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

/** The reading at a fixed band — the band ladder is what is under test. */
class BandedConditionReading extends ConditionReading {
  public band: CompetenceBandName = 'untrained';
  protected override async bandOf(_actor: Stuff): Promise<CompetenceBandName> {
    return this.band;
  }
}

function ctx(avatar: FakeAvatar, room: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location: room,
    commandText: 'analyze condition pick',
    executionId: 't',
    commandId: 'c',
    verb: 'analyze',
    command: CommandDefinition.fromYaml('verbs: [analyze]\ncontroller: NoopController\ndescription: stub\n', '<test>'),
  });
}

const mend = (byName: string, band: string, part: string): MendRecord => ({
  at: 1, by: `/x/${byName}`, byName, band, discipline: 'smithing', part, kind: 'mended', result: band === 'untrained' ? 'short' : 'sound',
});

describe('analyze condition', () => {
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

  function pick(): Tool {
    const p = makeStuff(() => new Tool());
    p.setShortDescription('pick');
    p.setBill({
      parts: [
        { part: 'head', template: '/x/head', count: 1, role: 'structural' },
        { part: 'haft', template: '/x/haft', count: 1, role: 'structural' },
      ],
    });
    p.ensureParts();
    p.getLine('head')!.condition = 0.6;
    p.recordLineMend('head', mend('Ned', 'untrained', 'head'));
    p.recordLineMend('head', mend('Berta', 'expert', 'head'));
    ContainmentApi.move(p, room);
    return p;
  }

  async function read(thing: Stuff, band: CompetenceBandName): Promise<string> {
    const reading = withRow(await StuffApi.create(() => new BandedConditionReading()), 'condition');
    reading.band = band;
    avatar.received = [];
    await driveAnalyze(reading, ctx(avatar, room), { subject: { stuff: thing, raw: 'pick' } as never });
    return avatar.received.map((f) => (f as { body: string }).body).join('\n');
  }

  it('⭐ untrained: the word and THAT it was mended — no count, no hands', async () => {
    const body = await read(pick(), 'untrained');
    expect(body).toMatch(/It is worn\./);
    expect(body).toMatch(/It has been mended\./);
    expect(body).not.toMatch(/twice|Berta|unpractised/);
  });

  it('novice: how many times', async () => {
    expect(await read(pick(), 'novice')).toMatch(/mended twice/);
  });

  it('⭐ competent: the worst hand in it, in words, and the grade', async () => {
    const body = await read(pick(), 'competent');
    expect(body).toMatch(/an unpractised hand/);
    expect(body).toMatch(/fair work/);
    expect(body).not.toMatch(/Berta/);
  });

  it('proficient: part by part; expert: the menders by name', async () => {
    expect(await read(pick(), 'proficient')).toMatch(/The head is worn, mended twice/);
    expect(await read(pick(), 'expert')).toMatch(/the work of Ned and Berta/);
  });

  it('⛔ never a number', async () => {
    expect(await read(pick(), 'expert')).not.toMatch(/\d/);
  });
});
