/**
 * Shore (fishing B1/D15) — **a room-fixed feature that cites a reach and
 * reads the water**, and what `look` says at each band.
 *
 * The claims:
 *
 *  - the physical read is for everyone and names no number: the water,
 *    its breadth, still/slow/fast, fresh/brackish/salt, cold/warm,
 *    soft/hard, and the outfall as a fact about the map;
 *  - the species read is gated on the Discipline the
 *    `water.fishery.readDiscipline` setting names — the floor when the
 *    viewer has no transcript, and **physical only** when that row is
 *    not installed (a realm with water and no fishing trade);
 *  - a shore asked before its first refresh says *hard to read yet*.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import Discipline from '@saxonberg/server/mud/platform/idea/Discipline';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WatercourseCatalogue, { WATERCOURSE_CATALOGUE_PATH } from '../idea/WatercourseCatalogue';
import type { CompiledReach } from '../idea/WatercourseCatalogue';
import FisheryRegistry, { FISHERY_REGISTRY_PATH } from '../idea/FisheryRegistry';
import type { FisheryStanding } from '../idea/FisheryRegistry';
import Shore from '../thing/Shore';

const DISCIPLINE = '/trade/fishing/idea/Discipline/fishing';

const REACH: CompiledReach = {
  ref: 'kestrel:confluence',
  courseKey: 'kestrel',
  courseName: 'the Kestrel',
  nodeName: 'confluence',
  basin: 'kestrel',
  index: 3,
  elevation: 30,
  channelWidthM: 90,
  depthToSea: 1,
  catchmentKm2: 1000,
  climateLocalityPath: null,
  meanDepthM: null,
  stocks: [],
};

function standing(over: Partial<FisheryStanding> = {}): FisheryStanding {
  return {
    reachRef: REACH.ref,
    species: [
      { speciesPath: '/stuff/idea/species/eel', name: 'eel', capacity: 100, full: 100, level: 90, fit: 1, limiting: null, stocked: false, role: 'forage', fightRating: 0.3 },
      { speciesPath: '/stuff/idea/species/sturgeon', name: 'sturgeon', capacity: 4, full: 4, level: 4, fit: 1, limiting: null, stocked: false, role: 'apex', fightRating: 1 },
    ],
    water: {
      temperatureK: 292,
      currentMps: 0.2,
      salinityPpt: 15,
      oxygenMgL: 9,
      pH: 7.7,
      hardnessDgh: 11,
      nitrateMgL: 3,
      ammoniaMgL: 0,
      nitriteMgL: 0,
      contamination: 0.4,
    },
    flow: null,
    contamination: { reachRef: REACH.ref, level: 0.4, byKind: { organic: 0.4, persistent: 0, sediment: 0, nutrient: 0 } },
    ...over,
  };
}

/** The catalogue and the registry, stubbed at the two reads the shore makes. */
function installWater(s: FisheryStanding | null = standing()): void {
  const cat = makeStuffAtPath(() => new WatercourseCatalogue(), WATERCOURSE_CATALOGUE_PATH);
  vi.spyOn(cat, 'reachOf').mockResolvedValue(REACH);
  const reg = makeStuffAtPath(() => new FisheryRegistry(), FISHERY_REGISTRY_PATH);
  vi.spyOn(reg, 'standingAt').mockResolvedValue(s);
}

function installDiscipline(): void {
  const d = makeStuffAtPath(() => new Discipline(), DISCIPLINE);
  d.setKey('fishing');
}

/** A viewer with a transcript digest at `band` in `fishing`, or none. */
function viewer(band: string | null): Stuff {
  const v = makeStuff(() => new Shore()); // any Stuff; the mixin predicate is mocked
  vi.spyOn(MixinApi, 'isAdvancing').mockImplementation(((s: Stuff) => s === v) as never);
  (v as unknown as { competenceDigestCached: () => unknown }).competenceDigestCached = () =>
    band === null ? [] : [{ discipline: 'fishing', band }];
  return v;
}

