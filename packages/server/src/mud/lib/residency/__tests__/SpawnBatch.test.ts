/**
 * **One sweep stands a region at target** (libations 1f).
 *
 * The shipped sweep drew ONE item per region per sweep — a trickle that
 * could never stand a producer's floor at target on a fresh boot. This
 * covers the two changes that make it a faucet: the per-region
 * draw-until-decline loop (capped by `residency.spawn.perRegionCap`),
 * and the TEMPLATE-derived candidate set — a row with an authored
 * `censusKey` + home `container:` is drawable before any instance of it
 * exists, and is drawn only for the region its container lives in.
 *
 * Drives the real `ResidencyApi.spawnNow()` with the world's edges
 * stubbed: the mode + cap dials, the template query, the clone, the
 * class-composition check and the zone lookup.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResidencyApi } from '../../../api/residency';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { AppApi } from '../../../api/app';
import { ZoneApi } from '../../../api/zone';
import { ContainmentApi } from '../../../api/containment';
import { AppSettingKeys } from '../../config/AppSettings';
import { Template } from '../../stuff/Template';
import { CirculatingMixin } from '../Circulating';
import Thing from '../../stuff/Thing';
import SingletonCartesianLocation from '../../../platform/location/SingletonCartesianLocation';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuff, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestGood extends CirculatingMixin(Thing) {}

const REGION = '/test/spawn/spawn-batch-zone';
const STOCK = '/test/spawn/spawn-batch-zone/thing/stock';

let seq = 0;
let room: SingletonCartesianLocation;
let settings: Record<string, string>;

/** A floor row: authored key, target and home container, no live instance. */
function row(path: string, censusKey: string, regionTarget: number) {
  return {
    path,
    class: '/platform/thing/TestGood',
    data: { censusKey, regionTarget, container: STOCK },
  } as unknown as Template;
}

describe('the spawn sweep — draw until the region declines', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    settings = {
      [AppSettingKeys.residencySpawnMode]: 'enforce',
      [AppSettingKeys.residencySpawnPerRegionCap]: '64',
    };
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) => settings[key] ?? '');
    // The "stock counter" the rows name — a live room the mints land in,
    // so the census counts them in the row's own region.
    room = makeStuff(() => new SingletonCartesianLocation());
    stampTemplatePathForTest(room, STOCK);
    vi.spyOn(ZoneApi, 'resolveZoneForPath').mockResolvedValue({
      getTemplatePath: () => REGION,
      lookupField: async () => undefined,
    } as never);
    vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(TestGood);
    vi.spyOn(Template, 'findWhereDataHas').mockResolvedValue([
      row('/test/spawn/thing/ale', 'keg:ale', 2),
      row('/test/spawn/thing/gin', 'spirit:gin', 3),
      row('/test/spawn/thing/volk', 'spirit:vodka', 4),
    ]);
    vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
      const g = makeStuff(() => new TestGood());
      stampTemplatePathForTest(g, path);
      const key =
        { ale: 'keg:ale', gin: 'spirit:gin', volk: 'spirit:vodka', stray: 'stray' }[
          path.split('/').pop()!
        ] ?? path;
      g.setCensusKey(key);
      g.regionTarget = 99;
      // The row's `container:` — what `applyContainer` does for a real clone.
      ContainmentApi.move(g as never, room as never);
      return g as unknown as Stuff;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  function countOf(key: string): number {
    return (room.getContents() as Stuff[]).filter(
      (s) => (s as TestGood).getCensusKey() === key,
    ).length;
  }

  it('a fresh world reaches every row’s target in ONE sweep, and places nothing on the next', async () => {
    const first = await ResidencyApi.spawnNow();
    expect(first.placed).toBe(2 + 3 + 4);
    expect(countOf('keg:ale')).toBe(2);
    expect(countOf('spirit:gin')).toBe(3);
    expect(countOf('spirit:vodka')).toBe(4);
    // The region declined exactly once — at the end of its loop.
    expect(first.declined).toBe(1);

    const second = await ResidencyApi.spawnNow();
    expect(second.placed).toBe(0);
    expect(second.declined).toBe(1);
  });

  it('the per-region cap holds', async () => {
    settings[AppSettingKeys.residencySpawnPerRegionCap] = '5';
    const report = await ResidencyApi.spawnNow();
    expect(report.placed).toBe(5);
    // Capped, not declined: the region still wants more.
    expect(report.declined).toBe(0);
  });

  it('a row with a home is drawn only for that home’s region', async () => {
    // A second live region with nothing of its own: the rows must not
    // be drawn "for" it and land in the stock counter anyway.
    const elsewhere = makeStuff(() => new SingletonCartesianLocation());
    stampTemplatePathForTest(elsewhere, `/test/other/room-${seq++}`);
    const stray = makeStuff(() => new TestGood());
    stampTemplatePathForTest(stray, '/test/other/thing/stray');
    stray.setCensusKey('stray');
    stray.regionTarget = 1; // at target already: its own region declines
    ContainmentApi.move(stray as never, elsewhere as never);
    (ZoneApi.resolveZoneForPath as unknown as { mockImplementation: (f: (p: string) => Promise<unknown>) => void })
      .mockImplementation(async (p: string) => ({
        getTemplatePath: () => (p.startsWith('/test/other') ? '/test/other' : REGION),
        lookupField: async () => undefined,
      }));

    const report = await ResidencyApi.spawnNow();
    expect(report.regions).toBe(2);
    // The three homed rows land in their region (9); the homeless live
    // stray is drawable anywhere, so the stock's region also draws ONE
    // of it (its target is 1 and that region held none) — 10 in all.
    expect(report.placed).toBe(10);
    expect(countOf('keg:ale') + countOf('spirit:gin') + countOf('spirit:vodka')).toBe(9);
    expect(countOf('stray')).toBe(1);
  });

  it('observe mode reports and places nothing', async () => {
    settings[AppSettingKeys.residencySpawnMode] = 'observe';
    const report = await ResidencyApi.spawnNow();
    expect(report.placed).toBe(0);
    expect(room.getContents().length).toBe(0);
  });
});
