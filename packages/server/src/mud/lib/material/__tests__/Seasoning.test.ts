/**
 * SeasoningMixin on Timber — a READING over the water model (ceramics
 * review): wood dries at its species' rate in the air it stands in, damp
 * air will not season it, rain sets it back, drying it far harder than
 * good air checks it, and a merge takes the greener (assembly D2, AC 19).
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Timber from '../../../platform/thing/Timber';
import Material from '../../material/Material';
import Place from '../../stuff/Place';
import Good from '../../stuff/Good';
import { PlacingMixin } from '../../spatial/Placing';
import { WorldClockApi } from '../../../api/worldclock';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import { BiomeApi } from '../../../api/biome';
import { Evaporation } from '../../material/Evaporation';
import { Grade } from '../../craft/Grade';
import { Quantity } from '../../quantity';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { TemplatePaths } from '../../paths';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';

class Yard extends Place {
  static _mixinName = 'SeasoningTestYard';
}
/** Stickers — a stack laid on them has the air all round it. */
class Stickers extends PlacingMixin(Good) {
  static _mixinName = 'SeasoningTestStickers';
}

const DAY = 86_400;
const BASE = 10_000_000;
let now = BASE;
const OAK = '/stuff/idea/material/_test/seasoning-oak';
const IRON = '/stuff/idea/material/_test/seasoning-iron';

/** The air over the yard, and the rain falling on it. */
let air = new Evaporation(55, 2, 290);
let rainMmPerH = 0;

/** Advance the provider so the GAME clock moves `d` game-days (the provider
 * is not in game seconds — `getNow` scales it). */
function advanceGameDays(d: number): void {
  const g0 = WorldClockApi.getNow().rawValue();
  now += DAY;
  const perProviderDay = WorldClockApi.getNow().rawValue() - g0;
  now += Math.round(((d * DAY) / perProviderDay) * DAY) - DAY;
}

function stack(material: string, fraction = 0): Timber {
  const t = makeStuff(() => new Timber());
  t.setMaterial(StuffApi.findByTemplatePath<Material>(material)!);
  ContainmentApi.move(t as never, rack as never, 'on');
  t.setSeasonedFraction(fraction);
  return t;
}

let yard: Yard;
let rack: Stickers;