async function shoreOn(reach = REACH.ref): Promise<Shore> {
  const s = makeStuff(() => new Shore());
  s.setReachRef(reach);
  await s.postRegister();
  await s.settle();
  return s;
}

function look(shore: Shore, who: Stuff): string {
  const aug = (Shore as unknown as { markupAugmenters: Array<(t: string, h: Stuff, v: Stuff) => string> }).markupAugmenters[0]!;
  return aug('A muddy bank.', shore as unknown as Stuff, who);
}

beforeEach(() => {
  StuffApi.clearAll();
  makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
  WorldClockApi._resetForTesting();
  vi.spyOn(AppApi, 'setting').mockReturnValue('');
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('the physical read — for everyone, never a number', () => {
  it('names the water, its breadth, and what the water is like', async () => {
    installWater();
    installDiscipline();
    const s = await shoreOn();
    const text = look(s, viewer(null));
    expect(text).toMatch(/^A muddy bank\./);
    expect(text).toMatch(/This is the Kestrel, a broad river\./);
    expect(text).toMatch(/The water is slow, brackish, warm and hard\./);
    expect(text).toMatch(/An outfall discharges into this water\./);
    expect(text).not.toMatch(/\d/);
    expect(s.fixedInPlace).toBe(true);
  });

  it('a clean, cold, soft, fast fresh water reads so', async () => {
    installWater(
      standing({
        water: { temperatureK: 278, currentMps: 0.8, salinityPpt: 0.3, oxygenMgL: 12, pH: 6, hardnessDgh: 3, nitrateMgL: 0.5, ammoniaMgL: 0, nitriteMgL: 0, contamination: 0 },
        contamination: null,
      }),
    );
    installDiscipline();
    const text = look(await shoreOn(), viewer(null));
    expect(text).toMatch(/fast, fresh, cold and soft/);
    expect(text).not.toMatch(/outfall/);
  });
});

describe('the species read — gated on the Discipline the setting names', () => {
  it('an untrained viewer gets the physical read only; a competent one the species; a practised one the royal fish', async () => {
    installWater();
    installDiscipline();
    const s = await shoreOn();
    const floor = look(s, viewer(null));
    expect(floor).not.toMatch(/eel/);
    const competent = look(s, viewer('competent'));
    expect(competent).toMatch(/plenty of eel/i);
    expect(competent).toMatch(/something large/);
    expect(competent).not.toMatch(/sturgeon/);
    const practised = look(s, viewer('proficient'));
    expect(practised).toMatch(/royal fish/);
  });

  it('⚠ when the Discipline row is NOT installed the read is physical only — honest for a realm with no fishing trade', async () => {
    installWater();
    // No installDiscipline().
    const s = await shoreOn();
    const text = look(s, viewer('expert'));
    expect(text).toMatch(/This is the Kestrel/);
    expect(text).not.toMatch(/eel|royal|fish in this water/);
  });

  it('the setting can point the read at another Discipline', async () => {
    installWater();
    const other = makeStuffAtPath(() => new Discipline(), '/trade/hunting/idea/Discipline/hunting');
    other.setKey('hunting');
    vi.spyOn(AppApi, 'setting').mockImplementation(((k: string) =>
      k === 'water.fishery.readDiscipline' ? '/trade/hunting/idea/Discipline/hunting' : '') as never);
    const s = await shoreOn();
    const v = viewer(null);
    (v as unknown as { competenceDigestCached: () => unknown }).competenceDigestCached = () => [
      { discipline: 'hunting', band: 'competent' },
    ];
    expect(look(s, v)).toMatch(/eel/);
  });
});

describe('the memo', () => {
  it('a shore asked before its first refresh lands says so, and never lies', () => {
    installWater();
    const s = makeStuff(() => new Shore());
    s.setReachRef(REACH.ref);
    // No postRegister, no settle: cold.
    expect(look(s, viewer(null))).toMatch(/hard to read yet/);
  });

  it('a shore citing no reach reads as unreadable rather than throwing', async () => {
    installWater();
    const s = await shoreOn('');
    expect(look(s, viewer(null))).toMatch(/hard to read yet/);
  });
});
