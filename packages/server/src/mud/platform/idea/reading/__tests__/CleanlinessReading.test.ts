/**
 * CleanlinessReading — `analyze cleanliness` (cleanliness B57).
 *
 * ⭐ Competence resolves DETAIL, never ACCESS: anybody reads the look
 * line; a novice where it is and what has set; a competent hand what
 * lifts each kind (off the dirt's own row); a proficient one what was
 * DONE to it; an expert how long ago. ⛔ Never the microbes.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { withRow } from './row';
import { driveAnalyze } from './drive';
import CleanlinessReading from '../CleanlinessReading';
import Location from '../../../../lib/location/Location';
import Rug from '../../../thing/Rug';
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
import { installDirtKinds } from '../../../../lib/cleanliness/__tests__/soil-fixtures';
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

class BandedCleanlinessReading extends CleanlinessReading {
  public band: CompetenceBandName = 'untrained';
  protected override async bandOf(_actor: Stuff): Promise<CompetenceBandName> {
    return this.band;
  }
}

const DIRT = [
  { key: 'grease', adjective: 'greasy', form: 'film', answersTo: ['surfactant', 'alkali-mild'], waterLifts: 0.05 },
  {
    key: 'blood', adjective: 'bloodied', form: 'stain', setsAboveK: 318, waterLifts: 0.5,
    answersTo: ['surfactant'], setAnswersTo: ['oxidiser'],
  },
];

function ctx(avatar: FakeAvatar, room: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location: room,
    commandText: 'analyze cleanliness rug',
    executionId: 't',
    commandId: 'c',
    verb: 'analyze',
    command: CommandDefinition.fromYaml('verbs: [analyze]\ncontroller: NoopController\ndescription: stub\n', '<test>'),
  });
}

describe('analyze cleanliness', () => {
  let room: Location;
  let avatar: FakeAvatar;

  beforeEach(() => {
    StuffApi.clearAll();
    vi.spyOn(AppApi, 'setting').mockReturnValue('');
    installDirtKinds(DIRT as Record<string, unknown>[]);
    room = makeStuff(() => new Location());
    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  function rug(): Rug {
    const r = makeStuff(() => new Rug());
    r.soil('grease', 0.6, null);
    r.soil('blood', 0.4, null);
    r.setSoilSet('blood', '', true);
    ContainmentApi.move(r, room);
    return r;
  }

  async function read(thing: Stuff, band: CompetenceBandName): Promise<string> {
    const reading = withRow(await StuffApi.create(() => new BandedCleanlinessReading()), 'cleanliness');
    reading.band = band;
    avatar.received = [];
    await driveAnalyze(reading, ctx(avatar, room), { subject: { stuff: thing, raw: 'rug' } as never });
    return avatar.received.map((f) => (f as { body: string }).body).join('\n');
  }

  it('⭐ untrained: what look says — no set stains, no advice', async () => {
    const body = await read(rug(), 'untrained');
    expect(body).toMatch(/It is .*greasy/);
    expect(body).not.toMatch(/set|soap|bleach/);
  });

  it('novice: what has SET', async () => {
    expect(await read(rug(), 'novice')).toMatch(/The blood has set\./);
  });

  it('⭐ competent: what lifts each kind, off the dirt rows', async () => {
    const body = await read(rug(), 'competent');
    expect(body).toMatch(/The grease wants soap or washing soda; water alone will not shift it\./);
    expect(body).toMatch(/The set blood answers only to a bleach\./);
  });

  it('⭐ proficient: what was DONE to it, as evidence', async () => {
    const r = rug();
    expect(await read(r, 'proficient')).toMatch(/Nothing says it has ever been washed/);
    r.holdAtHeat(373, 300, { wet: true });
    expect(await read(r, 'proficient')).toMatch(/boiled and not handled since/);
  });

  it('⛔ never the microbes', async () => {
    expect(await read(rug(), 'expert')).not.toMatch(/germ|microb|bacteri|pathogen/i);
  });
});