beforeEach(() => {
  StuffApi.clearAll();
  // ⚠ The water clock reads `null` — nothing dries — unless the clock
  // registry STUFF is registered, and `clearAll` removes it (the
  // InputBandCap precedent: the first test passes and every later one
  // reads a dead clock).
  stampTemplatePathForTest(
    makeStuff(() => new WorldClockRegistry()),
    TemplatePaths.worldClockRegistry,
  );
  now = BASE;
  WorldClockApi._setNowProviderForTesting(() => now);
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test oak');
    m.seasoningDays = 100;
    m.greenShrinkage = 0.1;
    return m;
  }, OAK);
  makeStuffAtPath(() => new Material(), IRON);
  yard = makeStuff(() => new Yard());
  rack = makeStuff(() => {
    const r = new Stickers();
    r.setMass(Quantity.of(10, 'kg'));
    r.setPlacements(['on']);
    r.setAirExposure(1);
    return r;
  }) as unknown as Stickers;
  ContainmentApi.move(rack as never, yard as never);
  // Good drying air — exactly the reference `seasoningDays` is quoted at.
  air = new Evaporation(55, 2, 290);
  rainMmPerH = 0;
  vi.spyOn(BiomeApi, 'airFor').mockImplementation((() => air) as never);
  vi.spyOn(BiomeApi, 'localHumidityFor').mockImplementation((() => air.humidityPct) as never);
  vi.spyOn(BiomeApi, 'airSegmentsFor').mockImplementation(((_s: unknown, t0: number, t1: number) => [
    { air, durationS: t1 - t0, rainMmPerH },
  ]) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('SeasoningMixin', () => {
  it('a fresh stack reads green and dries at its species rate in good air', () => {
    const t = stack(OAK);
    expect(t.isGreen()).toBe(true);
    t.getSeasonedFraction(); // the clock starts
    // Halfway through its seasoningDays it is under halfway to the mark —
    // the water leaves along an exponential approach to the air's.
    advanceGameDays(50);
    expect(t.getSeasonedFraction()).toBeCloseTo(0.43, 1);
    expect(t.isGreen()).toBe(true);
    advanceGameDays(52);
    expect(t.isSeasoned()).toBe(true);
  });

  it('⭐ damp air will not season it — past wood\'s saturation it reads green-to-drying forever', () => {
    air = new Evaporation(90, 2, 290);
    const t = stack(OAK);
    t.getSeasonedFraction();
    advanceGameDays(400);
    expect(t.isSeasoned()).toBe(false);
  });

  it('⭐ a seasoned board in damp air takes water back', () => {
    const t = stack(OAK, 1);
    air = new Evaporation(95, 0, 288);
    t.getSeasonedFraction();
    advanceGameDays(60);
    expect(t.isSeasoned()).toBe(false);
  });

  it('⭐ rain on a stack in the open sets it back', () => {
    const t = stack(OAK, 0.5);
    t.getSeasonedFraction();
    air = new Evaporation(100, 1, 288);
    rainMmPerH = 4;
    advanceGameDays(1);
    expect(t.getSeasonedFraction()).toBeLessThan(0.5);
  });

  it('dried far harder than good air, it checks — and grades no better than fair', () => {
    const t = stack(OAK);
    if (MixinApi.isGraded(t)) t.setGrade(Grade.of('fine'));
    t.getSeasonedFraction();
    air = new Evaporation(20, 2, 345);
    advanceGameDays(2);
    t.getSeasonedFraction(); // the water brought current — the check is laid by it
    expect(t.getFlaws().some((f) => f.kind === 'check')).toBe(true);
    // The ceiling is Integrity's making-fault table (`check`), B98.
    expect(MixinApi.isGraded(t) ? t.getGrade().getBand() : null).toBe('fair');
  });

  it('…and good drying air never checks it', () => {
    const t = stack(OAK);
    t.getSeasonedFraction();
    advanceGameDays(120);
    expect(t.isSeasoned()).toBe(true);
    expect(t.getFlaws()).toEqual([]);
  });

  it('a merge takes the greener', () => {
    const dry = stack(OAK, 0.9);
    const green = stack(OAK, 0.1);
    // Stacks merge only within one row.
    stampTemplatePathForTest(dry, '/x/thing/board');
    stampTemplatePathForTest(green, '/x/thing/board');
    // The merge reads the absorbed lot BEFORE destructing it (the Stackable
    // seam, B98 — no stash in `canMergeWith`).
    expect(dry.canMergeWith(green)).toBe(true);
    dry.takeFromAbsorbed(green);
    expect(dry.getSeasonedFraction()).toBeCloseTo(0.1, 6);
  });

  it('is vacuous on a material that does not season', () => {
    const t = stack(IRON);
    expect(t.isGreen()).toBe(false);
    expect(t.isSeasoned()).toBe(false);
    expect(t.getSeasonedFraction()).toBe(0);
  });
});

describe('⭐ the cut — a through-sawn board CUPS as it dries; a quartered one stays flat', () => {
  function board(form: string, fraction: number, quartered = false, wide = true): Timber {
    const t = stack(OAK, fraction);
    t.setConstructionForm(form);
    // Row-authored in production (`board`, `quartered-board`); no setters by design.
    (t as unknown as { quarterSawn: boolean }).quarterSawn = quartered;
    (t as unknown as { wideFace: boolean }).wideFace = wide;
    return t;
  }

  it('cupped only when sawn through AND dried', () => {
    expect(board('sawn', 1).isCupped()).toBe(true);
    expect(board('sawn', 1, true).isCupped()).toBe(false);
    expect(board('sawn', 0).isCupped()).toBe(false); // green — not yet
    expect(board('riven', 1).isCupped()).toBe(false);
  });

  it('⭐ a NARROW sawn piece (a dowel off a board) has no face to cup — it reads sawn, not cupped', () => {
    const dowel = board('sawn', 1, false, false);
    expect(dowel.isCupped()).toBe(false);
    const look = dowel.getMarkupLong(yard);
    expect(look).toMatch(/It was sawn: the saw ran across its fibres/);
    expect(look).not.toMatch(/cupped/);
  });

  it('⭐ the end grain says how it was opened — in words', () => {
    expect(board('sawn', 1).getMarkupLong(yard)).toMatch(/sawn through.*cupped hollow/);
    expect(board('sawn', 0).getMarkupLong(yard)).toMatch(/will cup as it dries/);
    expect(board('sawn', 1, true).getMarkupLong(yard)).toMatch(/on the quarter.*stayed flat/);
    expect(board('riven', 1).getMarkupLong(yard)).toMatch(/split along the grain/);
  });
});
