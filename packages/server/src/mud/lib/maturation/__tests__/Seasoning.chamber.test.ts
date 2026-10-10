/**
 * ⭐ Seasoning reads the ENCLOSING scope's air (assembly W7, D15): a stack
 * placed `in` a drying loft has `container = the yard` and enclosing scope
 * = the loft, and it is the loft's air that dries it.
 *
 * The discriminating fixture is the mocked air read: it records the scope
 * it was handed and answers a different air for the loft and the yard, so
 * a seasoning that read its container would both name the wrong scope AND
 * dry at the wrong rate.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Timber from '../../../platform/thing/Timber';
import Chamber from '../../../platform/thing/Chamber';
import Material from '../../material/Material';
import Location from '../../stuff/Location';
import type { Stuff } from '../../stuff/Stuff';
import { Template } from '../../stuff/Template';
import Placement from '../../../platform/idea/Placement';
import PlacementCatalogue from '../../../platform/idea/PlacementCatalogue';
import { WorldClockApi } from '../../../api/worldclock';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { BiomeApi, type AirSegment } from '../../../api/biome';
import { Evaporation } from '../../material/Evaporation';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

class Yard extends Location {}

const DAY = 86_400;
const BASE = 10_000_000;
let now = BASE;
const OAK = '/stuff/idea/material/_test/seasoning-chamber-oak';

function advanceGameDays(d: number): void {
  const g0 = WorldClockApi.getNow().rawValue();
  now += DAY;
  const perProviderDay = WorldClockApi.getNow().rawValue() - g0;
  now += Math.round(((d * DAY) / perProviderDay) * DAY) - DAY;
}

const original = BiomeApi.airSegmentsFor;

async function warmPlacements(): Promise<void> {
  const rows = [
    { name: 'on', prepositions: ['on', 'onto'], encloses: false },
    { name: 'in', prepositions: ['in', 'into'], encloses: true },
  ];
  vi.spyOn(Template, 'findByPathInfix').mockResolvedValue(
    rows.map((r) => ({
      path: `/platform/idea/Placement/${r.name}`,
      class: '/platform/idea/Placement',
    })) as unknown as Template[],
  );
  vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(
    Placement as unknown as never,
  );
  vi.spyOn(StuffApi, 'singleton').mockImplementation(async (path: string) => {
    const row = rows.find((r) => path.endsWith(`/${r.name}`))!;
    const m = makeStuff(() => new Placement());
    m.name = row.name;
    m.prepositions = row.prepositions;
    m.encloses = row.encloses;
    return m as never;
  });
  const catalogue = makeStuffAtPath(
    () => new PlacementCatalogue(),
    '/platform/idea/PlacementCatalogue',
  );
  await catalogue.warm();
}

let yard: Yard;
let loft: Chamber;
let scopes: Stuff[];

function stack(): Timber {
  const t = makeStuff(() => new Timber());
  t.setMaterial(StuffApi.findByTemplatePath<Material>(OAK)!);
  t.setSeasonedFraction(0);
  return t;
}

beforeEach(async () => {
  StuffApi.clearAll();
  now = BASE;
  WorldClockApi._setNowProviderForTesting(() => now);
  await warmPlacements();
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test oak');
    m.seasoningDays = 100;
    m.greenShrinkage = 0.1;
    return m;
  }, OAK);
  yard = makeStuff(() => new Yard());
  loft = makeStuffAtPath(() => new Chamber(), '/test/seasoning/loft');
  ContainmentApi.move(loft, yard);
  scopes = [];
  // The loft is GOOD drying air (the reference `seasoningDays` is quoted
  // at); the yard is saturated and dries nothing.
  (BiomeApi as unknown as { airSegmentsFor: unknown }).airSegmentsFor = (
    scope: Stuff,
    t0: number,
    t1: number,
  ): AirSegment[] => {
    scopes.push(scope);
    const air =
      scope === loft ? new Evaporation(55, 2, 290) : new Evaporation(95, 0, 285);
    return [{ air, durationS: t1 - t0, rainMmPerH: 0 }];
  };
});

afterEach(() => {
  (BiomeApi as unknown as { airSegmentsFor: unknown }).airSegmentsFor = original;
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('⭐ seasoning in a chamber', () => {
  it("a stack placed IN the loft reads the loft's air — the scope IS the chamber", () => {
    const t = stack();
    ContainmentApi.place(t, 'in', loft);
    expect(t.getContainer()).toBe(yard);
    expect(t.getEnclosingScope()).toBe(loft);

    t.getSeasonedFraction(); // seed the stamp
    advanceGameDays(50);
    const f = t.getSeasonedFraction();

    expect(scopes.length).toBeGreaterThan(0);
    expect(scopes.every((s) => s === loft)).toBe(true);
    expect(f).toBeCloseTo(0.5, 2);
  });

  it('the same stack loose in the yard reads the YARD — and dries nothing', () => {
    const t = stack();
    ContainmentApi.move(t, yard);
    t.getSeasonedFraction();
    advanceGameDays(50);
    const f = t.getSeasonedFraction();

    expect(scopes.every((s) => s === yard)).toBe(true);
    expect(f).toBe(0);
  });
});
