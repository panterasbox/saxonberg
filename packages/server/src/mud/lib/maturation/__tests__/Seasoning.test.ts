/**
 * SeasoningMixin on Timber — wood dries at its species' rate in the air it
 * stands in, rain sets it back, too hot checks it, and a merge takes the
 * greener (assembly D2, AC 19).
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Timber from '../../../platform/thing/Timber';
import Material from '../../material/Material';
import { Idea } from '../../stuff/Idea';
import { ContainerMixin } from '../../spatial/Container';
import { WorldClockApi } from '../../../api/worldclock';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import { BiomeApi, type AirSegment } from '../../../api/biome';
import { Evaporation } from '../../material/Evaporation';
import { Grade } from '../../craft/Grade';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

class Yard extends ContainerMixin(Idea) {
  static _mixinName = 'SeasoningTestYard';
}

const DAY = 86_400;
const BASE = 10_000_000;
let now = BASE;
const OAK = '/stuff/idea/material/_test/seasoning-oak';
const IRON = '/stuff/idea/material/_test/seasoning-iron';

let air: (t0: number, t1: number) => AirSegment[];

/** Advance the provider so the GAME clock moves `d` game-days (the provider
 * is not in game seconds — `getNow` scales it). */
function advanceGameDays(d: number): void {
  const g0 = WorldClockApi.getNow().rawValue();
  now += DAY;
  const perProviderDay = WorldClockApi.getNow().rawValue() - g0;
  now += Math.round(((d * DAY) / perProviderDay) * DAY) - DAY;
}
const original = BiomeApi.airSegmentsFor;

function stack(material: string, fraction = 0): Timber {
  const t = makeStuff(() => new Timber());
  t.setMaterial(StuffApi.findByTemplatePath<Material>(material)!);
  t.setSeasonedFraction(fraction);
  ContainmentApi.move(t, yard);
  return t;
}

let yard: Yard;

beforeEach(() => {
  StuffApi.clearAll();
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
  // Good drying air — exactly the reference `seasoningDays` is quoted at.
  air = (t0, t1) => [{ air: new Evaporation(55, 2, 290), durationS: t1 - t0, rainMmPerH: 0 }];
  (BiomeApi as unknown as { airSegmentsFor: unknown }).airSegmentsFor = (
    _scope: unknown,
    t0: number,
    t1: number,
  ) => air(t0, t1);
});

afterEach(() => {
  (BiomeApi as unknown as { airSegmentsFor: unknown }).airSegmentsFor = original;
  WorldClockApi._resetForTesting();
});

describe('SeasoningMixin', () => {
  it('a fresh stack reads green and dries at its species rate in good air', () => {
    const t = stack(OAK);
    expect(t.isGreen()).toBe(true);
    advanceGameDays(50);
    expect(t.getSeasonedFraction()).toBeCloseTo(0.5, 2);
    expect(t.isGreen()).toBe(true);
    advanceGameDays(35);
    expect(t.isSeasoned()).toBe(true);
  });

  it('⭐ damp air seasons nothing — the vapour deficit is the whole mechanism', () => {
    const t = stack(OAK);
    air = (t0, t1) => [{ air: new Evaporation(90, 2, 290), durationS: t1 - t0, rainMmPerH: 0 }];
    advanceGameDays(200);
    expect(t.getSeasonedFraction()).toBe(0);
  });

  it('⭐ rain on a stack in the open sets it back', () => {
    const t = stack(OAK, 0.5);
    air = (t0, t1) => [{ air: new Evaporation(100, 1, 288), durationS: t1 - t0, rainMmPerH: 4 }];
    advanceGameDays(1);
    expect(t.getSeasonedFraction()).toBeLessThan(0.5);
  });

  it('dried too hot, it checks — the grade reads no better than the worst stretch', () => {
    const t = stack(OAK);
    if (MixinApi.isGraded(t)) t.setGrade(Grade.of('fine'));
    air = (t0, t1) => [{ air: new Evaporation(20, 2, 345), durationS: t1 - t0, rainMmPerH: 0 }];
    advanceGameDays(2);
    expect(t.getGrade().getBand()).toBe('poor');
  });

  it('a merge takes the greener', () => {
    const dry = stack(OAK, 0.9);
    const green = stack(OAK, 0.1);
    dry.onMerged(green);
    expect(dry.getSeasonedFraction()).toBeCloseTo(0.1, 6);
  });

  it('is vacuous on a material that does not season', () => {
    const t = stack(IRON);
    expect(t.isGreen()).toBe(false);
    expect(t.isSeasoned()).toBe(false);
    expect(t.getSeasonedFraction()).toBe(0);
  });
});
